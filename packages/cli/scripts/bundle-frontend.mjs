import { readFile, readdir, writeFile } from 'node:fs/promises';

const authRoot = new URL('../../create-tilcayo-app/templates/react-auth/', import.meta.url);
const auth = {};
async function collect(directory = '') {
  for (const entry of await readdir(new URL(directory, authRoot), { withFileTypes: true })) {
    const name = directory + entry.name;
    if (entry.isDirectory()) await collect(name + '/');
    else auth[name] = await readFile(new URL(name, authRoot), 'utf8');
  }
}
await collect();
const starter = {};
for (const name of ['src/App.tsx', 'src/app/api.ts', 'src/app/store.ts']) {
  starter[name] = await readFile(new URL('../../../client/' + name, import.meta.url), 'utf8');
}
await writeFile(new URL('../dist/frontend-templates.json', import.meta.url), JSON.stringify({ auth, starter }, null, 2) + '\n');
