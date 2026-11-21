import { createHmac, randomUUID } from 'node:crypto';

const rooms = new Map(['welcome', 'blue', 'red'].map((room) => [room, new Map()]));
const sessions = new Map();
const roomLimit = 24;
const heartbeatMs = 20_000;
const turnUrls = (process.env.VOICE_TURN_URLS || '').split(',').map((url) => url.trim()).filter(Boolean);
const turnSecret = process.env.VOICE_TURN_SECRET;

function iceServers(id) {
  const servers = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (turnUrls.length && turnSecret) {
    const username = `${Math.floor(Date.now() / 1000) + 43_200}:${id}`;
    const credential = createHmac('sha1', turnSecret).update(username).digest('base64');
    servers.push({ urls: turnUrls, username, credential });
  }
  return servers;
}

async function readMessage(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 24_576) {
      req.resume();
      throw new Error('Message too large');
    }
    chunks.push(chunk);
  }
  const message = JSON.parse(Buffer.concat(chunks).toString());
  if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('Invalid message');
  return message;
}

function send(member, event) {
  if (member.response.destroyed || member.response.writableEnded) return;
  if (member.response.writableLength > 131_072) {
    member.response.destroy();
    return;
  }
  member.response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function join(res, message, reply, players) {
  const room = rooms.get(message.room);
  if (!room) return reply(res, 404, { error: 'Ce salon vocal n’existe pas.' });
  if (room.size >= roomLimit) return reply(res, 409, { error: 'Le salon vocal est complet.' });

  const id = randomUUID();
  const token = randomUUID();
  const player = players.find((entry) => entry.id === message.playerId);
  const member = {
    room, token, response: res, lastSeen: Date.now(),
    profile: { id, name: player?.name || 'Invité' },
  };
  const peers = [...room.values()].map((peer) => peer.profile);
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    'x-accel-buffering': 'no',
  });
  room.set(id, member);
  sessions.set(token, member);
  res.on('close', () => {
    clearInterval(heartbeat);
    room.delete(id);
    sessions.delete(token);
    for (const peer of room.values()) send(peer, { type: 'left', id });
  });
  const heartbeat = setInterval(() => {
    if (Date.now() - member.lastSeen > 3 * heartbeatMs) res.end();
    else send(member, { type: 'heartbeat' });
  }, heartbeatMs);
  heartbeat.unref();
  send(member, { type: 'ready', id, token, peers, iceServers: iceServers(id) });
  for (const peer of room.values()) {
    if (peer !== member) send(peer, { type: 'joined', peer: member.profile });
  }
}

function signalPayload(message) {
  const { description, candidate } = message;
  if ((description?.type === 'offer' || description?.type === 'answer') && typeof description.sdp === 'string') {
    return { description: { type: description.type, sdp: description.sdp } };
  }
  if (typeof candidate?.candidate !== 'string' || candidate.candidate.length > 2048) return null;
  return { candidate: {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
  } };
}

export async function handleVoice(req, res, path, reply, players) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Méthode indisponible.' });
  if (req.headers['sec-fetch-site'] === 'cross-site' || req.headers['content-type']?.split(';')[0] !== 'application/json') {
    return reply(res, 403, { error: 'Requête vocale refusée.' });
  }
  let message;
  try { message = await readMessage(req); }
  catch { return reply(res, 400, { error: 'Message vocal invalide.' }); }
  if (res.destroyed) return;
  if (path === '/api/voice/join') return join(res, message, reply, players);

  const member = sessions.get(message.token);
  if (!member) return reply(res, 404, { error: 'Le salon vocal a été quitté.' });
  if (path === '/api/voice/ping') {
    member.lastSeen = Date.now();
    return reply(res, 200, { ok: true });
  }
  if (path !== '/api/voice/signal') return reply(res, 404, { error: 'Commande vocale inconnue.' });
  const target = member.room.get(message.to);
  if (!target || target === member) return reply(res, 404, { error: 'Ce participant a quitté le salon.' });
  const payload = signalPayload(message);
  if (!payload) return reply(res, 400, { error: 'Signal vocal invalide.' });
  send(target, { type: 'signal', from: member.profile.id, ...payload });
  return reply(res, 200, { ok: true });
}
