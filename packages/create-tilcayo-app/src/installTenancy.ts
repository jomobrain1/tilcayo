import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

/** Applied only after generating a full-stack auth/admin app. Also used for explicit upgrades. */
export async function installTenancy(root: string) {
  const edit = async (relative: string, update: (source: string) => string) => {
    const file = path.join(root, relative); await writeFile(file, update(await readFile(file, 'utf8')));
  };
  for (const part of ['', 'api', 'client']) await edit(path.join(part, 'package.json'), source => {
    const pkg = JSON.parse(source); pkg.tilcayo = { ...pkg.tilcayo, tenancy: true };
    if (part === 'api') pkg.scripts['tenancy:setup'] = 'node --env-file-if-exists=.env dist/scripts/setup-tenancy.js';
    if (!part) pkg.scripts['tenancy:setup'] = 'npm run build --workspace api && npm run tenancy:setup --workspace api';
    return JSON.stringify(pkg, null, 2) + '\n';
  });
  await edit('api/src/auth.ts', source => source.includes('tenancy:') ? source : source.replace('createAuth({', 'createAuth({\n  tenancy: { baseDomain: process.env.TENANCY_BASE_DOMAIN || "localhost" },'));
  await edit('api/src/app.ts', source => {
    if (source.includes('auth.tenantMiddleware')) return source;
    return source.replace('middleware: [', 'middleware: [auth.tenantMiddleware, auth.tenantAccessMiddleware, ').replace('app.routes(auth.adminRoutes);', 'app.routes(auth.adminRoutes);\napp.routes(auth.tenancyRoutes);');
  });
  const models: string[] = [];
  for (const filename of await readdir(path.join(root, 'api/src/models'))) {
    if (!filename.endsWith('.ts')) continue;
    await edit('api/src/models/' + filename, source => {
      if (!source.includes('mongoModel(')) return source;
      models.push(filename.slice(0, -3));
      return source.includes('tenantScoped: true') ? source : source.replace(/mongoModel\((['"][^'"]+['"]),\s*(\w+)\)/g, (match, name: string, schema: string) => schema === 'platformSchema' ? match : 'mongoModel(' + name + ', ' + schema + ', { tenantScoped: true })');
    });
  }
  await edit('client/vite.config.ts', source => source.includes('allowedHosts:') ? source : source.replace('server: {', "server: { host: '127.0.0.1', allowedHosts: ['.localhost'],"));
  await edit('client/src/components/navigation.tsx', source => {
    let text = source.replaceAll('WorkspaceSwitcher', 'WorkspaceIdentity');
    if (!text.includes('<WorkspaceIdentity')) text = "import { WorkspaceIdentity } from '../features/tenancy/workspace-switcher';\n" + text.replace('<NavLink to="/dashboard"', '<WorkspaceIdentity />\n        <NavLink to="/dashboard"');
    return text;
  });
  await edit('client/src/components/session-skeleton.tsx', source => source.includes('useGetWorkspaceQuery') ? source : "import { useGetWorkspaceQuery } from '../features/tenancy/tenancy.api';\n" + source.replace('  const { pathname }', '  useGetWorkspaceQuery();\n  const { pathname }'));
  await edit('client/src/layouts/auth-layout.tsx', source => source.includes('<WorkspaceIdentity') ? source : "import { WorkspaceIdentity } from '../features/tenancy/workspace-switcher';\n" + source.replace('<BrandMark />Tilcayo</Link></div>', '<BrandMark />Tilcayo</Link><WorkspaceIdentity /></div>'));
  await edit('client/src/layouts/app-layout.tsx', source => source.includes('<WorkspaceGate>') ? source : "import { WorkspaceGate } from '../features/tenancy/workspace-switcher';\n" + source.replace('<Outlet />', '<WorkspaceGate><Outlet /></WorkspaceGate>'));
  await edit('client/src/features/admin/admin-layout.tsx', source => {
    let text = source.includes('WorkspaceGate') ? source.replaceAll('WorkspaceSwitcher', 'WorkspaceIdentity').replace('{ WorkspaceGate }', '{ WorkspaceGate, WorkspaceIdentity }') : "import { WorkspaceGate, WorkspaceIdentity } from '../tenancy/workspace-switcher';\n" + source;
    text = text.replace("import { useLocation } from 'react-router';", "import { Outlet, useLocation } from 'react-router';");
    if (!text.includes('<WorkspaceGate>')) text = text.replace('sections={sections.filter(section => can(section.tab))} />;', 'sections={sections.filter(section => can(section.tab))}><WorkspaceGate><Outlet /></WorkspaceGate></AdminLayout>;');
    return text.includes('accountContent=') ? text : text.replace('<AdminLayout user={user}', '<AdminLayout accountContent={<WorkspaceIdentity />} user={user}');
  });
  // Demo writes must explicitly enter the selected workspace, never the platform.
  const demoFile = 'api/src/scripts/seed-admin-demo.ts';
  try { await edit(demoFile, source => source.includes('runInTenantScope') ? source : "import { Tenant } from '@tilcayo/auth';\nimport { runInTenantScope } from '@tilcayo/core';\n" + source.replace('  try {', "  try {\n  const slug = process.env.TENANCY_SEED_SLUG;\n  if (!slug) throw new Error('Set TENANCY_SEED_SLUG to a tenant created in Tenant administration.');\n  const tenant = await Tenant.firstOrFail({ slug });\n  await runInTenantScope({ enabled: true, tenantId: String(tenant._id) }, async () => {").replace('  } finally {', '  }); } finally {')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await mkdir(path.join(root, 'api/src/scripts'), { recursive: true });
  await writeFile(path.join(root, 'api/src/scripts/setup-tenancy.ts'), `import { connectMongo, disconnectMongo } from '@tilcayo/core';
import { bootstrapTenancy } from '@tilcayo/auth';
${models.map(name => `import { ${name} } from '../models/${name}.js';`).join('\n')}

async function main() {
  const email = process.env.TENANCY_SUPERADMIN_EMAIL;
  const password = process.env.TENANCY_SUPERADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set TENANCY_SUPERADMIN_EMAIL and TENANCY_SUPERADMIN_PASSWORD for this setup command.');
  await connectMongo(process.env.MONGODB_URI || '', { serverSelectionTimeoutMS: 10000, autoIndex: false });
  try {
    await bootstrapTenancy({ email, password });
    // Setup does not create a tenant or change ownership of existing records.
    // Driver access is limited to this offline setup command, not request handlers.
    for (const model of [${models.join(', ')}]) {
      const indexes = await model.raw.collection.indexes().catch(error => { if (error.code === 26) return []; throw error; });
      for (const index of indexes) if (index.unique && index.name === 'sku_1' && Object.keys(index.key).length === 1) await model.raw.collection.dropIndex(index.name!);
      await model.raw.createIndexes();
    }
    console.log('Super Admin ready. Create tenants and assign administrators in Tenant administration on the main domain.');
  } finally { await disconnectMongo(); }
}
main().catch(() => { console.error('Tenancy setup failed. Check bootstrap inputs, MongoDB connectivity and workspace conflicts.'); process.exitCode = 1; });
`);
}
