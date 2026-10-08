import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { authFiles } from "../generators/auth.js";
import { adminFiles } from "../generators/admin.js";
import { prepareAuthEnv } from "../utils/authEnv.js";
import { readSource, writeSource } from "../utils/files.js";
import type { GeneratedSource } from "../generators/frontend.js";

interface Manifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  tilcayo?: { type?: string; database?: string; auth?: boolean; admin?: boolean };
}
interface Change { target: string; source: string; create: boolean }
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const normalize = (source: string) => source.replaceAll("\r\n", "\n").trim();

async function manifestAt(root: string): Promise<Manifest> {
  return JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
}

async function dependency(root: string, name: string): Promise<string> {
  // Source checkout generation links local packages; packed CLI uses registry versions.
  const checkout = fileURLToPath(new URL("../../../../", import.meta.url));
  try {
    const manifest = await manifestAt(checkout);
    if (manifest.name === "tilcayo") return "file:" + path.relative(root, path.join(checkout, "packages", name)).split(path.sep).join("/");
  } catch { /* Not running in the source checkout. */ }
  return "^0.0.2";
}

async function addDependencies(manifest: Manifest, root: string, names: string[]): Promise<void> {
  manifest.dependencies ??= {};
  for (const name of names) manifest.dependencies[`@tilcayo/${name}`] ??= await dependency(root, name);
}

async function planFiles(root: string, files: GeneratedSource[], changes: Change[]): Promise<void> {
  for (const file of files) {
    if (await readSource(root, file.folder, file.name) !== undefined) throw new Error(`File already exists: ${path.join(root, "src", file.folder, file.name)}`);
    changes.push({ target: path.join(root, "src", file.folder, file.name), source: file.source, create: true });
  }
}

function insertRoutes(source: string, name: string, module: string, nested: boolean): string {
  const anchor = nested ? "children: [" : "export const routes: RouteObject[] = [";
  if (!source.includes(anchor)) throw new Error("Cannot locate route integration point in src/routes.tsx. Keep the starter's RouteObject[] convention.");
  return `import { ${name} } from '${module}';\n` + source.replace(anchor, `${anchor}\n    ...${name},`);
}

async function planFrontendAuth(root: string, manifest: Manifest, changes: Change[]): Promise<void> {
  const snapshot: { auth: Record<string, string>; starter: Record<string, string> } = JSON.parse(await readFile(new URL("../frontend-templates.json", import.meta.url), "utf8"));
  // Only replace integration files whose contents still match the plain starter.
  for (const [filename, original] of Object.entries(snapshot.starter)) {
    const existing = await readSource(root, path.dirname(filename.slice(4)), path.basename(filename));
    if (existing === undefined || normalize(existing) !== normalize(original)) throw new Error(`Customized integration file: ${filename}. Refusing to replace it. Wire createTilcayoAuth into your store/API/bootstrap explicitly.`);
    const source = filename === "src/App.tsx"
      ? "import { Toaster } from './components/toaster';\n" + snapshot.auth[filename].replace("<AppRoutes />", "<AppRoutes /><Toaster />")
      : snapshot.auth[filename];
    changes.push({ target: path.join(root, filename), source, create: false });
  }
  const files = Object.entries(snapshot.auth).filter(([name]) =>
    name.startsWith("src/") && !Object.hasOwn(snapshot.starter, name) &&
    !["src/routes.tsx", "src/components/navigation.tsx", "src/layouts/app-layout.tsx", "src/layouts/admin-layout.tsx", "src/pages/not-found.page.tsx", "src/pages/about.page.tsx", "src/App.css"].includes(name),
  ).map(([name, source]) => ({ folder: path.dirname(name.slice(4)), name: path.basename(name), source }));
  await planFiles(root, files, changes);
  const routes = await readSource(root, "", "routes.tsx");
  if (!routes) throw new Error("Missing src/routes.tsx");
  changes.push({ target: path.join(root, "src/routes.tsx"), source: insertRoutes(routes, "authRoutes", "./features/auth/auth.routes", true), create: false });
  const css = await readSource(root, "", "App.css");
  changes.push({ target: path.join(root, "src/App.css"), source: (css ?? "") + "\n" + snapshot.auth["src/App.css"], create: css === undefined });
  await addDependencies(manifest, root, ["react", "styles", "ui"]);
  manifest.dependencies = { "@reduxjs/toolkit": "^2.2.0", "react-redux": "^9.1.0", "react-router": "^7.0.0 || ^8.0.0", ...manifest.dependencies };
  manifest.tilcayo = { ...manifest.tilcayo, auth: true };
}

