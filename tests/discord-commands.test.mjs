import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildIdeaJournal, fetchHistory, journalForRelay, compareIds } from '../discord-ideas.mjs';

// Exercise the production command processor without a Discord token or network.
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'discord.js') return { url: 'data:text/javascript,export class Client {} export const GatewayIntentBits = {};', shortCircuit: true };
  return next(specifier, context);
} });
const { processIdeaCommands } = await import('../discord-approvals.mjs');
hooks.deregister();
const ids = { botId: '999', approverId: '777' };
const id = (n) => String(1571885708145200000n + BigInt(n));
function message(n, content, author = '777', extra = {}) {
  return { id: id(n), content, author: { id: author, username: author === '777' ? 'DoX' : 'Autre', bot: author === '999' },
    embeds: [], attachments: [], createdAt: new Date('2026-11-16T20:00:00Z'),
    url: `https://discord.com/channels/1/2/${id(n)}`, ...extra };
}
const relay = (journal) => journalForRelay(journal, { guildId: '1', channelId: '2' });

test('only the configured Discord ID can execute any colon command', () => {
  const input = [message(1, 'Idée A', '123'), message(2, 'OK'), message(3, 'annuler')];
  for (const [n, command] of [':OK', ':annuler', ':liste', ':modifier 1 Piratée', ':aide'].entries()) input.push(message(n + 4, command, '123'));
  const journal = buildIdeaJournal(input, ids);
  assert.equal(journal.commands.length, 0);
  assert.equal(journal.batches.length, 0);
  assert.deepEqual(journal.ideas.map((i) => i.text), ['Idée A']);
  assert.equal(buildIdeaJournal([...input, message(20, ':OK')], { ...ids, approverId: '' }).batches.length, 0);
});

test('pending and approved ideas can be corrected by number, ID, link or reply', () => {
  const input = [message(1, 'Initiale'), message(2, ':modifier 1 Avant validation'), message(3, ' :Ok '),
    message(4, `:modifier ${id(1)} Après validation`), message(5, `:modifier https://discord.com/channels/1/2/${id(1)} Via lien`),
    message(6, ':modifier Via réponse\nDeuxième ligne', '777', { reference: { messageId: id(1) } }), message(7, ':liste')];
  const journal = buildIdeaJournal(input, ids);
  assert.equal(journal.batches.length, 1);
  assert.equal(journal.ideas[0].text, 'Via réponse\nDeuxième ligne');
  assert.equal(journal.commands.at(-1).ideas[0].status, 'Validée');
  assert.equal(relay(journal).syntheses[0].propositions[0].texte, 'Via réponse\nDeuxième ligne');
  assert.match(relay(journal).syntheses[0].propositions[0].modification, new RegExp(id(6)));
});

test('cancelled lots remain visible and corrections do not revalidate them', () => {
  const journal = buildIdeaJournal([
    message(1, 'A'), message(2, ':OK'), message(3, ':annuler'), message(4, ':modifier 1 A corrigée'),
    message(5, 'B'), message(6, ':OK'), message(7, ':liste'),
  ], ids);
  assert.deepEqual(relay(journal).propositions.map((i) => i.statut), ['Validation annulée', 'Validée']);
  assert.equal(relay(journal).syntheses.length, 1);
  assert.deepEqual(relay(journal).syntheses[0].propositions.map((i) => i.texte), ['B']);
});

test('invalid commands give useful errors without changing ideas', () => {
  const journal = buildIdeaJournal([
    message(1, ':annuler'), message(2, 'Idée'), message(3, ':modifier 1'), message(4, ':modifier 88 Texte'),
    message(5, ':OK du texte'), message(6, ':inconnue'), message(7, ':liste texte'), message(8, ':aide'),
  ], ids);
  assert.equal(journal.commands.filter((c) => c.error).length, 6);
  assert.equal(journal.batches.length, 0);
  assert.equal(journal.ideas[0].text, 'Idée');
});

