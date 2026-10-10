import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { templates } from '../packages/create-tilcayo-app/dist/templates.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../examples/react-starter/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);

test('starter Vite configs share React and provider dependencies with linked packages', async t => {
  const root = await mkdtemp(path.join(repo, '.react-dedupe-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, 'src/App.tsx'), 'export default function App() { return null; }');
  // A separate React installation reproduces the local-linked-app layout.
  await cp(path.dirname(require.resolve('react/package.json')), path.join(root, 'node_modules/react'), { recursive: true });
  const appImporter = path.join(root, 'src/App.tsx');
  const linkedImporter = path.join(repo, 'packages/react/dist/auth/createTilcayoAuth.js');
  const options = { root, server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } };
  const original = await createServer({ ...options, configFile: false });
  try {
    const resolve = original.environments.client.pluginContainer.resolveId.bind(original.environments.client.pluginContainer);
    assert.notEqual((await resolve('react', appImporter)).id, (await resolve('react', linkedImporter)).id);
  } finally { await original.close(); }
  for (const [type, auth, filename] of [['react', false, 'vite.config.ts'], ['react', true, 'vite.config.ts'], ['fullstack', true, 'client/vite.config.ts']]) {
    const files = templates({ name: 'test-app', type, auth, admin: auth, packageManager: 'npm', install: false });
    await writeFile(path.join(root, 'vite.config.ts'), files[filename]);
    const server = await createServer(options);
    try {
      const resolve = server.environments.client.pluginContainer.resolveId.bind(server.environments.client.pluginContainer);
      for (const dependency of ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', 'react-router']) {
        const app = await resolve(dependency, appImporter);
        const linked = await resolve(dependency, linkedImporter);
        assert.ok(app, dependency);
        assert.equal(app.id, linked?.id, `${type}, auth=${auth}: ${dependency} must be shared`);
      }
    } finally { await server.close(); }
  }
});
