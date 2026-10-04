import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const directory = await mkdtemp(path.join(tmpdir(), 'tilcayo-f2-consumer-'));
function node(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: directory, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, NODE_PATH: '', npm_config_cache: path.join(directory, 'cache') },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
try {
  const args = ['pack', path.join(repo, 'packages/react'), '--json', '--ignore-scripts'];
  const [dry] = JSON.parse(node(npm, [...args, '--dry-run']));
  assert.ok(dry.files.every(({ path }) => path.startsWith('dist/') || ['README.md', 'package.json'].includes(path)));
  assert.ok(dry.files.some(({ path }) => path === 'dist/index.d.ts'));
  const [pack] = JSON.parse(node(npm, args));
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  node(npm, ['install', './' + pack.filename, 'react@^19', 'react-dom@^19', '@types/react@^19', '@reduxjs/toolkit@^2.13.0', 'react-redux@^9.3.0', '--ignore-scripts', '--no-audit', '--no-fund']);
  await writeFile(path.join(directory, 'main.ts'), `
import { createApiClient, createResourceClient, isTilcayoApiError, isTilcayoNetworkError, type TilcayoResponse } from '@tilcayo/react';
import { createTilcayoApi, createTilcayoStore } from '@tilcayo/react/redux';
import { useDispatch, useSelector } from 'react-redux';
const queryApi = createTilcayoApi({ baseUrl: '/api' });
const store = createTilcayoStore({ api: queryApi, reducers: { count: (state = 0) => state } });
const count: number = store.getState().count;
const dispatch = useDispatch.withTypes<typeof store.dispatch>();
const select = useSelector.withTypes<ReturnType<typeof store.getState>>();
export const injected = queryApi.injectEndpoints({ endpoints: b => ({ books: b.query<string[], void>({ query: () => '/books' }) }) });
export const api = createApiClient({ baseUrl: '/api' });
export const read = () => api.get<TilcayoResponse<{ title: string }[]>>('/books');
export const write = () => api.post('/books', { title: 'Test' });
const books = createResourceClient<{ id: string; title: string }, { title: string }, { title?: string }>({ api, path: '/books' });
export const createBook = () => books.create({ title: 'Test' });
export const findBook = (): Promise<TilcayoResponse<{ id: string; title: string }>> => books.find('1');
// @ts-expect-error create input requires title
const invalidCreate = () => books.create({ id: '1' });
export { isTilcayoApiError, isTilcayoNetworkError };
// @ts-expect-error GET convenience method must not accept a body
const invalid = () => api.get('/books', { body: {} });
// @ts-expect-error Query values must not accept arbitrary objects
const badQuery = () => api.get('/books', { query: { nested: {} } });
`);
  await writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
    lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: [], noEmit: true,
  }, include: ['main.ts'] }));
  node(path.join(repo, 'node_modules/typescript/bin/tsc'), ['-p', 'tsconfig.json']);
  await writeFile(path.join(directory, 'index.html'), '<div id="app"></div><script type="module" src="/main.ts"></script>');
  node(path.join(repo, 'node_modules/vite/bin/vite.js'), ['build']);
  await writeFile(path.join(directory, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import { createApiClient } from '@tilcayo/react';
const api = createApiClient({ baseUrl: '/api', fetch: async (url) => {
  assert.equal(url, '/api/books'); return Response.json({ success: true, message: 'Success', data: [] });
} });
assert.deepEqual((await api.get('/books')).data, []);
`);
  node(path.join(directory, 'smoke.mjs'));
  console.log(JSON.stringify({ packedBytes: pack.size, unpackedBytes: pack.unpackedSize, files: pack.files.length, typecheck: 'passed', vite: 'passed', runtimeImport: 'passed' }));
} finally {
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
  assert.ok(path.basename(resolved).startsWith('tilcayo-f2-consumer-'));
  await rm(resolved, { recursive: true, force: true });
}
