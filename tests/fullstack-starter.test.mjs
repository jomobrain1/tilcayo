import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generateApp } from '../packages/create-tilcayo-app/dist/index.js';
import { parseOptions } from '../packages/create-tilcayo-app/dist/options.js';
import { make } from '../packages/cli/dist/index.js';
const repo = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const compiler = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin/tsc');

test('starter aliases preserve API creation and reject conflicting presets', () => {
  assert.equal(parseOptions(['app', '--api']).options.type, 'api');
  assert.equal(parseOptions(['app', '--fullstack', '--auth', '--admin']).options.admin, true);
  assert.throws(() => parseOptions(['app', '--fullstack', '--admin']), /Admin requires/);
  assert.throws(() => parseOptions(['app', '--api', '--auth', '--admin']), /Admin requires/);
  assert.throws(() => parseOptions(['app', '--api', '--fullstack']), /conflicting/);
  assert.throws(() => parseOptions(['app', '--type', 'react', '--fullstack']), /conflicting/);
});

test('all full-stack presets compile and generate relationship CRUD', async t => {
  const parent = await mkdtemp(path.join(repo, '.starter-test-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  for (const [name, auth, admin] of [['public', false, false], ['auth', true, false], ['admin', true, true]]) {
    const root = await generateApp({ name, type: 'fullstack', auth, admin, packageManager: 'npm', install: false }, parent);
    const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    assert.deepEqual(manifest.workspaces, ['api', 'client']);
    assert.equal(manifest.tilcayo.admin, admin);
    assert.match(await readFile(path.join(root, 'client/vite.config.ts'), 'utf8'), /\/api/);
    assert.match(await readFile(path.join(root, 'api/src/routes/notes.routes.ts'), 'utf8'), /\/api\/notes/);
    const routes = await readFile(path.join(root, 'client/src/routes.tsx'), 'utf8');
    assert.match(routes, /\.\.\.notesRoutes/);
    assert.equal(routes.includes('...adminRoutes'), admin);
    await make(['make:resource', 'Author', 'name:string', '--fullstack'], root);
    await make(['make:resource', 'Book', 'title:string', 'author:ref:Author', 'year:number?', '--fullstack'], root);
    for (const filename of ['api/tsconfig.json', 'client/tsconfig.app.json']) {
      try { execFileSync(process.execPath, [compiler, '-p', path.join(root, filename)], { encoding: 'utf8' }); }
      catch (error) { throw new Error(error.stdout || error.message); }
    }
    await assert.rejects(generateApp({ name, type: 'fullstack', auth, admin, packageManager: 'npm', install: false }, parent), /already exists/);
  }
});
