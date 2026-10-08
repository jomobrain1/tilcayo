import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { createApp } from '../packages/core/dist/index.js';
import path from 'node:path';
import { make } from '../packages/cli/dist/index.js';
const require = createRequire(import.meta.url);
const repo = fileURLToPath(new URL('../', import.meta.url));
const compiler = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin/tsc');

async function fixture(t) {
  const root = await mkdtemp(path.join(repo, '.fullstack-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of ['api', 'client']) {
    await mkdir(path.join(root, name, 'src/app'), { recursive: true });
    await writeFile(path.join(root, name, 'package.json'), '{"type":"module"}');
    await writeFile(path.join(root, name, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: name === 'api' ? 'NodeNext' : 'ESNext', moduleResolution: name === 'api' ? 'NodeNext' : 'Bundler', strict: true, skipLibCheck: true, noEmit: true, jsx: 'react-jsx', noUnusedLocals: true, noUnusedParameters: true }, include: ['src'] }));
  }
  await writeFile(path.join(root, 'client/src/app/api.ts'), "import { createTilcayoApi } from '@tilcayo/react/redux'; export const tilcayoApi = createTilcayoApi({ baseUrl: '/api' });");
  return root;
}

test('full-stack resources compile on both sides with primitive and relationship fields', async t => {
  const root = await fixture(t);
  await make(['make:resource', 'Author', 'name:string', '--fullstack'], root);
  await make(['make:resource', 'Book', 'title:string', 'year:number?', 'author:ref:Author', 'tags:refs:Tag?', '--fullstack'], root);
  for (const name of ['api', 'client']) execFileSync(process.execPath, [compiler, '-p', path.join(root, name)], { encoding: 'utf8' });
  assert.match(await readFile(path.join(root, 'api/src/routes/books.routes.ts'), 'utf8'), /\/api\/books/);
  assert.match(await readFile(path.join(root, 'api/src/services/authors.service.ts'), 'utf8'), /createAuthor/);
  assert.match(await readFile(path.join(root, 'client/src/features/books/books.types.ts'), 'utf8'), /author: string/);
  execFileSync(process.execPath, [compiler, '-p', path.join(root, 'api'), '--noEmit', 'false', '--rootDir', path.join(root, 'api/src'), '--outDir', path.join(root, 'api/dist')]);
  const { Author } = await import(pathToFileURL(path.join(root, 'api/dist/models/Author.js')));
  const { default: routes } = await import(pathToFileURL(path.join(root, 'api/dist/routes/authors.routes.js')));
  const id = '1234567890abcdef12345678';
  let record = { _id: id, name: 'Reader' };
  t.mock.method(Author, 'all', async () => [record]);
  t.mock.method(Author, 'create', async body => ({ ...record, ...body }));
  t.mock.method(Author, 'findOrFail', async () => record);
  t.mock.method(Author, 'update', async (_id, body) => (record = { ...record, ...body }));
  t.mock.method(Author, 'delete', async () => record);
  const server = createApp().routes(routes).listen(0);
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/authors`;
  assert.equal((await (await fetch(base)).json()).data[0]._id, id);
  const json = body => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await fetch(base, { method: 'POST', ...json({ name: 'New' }) })).status, 201);
  assert.equal((await fetch(base, { method: 'POST', ...json({}) })).status, 422);
  assert.equal((await (await fetch(base + '/' + id, { method: 'PUT', ...json({ name: 'Changed' }) })).json()).data.name, 'Changed');
  assert.equal((await (await fetch(base + '/' + id)).json()).data.name, 'Changed');
  assert.equal((await fetch(base + '/' + id, { method: 'DELETE' })).status, 204);
});

test('a frontend collision prevents all backend writes', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'client/src/features/books/pages'), { recursive: true });
  await writeFile(path.join(root, 'client/src/features/books/pages/edit-book.page.tsx'), 'keep');
  await assert.rejects(make(['make:resource', 'Book', 'title:string', '--fullstack'], root), /already exists/);
  assert.deepEqual(await readdir(path.join(root, 'api/src')), ['app']);
  await assert.rejects(make(['make:model', 'Book', '--fullstack'], root), /only supported/);
});
