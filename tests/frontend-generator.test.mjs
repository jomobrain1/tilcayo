import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { make } from '../packages/cli/dist/index.js';
import { createTilcayoStore } from '../packages/react/dist/redux/index.js';
const require = createRequire(import.meta.url);
const ts = createRequire(new URL('../examples/react-starter/package.json', import.meta.url))('typescript');
const repo = fileURLToPath(new URL('../', import.meta.url));

test('generated CRUD compiles, performs mutations and invalidates list/detail caches', async t => {
  const root = await mkdtemp(path.join(repo, '.frontend-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  await mkdir(path.join(root, 'src/app'), { recursive: true });
  await writeFile(path.join(root, 'src/app/api.ts'), `import { createTilcayoApi } from '@tilcayo/react/redux';
export const tilcayoApi = createTilcayoApi({ baseUrl: 'http://api.test/api', fetch: (...args) => globalThis.fetch(...args) });`);
  await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true, noUnusedLocals: true, noUnusedParameters: true }, include: ['src'] }));
  const args = ['make:frontend', 'Book', 'title:string', 'year:number?', 'active:boolean', 'publishedAt:date?', 'author:ref:Author', 'tags:refs:Tag?'];
  await make(args, root);
  execFileSync(process.execPath, [path.join(path.dirname(require.resolve('typescript/package.json')), 'bin/tsc'), '-p', root], { encoding: 'utf8' });
  await assert.rejects(make(args, root), /already exists/);
  // Check collisions before any earlier file is written.
  const collision = await mkdtemp(path.join(repo, '.frontend-test-'));
  t.after(() => rm(collision, { recursive: true, force: true }));
  await writeFile(path.join(collision, 'package.json'), '{}');
  await mkdir(path.join(collision, 'src/features/books/pages'), { recursive: true });
  await writeFile(path.join(collision, 'src/features/books/pages/edit-book.page.tsx'), 'keep');
  await assert.rejects(make(args, collision), /already exists/);
  assert.deepEqual(await readdir(path.join(collision, 'src/features/books')), ['pages']);
  for (const filename of ['app/api.ts', 'features/books/books.api.ts']) {
    const source = (await readFile(path.join(root, 'src', filename), 'utf8')).replace(/from '(\.[^']+)'/g, "from '$1.js'");
    await writeFile(path.join(root, 'src', filename.replace('.ts', '.js')), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  }
  let record = { _id: 'book-1', title: 'First', author: 'author-1', active: true };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    calls.push([url, options.method]);
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    if (options.method === 'PUT' || options.method === 'POST') record = { ...record, ...JSON.parse(options.body) };
    return Response.json({ success: true, message: 'Success', data: url.endsWith('/books') && options.method === 'GET' ? [record] : record });
  });
  const { bookApi } = await import(pathToFileURL(path.join(root, 'src/features/books/books.api.js')));
  const store = createTilcayoStore({ api: bookApi });
  t.after(() => store.dispatch(bookApi.util.resetApiState()));
  const list = store.dispatch(bookApi.endpoints.getBooks.initiate());
  const detail = store.dispatch(bookApi.endpoints.getBook.initiate('book-1'));
  await Promise.all([list.unwrap(), detail.unwrap()]);
  await store.dispatch(bookApi.endpoints.updateBook.initiate({ id: 'book-1', changes: { title: 'Updated' } })).unwrap();
  await Promise.all(store.dispatch(bookApi.util.getRunningQueriesThunk()));
  assert.equal(bookApi.endpoints.getBook.select('book-1')(store.getState()).data.data.title, 'Updated');
  assert.equal(bookApi.endpoints.getBooks.select()(store.getState()).data.data[0].title, 'Updated');
  assert.equal(calls.filter(([url, method]) => url.endsWith('/books') && method === 'GET').length, 2);
  await store.dispatch(bookApi.endpoints.createBook.initiate({ title: 'Created', author: 'author-1', active: false })).unwrap();
  await store.dispatch(bookApi.endpoints.deleteBook.initiate('book-1')).unwrap();
  assert.ok(calls.some(([url, method]) => url.endsWith('/books/book-1') && method === 'DELETE'));
  list.unsubscribe(); detail.unsubscribe();
});