test('migration keeps acknowledged old lots and cancellations, without executing new bare OKs', () => {
  const input = [message(1, 'Ancienne idée'), message(2, 'OK'),
    message(3, '', '999', { reference: { messageId: id(2) }, embeds: [{ title: 'Validation annulée' }] }),
    message(4, 'annuler'), message(5, '', '999', { reference: { messageId: id(4) }, embeds: [{ title: 'Annulation confirmée' }] }),
    message(6, 'Nouvelle idée'), message(7, 'OK'), message(8, ':OK')];
  const journal = buildIdeaJournal(input, ids);
  assert.equal(journal.batches.length, 2);
  assert.equal(journal.batches[0].cancelled, true);
  assert.deepEqual(journal.batches[1].ideas.map((i) => i.text), ['Nouvelle idée']);
  assert.equal(relay(journal).syntheses.length, 1);
});

function channelFixture(input) {
  const all = [...input];
  const sent = [];
  const edited = [];
  let sequence = 10000;
  const channel = {
    messages: { fetch: async ({ limit, before }) => new Map(all
      .filter((m) => !before || compareIds(m.id, before) < 0)
      .sort((a, b) => compareIds(b.id, a.id)).slice(0, limit).map((m) => [m.id, m])) },
    send: async (payload) => {
      assert.deepEqual(payload.allowedMentions, { parse: [], repliedUser: false });
      assert.ok(payload.nonce.length <= 25);
      const embed = payload.embeds[0];
      const size = [embed.title, embed.description, embed.footer?.text,
        ...(embed.fields || []).flatMap((f) => [f.name, f.value])].reduce((n, text) => n + (text?.length || 0), 0);
      assert.ok(size <= 6000, `embed size ${size}`);
      for (const f of embed.fields || []) assert.ok(f.value.length <= 1024);
      const posted = message(sequence++, '', '999', { embeds: structuredClone(payload.embeds), reference: { messageId: payload.reply.messageReference } });
      posted.edit = async (data) => { edited.push(data); posted.embeds = structuredClone(data.embeds); posted.content = data.content; };
      all.push(posted);
      sent.push(payload);
      return posted;
    },
  };
  return { all, sent, edited, channel };
}

test('full pagination, list pages, attachments and relay cover more than 100 messages', async () => {
  const messages = Array.from({ length: 125 }, (_, n) => message(n + 1, 'X'.repeat(2000), '123'));
  messages[124].attachments = [{ filename: 'plan.png', url: 'https://example.test/plan.png' }];
  const f = channelFixture([...messages, message(126, ':OK'), message(127, ':liste')]);
  assert.equal((await fetchHistory((options) => f.channel.messages.fetch(options))).length, 127);
  const journal = await processIdeaCommands(f.channel, ids);
  assert.equal(f.sent.filter((s) => s.embeds[0].title === 'Liste des idées').length, 21);
  assert.equal(relay(journal).syntheses[0].propositions.length, 125);
  assert.equal(relay(journal).syntheses[0].propositions[124].pieces_jointes[0].nom, 'plan.png');
  const count = f.sent.length;
  await processIdeaCommands(f.channel, ids);
  assert.equal(f.sent.length, count, 'restart must not duplicate responses');
  assert.equal(f.edited.length, 0, 'unchanged summaries must not be rewritten');
});

test('summary is updated after correction and stays cancelled on restart', async () => {
  const f = channelFixture([message(1, 'Ancien texte'), message(2, ':OK')]);
  await processIdeaCommands(f.channel, ids);
  f.all.push(message(3, ':modifier 1 Texte corrigé'));
  await processIdeaCommands(f.channel, ids);
  assert.match(f.edited.at(-1).embeds[0].fields[0].value, /Texte corrigé/);
  f.all.push(message(4, ':annuler'));
  await processIdeaCommands(f.channel, ids);
  assert.equal(f.edited.at(-1).embeds[0].title, 'Validation annulée');
  const count = f.sent.length;
  const edits = f.edited.length;
  await processIdeaCommands(f.channel, ids);
  assert.equal(f.sent.length, count);
  assert.equal(f.edited.length, edits);
});

