import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { add } from '../packages/cli/dist/index.js';
import { generateApp } from '../packages/create-tilcayo-app/dist/index.js';
const repo = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const compiler = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin/tsc');
async function fixture(t) {
  const root = await mkdtemp(path.join(repo, '.installer-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const options = { name: 'client', type: 'react', auth: false, install: false, packageManager: 'npm' };

test('explicit auth and admin installation preserves pages and compiles the React app', async t => {
  const parent = await fixture(t);
  const root = await generateApp(options, parent);
  const home = await readFile(path.join(root, 'src/pages/home.page.tsx'), 'utf8');
  await assert.rejects(add(['add:admin'], root), /requires authentication/);
  const messages = await add(['add:auth'], root);
  assert.ok(messages.some(message => message.includes('src/app/store.ts')));
  assert.equal(await readFile(path.join(root, 'src/pages/home.page.tsx'), 'utf8'), home);
  assert.match(await readFile(path.join(root, 'src/App.tsx'), 'utf8'), /<Toaster \/>/);
  await add(['add:admin'], root);
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.ok(manifest.tilcayo.auth && manifest.tilcayo.admin);
  assert.ok(manifest.dependencies['@tilcayo/admin']);
  const routes = await readFile(path.join(root, 'src/routes.tsx'), 'utf8');
  assert.match(routes, /\.\.\.authRoutes/);
  assert.match(routes, /\.\.\.adminRoutes/);
  try { execFileSync(process.execPath, [compiler, '-p', path.join(root, 'tsconfig.app.json')], { encoding: 'utf8' }); }
  catch (error) { throw new Error(error.stdout || error.message); }
  await assert.rejects(add(['add:admin'], root), /already exists/);
});

test('customized integration files and late collisions are refused before any writes', async t => {
  const parent = await fixture(t);
  const root = await generateApp(options, parent);
  const filename = path.join(root, 'src/app/store.ts');
  const source = await readFile(filename, 'utf8');
  await writeFile(filename, source + '\n// Custom store\n');
  const manifest = await readFile(path.join(root, 'package.json'), 'utf8');
  await assert.rejects(add(['add:auth'], root), /Customized integration file/);
  await assert.rejects(access(path.join(root, 'src/app/auth.ts')));
  assert.equal(await readFile(path.join(root, 'package.json'), 'utf8'), manifest);
  await writeFile(filename, source);
  await mkdir(path.join(root, 'src/features/auth'), { recursive: true });
  await writeFile(path.join(root, 'src/features/auth/auth.routes.tsx'), 'keep');
  await assert.rejects(add(['add:auth'], root), /already exists/);
  assert.equal(await readFile(filename, 'utf8'), source);
});

test('full-stack auth installs both sides and backend secrets without npm side effects', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'test-app', tilcayo: { type: 'fullstack' } }));
  await generateApp(options, root);
  await generateApp({ ...options, name: 'api', type: 'api' }, root);
  await add(['add:auth'], root);
  const env = await readFile(path.join(root, 'api/.env'), 'utf8');
  assert.match(env, /AUTH_ACCESS_SECRET=[a-f0-9]{64}/);
  assert.match(env, /AUTH_REFRESH_SECRET=[a-f0-9]{64}/);
  assert.match(await readFile(path.join(root, 'api/src/app.ts'), 'utf8'), /app.routes\(authRoutes\)/);
  execFileSync(process.execPath, [compiler, '-p', path.join(root, 'api')], { encoding: 'utf8' });
  await add(['add:admin'], root);
  assert.equal(JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).tilcayo.admin, true);
  assert.match(await readFile(path.join(root, 'api/src/app.ts'), 'utf8'), /app.routes\(auth.adminRoutes\)/);
  execFileSync(process.execPath, [compiler, '-p', path.join(root, 'api')], { encoding: 'utf8' });
});
