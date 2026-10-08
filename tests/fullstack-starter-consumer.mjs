import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';

// Prepublication check: install packed artifacts in a fresh external app.
const repo = fileURLToPath(new URL('../', import.meta.url));
const root = await mkdtemp(path.join(tmpdir(), 'tilcayo-fullstack-consumer-'));
const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const env = { ...process.env, NODE_PATH: '', npm_config_offline: process.env.npm_config_offline ?? 'true', npm_config_audit: 'false', npm_config_fund: 'false' };
function run(script, args, cwd = root) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8', windowsHide: true, timeout: 120000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
const keep = process.argv.includes('--keep');
let passed = false;
let server;
try {
  const packages = {};
  for (const name of ['core', 'auth', 'react', 'styles', 'ui', 'admin', 'cli', 'create-tilcayo-app']) {
    const [pack] = JSON.parse(run(npm, ['pack', path.join(repo, 'packages', name), '--json', '--ignore-scripts']));
    assert.ok(pack.files.every(file => file.path.startsWith('dist/') || ['package.json', 'README.md'].includes(file.path)), name);
    packages[name === 'create-tilcayo-app' ? name : `@tilcayo/${name}`] = 'file:' + path.join(root, pack.filename).split(path.sep).join('/');
  }
  const tools = path.join(root, 'tools');
  await mkdir(tools);
  await writeFile(path.join(tools, 'package.json'), JSON.stringify({ private: true, dependencies: { 'create-tilcayo-app': packages['create-tilcayo-app'], '@tilcayo/cli': packages['@tilcayo/cli'] } }));
  run(npm, ['install', '--ignore-scripts'], tools);
  run(path.join(tools, 'node_modules/create-tilcayo-app/dist/bin.js'), ['bookstore', '--fullstack', '--auth', '--admin', '--no-install', '--yes']);
  const target = path.join(root, 'bookstore');
  for (const folder of ['', 'api', 'client']) {
    const filename = path.join(target, folder, 'package.json');
    const manifest = JSON.parse(await readFile(filename, 'utf8'));
    for (const group of ['dependencies', 'devDependencies']) {
      for (const [name, version] of Object.entries(manifest[group] ?? {})) {
        assert.ok(!version.startsWith('file:') && !version.startsWith('link:'), `${name} unexpectedly relies on the checkout`);
        if (packages[name]) manifest[group][name] = packages[name];
      }
    }
    await writeFile(filename, JSON.stringify(manifest, null, 2) + '\n');
  }
  run(npm, ['install', '--ignore-scripts'], target);
  const cli = path.join(target, 'node_modules/@tilcayo/cli/dist/bin.js');
  run(cli, ['make:resource', 'Author', 'name:string', '--fullstack'], target);
  run(cli, ['make:resource', 'Book', 'title:string', 'author:ref:Author', 'year:number?', '--fullstack'], target);
  const appFile = path.join(target, 'api/src/app.ts');
  let app = await readFile(appFile, 'utf8');
  app = 'import authorRoutes from "./routes/authors.routes.js";\nimport bookRoutes from "./routes/books.routes.js";\n' + app.replace('export default app;', 'app.routes(authorRoutes);\napp.routes(bookRoutes);\nexport default app;');
  await writeFile(appFile, app);
  const routesFile = path.join(target, 'client/src/routes.tsx');
  let routes = await readFile(routesFile, 'utf8');
  routes = "import { authorsRoutes } from './features/authors/authors.routes';\nimport { booksRoutes } from './features/books/books.routes';\n" + routes.replace('children: [', 'children: [\n ...authorsRoutes, ...booksRoutes,');
  await writeFile(routesFile, routes);
  run(npm, ['run', 'build'], target);
  run(npm, ['run', 'lint', '--workspace', 'client'], target);
  const registered = run(npm, ['run', 'routes'], target);
  for (const route of ['/api/notes', '/api/auth', '/api/authors', '/api/books']) assert.ok(registered.includes(route), route);
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  server = spawn(process.execPath, [path.join(target, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: path.join(target, 'client'), env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/login`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, output);
  console.log('Packed external app: install, auth/admin preset, Author/Book generation, both builds, frontend lint, route listing and Vite startup passed.');
  passed = true;
  if (keep) console.log(`Preview app: ${target}`);
} finally {
  if (server && server.exitCode === null) { const stopped = once(server, 'exit'); server.kill(); await stopped; }
  assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
  assert.ok(path.basename(root).startsWith('tilcayo-fullstack-consumer-'));
  if (!keep || !passed) await rm(root, { recursive: true, force: true });
}