async function planBackendAuth(root: string, manifest: Manifest, changes: Change[]): Promise<() => Promise<void>> {
  if (manifest.tilcayo?.database === "none") throw new Error("Backend auth requires MongoDB. Configure the database and startup connection first.");
  await planFiles(root, authFiles, changes);
  const source = await readSource(root, "", "app.ts");
  if (!source?.includes("export default app;")) throw new Error("Backend src/app.ts must export default app for route integration.");
  changes.push({ target: path.join(root, "src/app.ts"), source: 'import authRoutes from "./routes/auth.routes.js";\n' + source.replace("export default app;", "app.routes(authRoutes);\n\nexport default app;"), create: false });
  await addDependencies(manifest, root, ["auth", "core"]);
  manifest.tilcayo = { ...manifest.tilcayo, auth: true };
  return prepareAuthEnv(root);
}

export async function add(args: string[], root = process.cwd()): Promise<string[]> {
  const [command] = args;
  if (args.length !== 1 || !["add:auth", "add:admin"].includes(command)) throw new Error("Usage: tilcayo add:auth | add:admin (no flags)");
  const manifest = await manifestAt(root);
  const fullstack = manifest.tilcayo?.type === "fullstack";
  const frontend = manifest.tilcayo?.type === "react" || fullstack;
  const changes: Change[] = [];
  const manifests: { root: string; value: Manifest }[] = [{ root, value: manifest }];
  const frontendRoot = fullstack ? path.join(root, "client") : root;
  const frontendManifest = fullstack ? await manifestAt(frontendRoot) : manifest;
  if (fullstack) manifests.push({ root: frontendRoot, value: frontendManifest });
  let writeEnv: (() => Promise<void>) | undefined;
  if (command === "add:auth") {
    if (frontend) await planFrontendAuth(frontendRoot, frontendManifest, changes);
    if (!frontend || fullstack) {
      const backendRoot = fullstack ? path.join(root, "api") : root;
      const backendManifest = fullstack ? await manifestAt(backendRoot) : manifest;
      if (fullstack) manifests.push({ root: backendRoot, value: backendManifest });
      writeEnv = await planBackendAuth(backendRoot, backendManifest, changes);
    }
    manifest.tilcayo = { ...manifest.tilcayo, auth: true };
  } else {
    if (!frontend) throw new Error("Admin requires a React or full-stack app.");
    if (!frontendManifest.tilcayo?.auth || await readSource(frontendRoot, "app", "auth.ts") === undefined) throw new Error("Admin requires authentication. Run tilcayo add:auth first.");
    await planFiles(frontendRoot, adminFiles(), changes);
    const routes = await readSource(frontendRoot, "", "routes.tsx");
    if (!routes) throw new Error("Missing src/routes.tsx");
    if (/path:\s*['"]\/admin['"]/.test(routes)) throw new Error("An /admin route already exists. Remove the placeholder or integrate @tilcayo/admin into it explicitly.");
    changes.push({ target: path.join(frontendRoot, "src/routes.tsx"), source: insertRoutes(routes, "adminRoutes", "./features/admin/admin.routes", false), create: false });
    await addDependencies(frontendManifest, frontendRoot, ["admin", "ui", "styles"]);
    frontendManifest.tilcayo = { ...frontendManifest.tilcayo, admin: true };
    manifest.tilcayo = { ...manifest.tilcayo, admin: true };
  }
  // All source collisions and integration points have passed before writing.
  const messages: string[] = [];
  for (const change of changes) {
    if (change.create) {
      const sourceRoot = change.target.startsWith(frontendRoot + path.sep) ? frontendRoot : fullstack ? path.join(root, "api") : root;
      const relative = path.relative(path.join(sourceRoot, "src"), change.target);
      await writeSource(sourceRoot, path.dirname(relative), path.basename(relative), change.source);
    } else await writeFile(change.target, change.source);
    messages.push(`${change.create ? "Created" : "Updated"} ${path.relative(root, change.target).split(path.sep).join("/")}`);
  }
  await writeEnv?.();
  if (writeEnv) {
    const prefix = fullstack ? "api/" : "";
    messages.push(`Updated ${prefix}.env, ${prefix}.env.example and ${prefix}.gitignore (existing secrets preserved)`);
  }
  for (const item of manifests) {
    await writeFile(path.join(item.root, "package.json"), json(item.value));
    messages.push(`Updated ${path.relative(root, path.join(item.root, "package.json"))}`);
  }
  return [...messages, "Run your package manager install, then build. No dependencies were installed automatically.",
    ...(command === "add:auth" ? ["Auth routes are registered. Add login/profile links to your navigation. Set the public VITE_API_URL when connecting a separate API; never put auth secrets in VITE_* variables.", "Backend auth requires a MongoDB startup connection. Configure .env before running the API."] : ["Admin routes are registered under /admin. Assign admin roles through trusted server code and authorize backend resource routes."])];
}
