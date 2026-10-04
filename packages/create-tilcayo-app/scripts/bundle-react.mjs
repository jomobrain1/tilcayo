import { readFile, readdir, writeFile } from 'node:fs/promises';

// The client is the editable source of the starter. Ship its snapshot in dist.
const client = new URL('../../../client/', import.meta.url);
const files = {};
for (const name of ['package.json', 'index.html', '.gitignore', '.oxlintrc.json', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
  files[name] = await readFile(new URL(name, client), 'utf8');
}
async function collect(directory) {
  for (const entry of await readdir(new URL(directory, client), { withFileTypes: true })) {
    const name = `${directory}${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== 'assets') await collect(`${name}/`);
    } else {
      files[name] = await readFile(new URL(name, client), 'utf8');
    }
  }
}
await collect('src/');
files['README.md'] = '# Tilcayo React starter\n\nReact, TypeScript, Vite, React Router, and Tilcayo styles. Includes Home, Elements, About, and responsive navigation.\n\nUse Node.js 22.12+ (or 24+).\n\n```sh\nnpm install\nnpm run dev\n```\n\nRun `npm run build` for production, `npm run preview` to preview the build, and `npm run lint` to check source files. Deploy `dist/` with all application URLs falling back to `index.html` for client-side routing.\n\nEdit `src/pages/`, `src/App.tsx`, and `src/App.css`. This is a frontend starter; connect your own API. Local checkout generation links the checkout styles package, so keep the checkout available.\n';
files['README.md'] += '\n## API client\n\n`src/lib/api.ts` uses @tilcayo/react with public VITE_API_URL or /api. It sends no requests on startup. Never put secrets in VITE_* variables. Local generation links both styles and API client packages from the checkout; future published generation uses npm versions.\n';
files['README.md'] += '\nThe Redux Provider uses src/app/store.ts. Inject server endpoints into src/app/api.ts and use typed client-state hooks from src/app/hooks.ts. No backend is needed to render the starter.\n';
await writeFile(new URL('../dist/react-starter.json', import.meta.url), JSON.stringify(files, null, 2) + '\n');

const authFiles = {};
const authRoot = new URL('../templates/react-auth/', import.meta.url);
async function collectAuth(directory = '') {
  for (const entry of await readdir(new URL(directory, authRoot), { withFileTypes: true })) {
    const name = directory + entry.name;
    if (entry.isDirectory()) await collectAuth(name + '/');
    else authFiles[name] = await readFile(new URL(name, authRoot), 'utf8');
  }
}
await collectAuth();
await writeFile(new URL('../dist/react-auth.json', import.meta.url), JSON.stringify(authFiles, null, 2) + '\n');
