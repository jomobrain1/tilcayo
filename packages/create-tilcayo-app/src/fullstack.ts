import type { StarterOptions } from "./options.js";
import { templates } from "./templates.js";

// Each half remains an ordinary Tilcayo API or Vite app.
export function fullstackTemplates(options: StarterOptions, localPackages: Record<string, string>): Record<string, string> {
  const api = templates({ ...options, name: `${options.name}-api`, type: "api", admin: options.admin }, localPackages);
  const client = templates({ ...options, name: `${options.name}-client`, type: "react" }, localPackages);
  client["vite.config.ts"] = `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', 'react-router'] },
  server: { proxy: { '/api': { target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:9149', changeOrigin: true } } },
});
`;
  client[".env.example"] = "# Public frontend API base URL\nVITE_API_URL=/api\n";
  client["src/routes.tsx"] = "import { notesRoutes } from './features/notes/notes.routes';\n" + client["src/routes.tsx"].replace("children: [", "children: [\n      ...notesRoutes,");
  const files: Record<string, string> = {};
  for (const [name, source] of Object.entries(api)) files[`api/${name}`] = source;
  for (const [name, source] of Object.entries(client)) files[`client/${name}`] = source;
  files["package.json"] = JSON.stringify({
    name: options.name, version: "0.0.1", private: true, type: "module",
    engines: { node: "^22.12.0 || >=24.0.0" },
    workspaces: ["api", "client"],
    tilcayo: { type: "fullstack", auth: options.auth, admin: options.admin ?? false, packageManager: options.packageManager },
    scripts: {
      dev: "node scripts/dev.mjs", "dev:api": "npm run dev --workspace api", "dev:client": "npm run dev --workspace client",
      build: "npm run build --workspaces", start: "npm run start --workspace api", routes: "npm run routes --workspace api",
      ...(options.admin ? { 'seed:demo': 'npm run build --workspace api && npm run seed:demo --workspace api', 'seed:demo:remove': 'npm run build --workspace api && npm run seed:demo --workspace api -- --remove' } : {}),
    },
    devDependencies: { "@tilcayo/cli": localPackages.rootCli ?? "^0.0.2" },
  }, null, 2) + "\n";
  files[".gitignore"] = "node_modules/\n**/dist/\n.env\n.env.*\n**/.env\n**/.env.*\n!**/.env.example\n*.log\n";
  if (options.packageManager === "yarn") files[".yarnrc.yml"] = "nodeLinker: node-modules\n";
  files["scripts/dev.mjs"] = devScript;
  files["README.md"] = fullstackReadme(options, Object.keys(localPackages).length > 0);
  return files;
}

function fullstackReadme(options: StarterOptions, local: boolean): string {
  return `# ${options.name}

Tilcayo MongoDB API + React/Vite client${options.auth ? " with authentication" : ""}${options.admin ? " and admin pages" : ""}.

Use Node.js 22.12+ or 24+. Start MongoDB and configure api/.env (MONGODB_URI,
PORT and private auth/mail settings when enabled). Never put secrets in VITE_*.

\`\`\`sh
${options.packageManager} install
${options.packageManager} run dev
\`\`\`

The client runs on Vite's printed URL and proxies /api to port 9149. If you change
the API port, set API_PROXY_TARGET for the client dev process or edit
client/vite.config.ts. Visit /notes for sample CRUD${options.auth ? ", /login to sign in, /register to create an account and /profile for your account" : ""}${options.admin ? ", and /admin for management" : ""}.
${options.auth ? "Tokens are kept in memory; reloading signs out. Configure backend SMTP settings for password recovery.\n" : ""}${options.admin ? "Provision the admin role through trusted server code; registration never grants it.\n" : ""}
${options.admin ? "Admin users and role filters are at /admin/users. The catalog at /admin/products includes inventory cards and add/edit forms. Product data starts empty; add products in the UI. Protected catalog routes and the Product model are generated in api/src.\n" : ""}
Generate both halves from this directory:

\`\`\`sh
npx tilcayo make:resource Author name:string --fullstack
npx tilcayo make:resource Book title:string author:ref:Author year:number? --fullstack
\`\`\`

Register backend routes in api/src/app.ts and spread frontend route arrays into
client/src/routes.tsx layout children. For admin resources, add their links in
client/src/features/admin/admin-layout.tsx and nest createBooksRoutes('books',
'/admin/books') in the admin route module. Resource routes are public until you
add backend auth.middleware (and auth.requireRole('admin') where appropriate).

Run ${options.packageManager} run build to build both halves. Production uses
api/dist/index.js and client/dist; serve the client with SPA fallback and proxy
/api to the API. npm run start starts the API only. Configure HTTPS on your host.
The dev runner requires npm on PATH; npm ships with Node.js even if dependencies
are installed with pnpm or Yarn. Stop both processes with Ctrl+C. Separate
dev:api and dev:client scripts are available.
${local ? "\nDependencies link to this source checkout. Keep it available, or replace file/link dependencies with published package versions before sharing the app.\n" : ""}`;
}

const devScript = `import { spawn, spawnSync } from 'node:child_process';

const windows = process.platform === 'win32';
const children = ['api', 'client'].map(workspace => spawn('npm', ['run', 'dev', '--workspace', workspace], {
  stdio: 'inherit', shell: windows, windowsHide: true, detached: !windows,
}));
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (windows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  }
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code ?? 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
`;
