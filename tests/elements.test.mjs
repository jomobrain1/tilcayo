import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repo = fileURLToPath(new URL('../', import.meta.url));
const examplesRoot = path.join(repo, 'client/src/components/elements/examples');
const require = createRequire(import.meta.url);
const compiler = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin/tsc');

test('every Elements preview and copied snippet share one self-contained, independently compilable source', async t => {
  const catalogue = await readFile(path.join(repo, 'client/src/components/elements/catalogue.ts'), 'utf8');
  const examples = (await readdir(examplesRoot)).filter(name => name.endsWith('.tsx')).sort();
  assert.equal(examples.length, 38);
  const imports = [...catalogue.matchAll(/import Example(\d+) from '\.\/examples\/([^']+)'/g)];
  assert.equal(imports.length, examples.length);
  for (const [, index, name] of imports) assert.ok(catalogue.includes(`import source${index} from './examples/${name}.tsx?raw'`), name);
  const root = await mkdtemp(path.join(repo, '.elements-snippets-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(repo));
    assert.ok(path.basename(root).startsWith('.elements-snippets-'));
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  await writeFile(path.join(root, 'src/styles.d.ts'), 'declare module "*.css" {}');
  for (const filename of examples) {
    const source = await readFile(path.join(examplesRoot, filename), 'utf8');
    assert.ok(source.includes("import '@tilcayo/styles/index.css'"), filename);
    assert.match(source, /export default function/, filename);
    for (const [, dependency] of source.matchAll(/(?:from\s+|import\s+)['"]([^'"]+)['"]/g)) assert.ok(['react', '@tilcayo/ui', '@tilcayo/styles/index.css'].includes(dependency), `${filename}: hidden dependency ${dependency}`);
    await writeFile(path.join(root, 'src', filename), source);
  }
  await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true }, include: ['src'] }));
  try { execFileSync(process.execPath, [compiler, '-p', path.join(root, 'tsconfig.json')], { encoding: 'utf8' }); }
  catch (error) { throw new Error(error.stdout || error.message); }
});

test('starter and example apps ship the same Elements page and example sources', async () => {
  const files = ['pages/elements.page.tsx', 'components/elements/elements-library.tsx', 'components/elements/catalogue.ts', 'components/elements/example-card.tsx', 'components/elements/elements.css', ...(await readdir(examplesRoot)).map(name => 'components/elements/examples/' + name)];
  for (const root of ['packages/create-tilcayo-app/templates/react-auth/src', 'my-fullstack-app/client/src']) {
    for (const filename of files) assert.equal(await readFile(path.join(repo, root, filename), 'utf8'), await readFile(path.join(repo, 'client/src', filename), 'utf8'), root + '/' + filename);
  }
});
