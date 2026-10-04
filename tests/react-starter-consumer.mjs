import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';

const repo = fileURLToPath(new URL('../', import.meta.url));
const root = await mkdtemp(path.join(tmpdir(), 'tilcayo-starter-consumer-'));
const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const env = { ...process.env, npm_config_offline: process.env.npm_config_offline ?? 'false', npm_config_audit: 'false', npm_config_fund: 'false' };
function run(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8', windowsHide: true, timeout: 120000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
let child;
try {
  run(path.join(repo, 'packages/create-tilcayo-app/dist/bin.js'), ['fresh-react', '--type', 'react', '--yes'], root);
  const target = path.join(root, 'fresh-react');
  run(npm, ['run', 'lint'], target);
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  child = spawn(process.execPath, [path.join(target, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: target, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}`);
      if (response.ok && (await response.text()).includes('Tilcayo starter')) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, output);
  console.log('Fresh local creator: automatic install, build, lint, and Vite startup passed.');
} finally {
  if (child && child.exitCode === null) { const stopped = once(child, 'exit'); child.kill(); await stopped; }
  assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
  assert.ok(path.basename(root).startsWith('tilcayo-starter-consumer-'));
  await rm(root, { recursive: true, force: true });
}