test('a partial list delivery resumes without duplicate pages', async () => {
  const f = channelFixture([...Array.from({ length: 13 }, (_, n) => message(n + 1, 'Idée')), message(14, ':liste')]);
  const send = f.channel.send;
  let calls = 0;
  f.channel.send = (payload) => { if (++calls === 2) throw new Error('Network failure'); return send(payload); };
  await assert.rejects(processIdeaCommands(f.channel, ids), /Network failure/);
  f.channel.send = send;
  await processIdeaCommands(f.channel, ids);
  assert.equal(f.sent.length, 3);
});

test('a recorded correction cannot move to another idea if an earlier original is deleted', async () => {
  const f = channelFixture([message(1, 'A'), message(2, 'B'), message(3, ':modifier 2 B corrigée')]);
  await processIdeaCommands(f.channel, ids);
  f.all.splice(f.all.findIndex((m) => m.id === id(1)), 1);
  const journal = await processIdeaCommands(f.channel, ids);
  assert.equal(journal.ideas[0].text, 'B corrigée');
});

test('MCP tools return corrected complete lots and exclude cancelled ones', { timeout: 15000 }, async (t) => {
  const history = [message(1, 'Annulée'), message(2, ':OK'), message(3, ':annuler'),
    message(4, 'À corriger'), message(5, ':OK'), message(6, ':modifier 2 Correction complète'),
    ...Array.from({ length: 105 }, (_, n) => message(n + 7, `En attente ${n}`)),
  ].map((m) => ({ ...m, timestamp: m.createdAt.toISOString() }));
  const bootstrap = `import { registerHooks } from 'node:module';
    registerHooks({ resolve(specifier, context, next) {
      if (specifier === './discord-approvals.mjs') return { url:'data:text/javascript,export function startApprovalBot() {}', shortCircuit:true };
      return next(specifier, context);
    }});
    const history = ${JSON.stringify(history)};
    globalThis.fetch = async (url) => {
      const parsed = new URL(url);
      let data;
      if (parsed.pathname.endsWith('/users/@me')) data = {id:'999'};
      else if (parsed.pathname.endsWith('/messages')) {
        const before = parsed.searchParams.get('before');
        data = history.filter(m => !before || BigInt(m.id) < BigInt(before))
          .sort((a,b) => BigInt(a.id) > BigInt(b.id) ? -1 : 1).slice(0,100);
      } else data = {guild_id:'1'};
      return new Response(JSON.stringify(data));
    };
    await import(${JSON.stringify(new URL('../server.mjs', import.meta.url).href)});`;
  const accessPath = 'test-only-access-path-12345678901234567890';
  const child = spawn(process.execPath, ['--input-type=module'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), windowsHide: true,
    env: { ...process.env, PORT: '0', DISCORD_BOT_TOKEN: 'fake-test-token', DISCORD_IDEAS_CHANNEL_ID: '2', DISCORD_APPROVER_USER_ID: '777', MCP_ACCESS_PATH: accessPath },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  child.stdin.end(bootstrap);
  const port = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; const match = output.match(/port (\d+)/); if (match) resolve(match[1]); });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => reject(new Error(`Server exited ${code}: ${output}`)));
  });
  async function call(name) {
    const response = await fetch(`http://127.0.0.1:${port}/mcp/${accessPath}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name } }),
    });
    const result = await response.json();
    assert.equal(result.result.isError, undefined);
    return JSON.parse(result.result.content[0].text);
  }
  const ideas = await call('lire_idees_discord');
  assert.equal(ideas.nombre, 107);
  assert.equal(ideas.propositions[1].texte, 'Correction complète');
  assert.equal(ideas.nombre_syntheses, 1);
  const approved = await call('lire_idees_validees_discord');
  assert.equal(approved.nombre, 1);
  assert.equal(approved.syntheses[0].propositions[0].texte, 'Correction complète');
  assert.doesNotMatch(approved.syntheses[0].texte, /Annulée/);
});
