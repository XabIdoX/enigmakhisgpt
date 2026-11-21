import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { handleVoice } from '../voice.mjs';

test('voice rosters and signaling stay within each room and update on disconnect', { timeout: 5000 }, async (t) => {
  const server = createServer((req, res) => handleVoice(req, res, req.url, (response, status, body) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  }, [{ id: 'player-a', name: 'Zino' }]));
  server.listen(0, '127.0.0.1');
  t.after(() => { server.close(); server.closeAllConnections(); });
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}/api/voice/`;
  const post = (path, body, signal) => fetch(origin + path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal,
  });

  async function join(room, playerId) {
    const controller = new AbortController();
    t.after(() => controller.abort());
    const response = await post('join', { room, playerId }, controller.signal);
    assert.equal(response.status, 200);
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    async function next() {
      while (!buffer.includes('\n\n')) {
        const { value, done } = await reader.read();
        assert.equal(done, false);
        buffer += value;
      }
      const end = buffer.indexOf('\n\n');
      const message = JSON.parse(buffer.slice(6, end));
      buffer = buffer.slice(end + 2);
      return message;
    }
    return { ready: await next(), next, leave: () => controller.abort() };
  }

  assert.equal((await post('join', { room: 'green' })).status, 404);
  const zino = await join('welcome', 'player-a');
  const guest = await join('welcome');
  const blue = await join('blue');
  const red = await join('red');
  assert.deepEqual(zino.ready.peers, []);
  assert.deepEqual(guest.ready.peers, [{ id: zino.ready.id, name: 'Zino' }]);
  assert.deepEqual(blue.ready.peers, []);
  assert.deepEqual(red.ready.peers, []);
  assert.deepEqual(await zino.next(), { type: 'joined', peer: { id: guest.ready.id, name: 'Invité' } });

  const signal = { to: zino.ready.id, description: { type: 'offer', sdp: 'test' } };
  assert.equal((await post('signal', { ...signal, token: blue.ready.token })).status, 404);
  assert.equal((await post('signal', { ...signal, token: guest.ready.id })).status, 404);
  assert.equal((await post('signal', { ...signal, token: guest.ready.token })).status, 200);
  assert.deepEqual(await zino.next(), { type: 'signal', from: guest.ready.id, description: signal.description });
  guest.leave();
  assert.deepEqual(await zino.next(), { type: 'left', id: guest.ready.id });
  assert.equal((await post('ping', { token: guest.ready.token })).status, 404);
  assert.equal((await post('ping', { token: zino.ready.token })).status, 200);
});
