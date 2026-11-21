import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

// Node 24 test runner; each run owns a fresh server on an OS-assigned port.
// The Discord module is stubbed before import. No real game or Discord is touched.
test('three cooperative expeditions, assets and live synchronization', { timeout: 30000 }, async (t) => {
  const serverUrl = new URL('../server.mjs', import.meta.url).href;
  const bootstrap = `import { registerHooks } from 'node:module';
    registerHooks({ resolve(specifier, context, next) {
      if (specifier === './discord-approvals.mjs') return { url:'data:text/javascript,export function startApprovalBot() {}', shortCircuit:true };
      return next(specifier, context);
    }});
    await import(${JSON.stringify(serverUrl)});`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', bootstrap], {
    cwd:fileURLToPath(new URL('..', import.meta.url)),
    env:{ ...process.env, PORT:'0', DISCORD_BOT_TOKEN:'', MCP_ACCESS_PATH:'' },
    stdio:['ignore','pipe','pipe'], windowsHide:true,
  });
  t.after(() => child.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; const match = output.match(/port (\d+)/); if (match) resolve(match[1]); });
    child.on('error', reject);
    child.on('exit', (code) => reject(new Error(`Test server exited: ${code}`)));
    child.stderr.on('data', (chunk) => { output += chunk; });
  });
  const origin = `http://127.0.0.1:${port}`;
  async function post(path, body, status = 200) {
    const response = await fetch(origin + path, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  }
  const state = async () => (await fetch(origin + '/api/state')).json();
  const page = await (await fetch(origin)).text();
  assert.match(page, /Certains secrets/);
  assert.equal((page.match(/id="player-name"/g) || []).length, 1);
  for (const path of ['/experience.js','/expedition.css','/green.js','/green.css','/assets/expedition-box.jpg','/assets/compass.svg']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    if (path.endsWith('.jpg')) assert.match(response.headers.get('content-type'), /image\/jpeg/);
  }
  await post('/api/join', {name:'  '}, 400);
  const first = (await post('/api/join', {name:'Akhi A',coin:3})).player;
  const second = (await post('/api/join', {name:'Akhi B',coin:8})).player;
  const returning = (await post('/api/join', {name:'Akhi A',playerId:first.id})).player;
  assert.equal(returning.id, first.id);
  assert.equal((await state()).players.length, 2);
  const action = async (name, data = {}, who = first.id, status = 200) => post('/api/action', {action:name,playerId:who,...data}, status);

  // Check actual SSE delivery between different players, not just HTTP responses.
  const controller = new AbortController();
  const stream = await fetch(origin + '/api/events', {signal:controller.signal});
  const reader = stream.body.getReader();
  await reader.read();
  await action('take', {itemId:'stone'}, second.id);
  const broadcast = new TextDecoder().decode((await reader.read()).value);
  assert.match(broadcast, /Akhi B/);
  assert.match(broadcast, /"inventory":\["stone"\]/);
  controller.abort();
  await action('take', {itemId:'stone'}, first.id, 400);

  async function flames(target) {
    for (let i = 0; i < 4; i++) {
      for (let tries = 0; tries < 3; tries++) {
        const snapshot = await state();
        if (snapshot.torches[i] === target[i]) break;
        await action('cycle-torch', {torchId:snapshot.torches[i]});
      }
    }
    assert.deepEqual((await state()).torches, target);
  }
  await flames([6,3,12,9]);
  assert.equal((await state()).muralSolved, true);
  await flames([1,10,12,4]);
  assert.equal((await state()).floor1, true);
  for (const id of ['bucket','pickaxe','medium_gear']) await action('take',{itemId:id});
  for (const statueId of [3,5,8,10]) await action('place-statue',{statueId});
  assert.equal((await state()).underStatue, true);
  await action('break-mural');
  for (const id of ['small_gear','big_gear']) await action('take',{itemId:id});
  for (const id of ['small_gear','medium_gear','big_gear']) await action('insert-gear',{itemId:id});
  await action('rotate-table');
  await flames([5,3,7,9]);
  await action('take',{itemId:'blue_relic'});
  await action('use-relic');
  assert.equal((await state()).finished, true);

  await action('red-enter', {}, second.id);
  await action('red-inspect',{clueId:'horse-cache'},second.id,400);
  for (const room of ['horse','whale','falcon','phoenix']) await action('red-inspect',{clueId:`${room}-mark`},second.id);
  for (const room of ['horse','whale','falcon']) await action('red-activate',{room},second.id);
  for (const place of ['whale','corridor','phoenix']) await action('red-inspect',{clueId:`plug-${place}`},second.id);
  for (const slot of [1,2,3]) await action('red-place-plug',{slot},second.id);
  await action('red-inspect',{clueId:'horse-inscription'},second.id);
  await action('red-open-horse',{code:'FAUX'},second.id,400);
  await action('red-open-horse',{code:'EQUUS'},second.id);
  await action('red-finalize',{},second.id);
  const final = await state();
  assert.equal(final.red.finished, true);
  assert.equal(final.red.relicFound, true);
  // Green remains independent after the other rooms have been solved.
  await action('green-battle', {}, first.id, 400);
  await action('green-inspect', {clueId:'ivory'}, 'unknown', 400);
  await action('green-inspect', {clueId:'bad'}, first.id, 400);
  await action('green-move', {from:'f7',to:'g7'}, first.id, 400);
  await action('green-inspect', {clueId:'ivory'}, first.id);
  await action('green-inspect', {clueId:'ivory'}, second.id);
  assert.equal((await state()).green.inspected.length, 1);
  await action('green-inspect', {clueId:'basalt'}, second.id);
  await action('green-inspect', {clueId:'stele'}, first.id);
  await action('green-battle', {}, second.id);
  await action('green-move', {from:'f7',to:'f8'}, first.id, 400);
  await action('green-move', {from:'f6',to:'g7'}, first.id, 400);
  assert.equal((await state()).green.finished, false);
  await action('green-move', {from:'f7',to:'g7'}, second.id);
  await action('green-move', {from:'f7',to:'g7'}, first.id, 400);
  const greenFinal = await state();
  assert.equal(greenFinal.green.finished, true);
  assert.equal(greenFinal.red.finished, true);
  assert.equal(greenFinal.finished, true);
  assert.deepEqual(greenFinal.inventory, final.inventory);
  child.kill();
  await once(child, 'exit');
});
