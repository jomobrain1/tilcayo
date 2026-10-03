import { randomBytes } from "node:crypto";
import type { StarterOptions } from "./options.js";

export function templates(options: StarterOptions, localPackages: Record<string, string> = {}): Record<string, string> {
  const mongo = options.type === "api" || options.auth;
  const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
  const env = `# Server\nPORT=9149\n${mongo ? `\n# Database\nMONGODB_URI=mongodb://127.0.0.1:27017/${options.name.replaceAll("-", "_")}\n` : ""}`;
  return {
    "package.json": json({
      name: options.name, version: "0.0.1", private: true, type: "module",
      engines: { node: ">=22.9.0" },
      tilcayo: { database: mongo ? "mongo" : "none", type: options.type, packageManager: options.packageManager },
      scripts: { dev: "tilcayo dev", build: "tilcayo build", start: "tilcayo start", routes: "tilcayo routes:list" },
      dependencies: { "@tilcayo/core": localPackages.core ?? "^0.0.1", ...(options.auth ? { "@tilcayo/auth": localPackages.auth ?? "^0.0.1" } : {}), ...(mongo ? { mongoose: localPackages.mongoose ?? "^9.10.2" } : {}), zod: localPackages.zod ?? "^4.0.0" },
      devDependencies: { "@tilcayo/cli": localPackages.cli ?? "^0.0.1", "@types/node": "^26.6.3", typescript: "^7.0.2", nodemon: "^3.1.14" },
    }),
    "tsconfig.json": json({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, esModuleInterop: true, skipLibCheck: true, forceConsistentCasingInFileNames: true, rootDir: "src", outDir: "dist", types: ["node"] }, include: ["src/**/*.ts"] }),
    ".gitignore": "node_modules/\ndist/\n.env\n.env.*\n!.env.example\n*.log\n.DS_Store\n",
    ".env.example": env + (options.auth ? "\n# Authentication - use private values from .env\nAUTH_ACCESS_SECRET=\nAUTH_REFRESH_SECRET=\n" : ""),
    ".env": env + (options.auth ? `\n# Authentication - keep these secrets private\nAUTH_ACCESS_SECRET=${randomBytes(32).toString("hex")}\nAUTH_REFRESH_SECRET=${randomBytes(32).toString("hex")}\n` : ""),
    ...(options.packageManager === "yarn" ? { ".yarnrc.yml": "nodeLinker: node-modules\n" } : {}),
    "src/config.ts": `const port = Number(process.env.PORT ?? 9149);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be an integer between 0 and 65535.");

export const config = {
  port,
${mongo ? '  mongoUri: process.env.MONGODB_URI ?? "",\n' : ""}};
`,
    "src/app.ts": `import { createApp, requestId, securityHeaders } from "@tilcayo/core";
import healthRoutes from "./routes/health.routes.js";
${options.type === "api" ? 'import notesRoutes from "./routes/notes.routes.js";\n' : ""}${options.auth ? 'import authRoutes from "./routes/auth.routes.js";\n' : ""}
const app = createApp({ middleware: [requestId(), securityHeaders()] });
app.routes(healthRoutes);
${options.type === "api" ? "app.routes(notesRoutes);\n" : ""}${options.auth ? "app.routes(authRoutes);\n" : ""}
export default app;
`,
    "src/index.ts": `${mongo ? 'import { connectMongo, disconnectMongo } from "@tilcayo/core";\n' : ""}
async function main() {
  const { config } = await import("./config.js");
  const { default: app } = await import("./app.js");
${mongo ? "  await connectMongo(config.mongoUri);\n" : ""}  const server = app.listen(config.port);
  const shutdown = () => {
    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    server.close(() => {
${mongo ? "      void disconnectMongo().then(() => process.exit(0), () => process.exit(1));" : "      process.exit(0);"}
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch(() => {
  console.error("Unable to start the API. Check .env configuration${mongo ? ", MongoDB connectivity" : ""}${options.auth ? ", and distinct auth secrets of at least 32 bytes each" : ""}.");
  process.exitCode = 1;
});
`,
    "src/controllers/health.controller.ts": `import type { TilcayoContext } from "@tilcayo/core";

export const health = (ctx: TilcayoContext) => ctx.response.success({ status: "ok" });
`,
    "src/routes/health.routes.ts": `import { defineRoutes } from "@tilcayo/core";
import { health } from "../controllers/health.controller.js";

export default defineRoutes((router) => {
  router.get("/health", health);
});
`,
    "src/models/.gitkeep": "",
    "src/services/.gitkeep": "",
    "src/validators/.gitkeep": "",
    "README.md": `# ${options.name}

Tilcayo ${options.type === "api" ? "MongoDB CRUD" : "minimal"} API${options.auth ? " with JWT authentication" : ""}.
${Object.keys(localPackages).length ? "\nTilcayo dependencies link to your local framework checkout. Keep that checkout available and rebuild its packages after framework changes. Replace these links with published versions before moving or sharing this application.\n" : ""}

Use Node.js 22.9+ and ${options.packageManager}. A local .env has been created${options.auth ? " with distinct random auth secrets" : ""}. Keep it private; .env.example contains shareable settings.
${mongo ? "\nStart MongoDB locally or set MONGODB_URI in .env to your connection string.\n" : ""}
Install dependencies if you skipped setup:

\`\`\`sh
${options.packageManager} install
\`\`\`

With the Tilcayo CLI on PATH:

\`\`\`sh
tilcayo dev
tilcayo build
tilcayo start
tilcayo routes:list
\`\`\`

If the CLI is only installed locally, use ${options.packageManager === "npm" ? "npx tilcayo" : `${options.packageManager} exec tilcayo`} with the same commands. Package scripts also expose dev, build, start, and routes.

GET /health returns the application status. The default port is 9149.
${options.type === "api" ? "\nThe /notes resource includes GET, POST, GET /:id, PUT /:id, and DELETE /:id. Create a note with JSON {\"title\":\"First note\",\"content\":\"Hello\"}. These sample routes are public.\n" : ""}${options.auth ? "\nAuth routes: POST /api/auth/register, /login, /refresh, /logout; GET /api/auth/me. Register with name, email, and password. Send the access token as Authorization: Bearer <token>. Protect other routes with auth.middleware.\n" : ""}
Register generated routes in src/app.ts. Database connection and server startup live in src/index.ts. Rebuild after changing routes before using routes:list. ${!mongo ? "To add MongoDB resources or auth later, set tilcayo.database to mongo, add the required packages and environment keys, and connect MongoDB in src/index.ts." : ""}
`,
  };
}
