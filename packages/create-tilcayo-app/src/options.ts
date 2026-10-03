export interface StarterOptions {
  name: string;
  packageManager: "npm" | "pnpm" | "yarn";
  type: "api" | "minimal";
  auth: boolean;
  install: boolean;
}

export const help = `Usage: create-tilcayo-app [project-name] [options]

  --package-manager npm|pnpm|yarn
  --type api|minimal      MongoDB CRUD API or minimal health-check API
  --auth / --no-auth      Include JWT authentication (requires MongoDB)
  --no-install           Generate files without installing dependencies
  --yes                  Use defaults for unanswered choices
  --help                 Show this help

Defaults: my-api, npm, api, no authentication, install dependencies.
Interactive terminals prompt for missing choices. Automation uses defaults.
Existing directories are never overwritten.`;

export function validateOptions(options: StarterOptions): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(options.name) || options.name.length > 214 || ["node_modules", "con", "prn", "aux", "nul"].includes(options.name) || /^(com|lpt)[0-9]$/.test(options.name)) {
    throw new Error("Use a project name containing lowercase letters, numbers, and hyphens (not a path or reserved system name).");
  }
  if (!["npm", "pnpm", "yarn"].includes(options.packageManager)) throw new Error("Package manager must be npm, pnpm, or yarn.");
  if (!["api", "minimal"].includes(options.type)) throw new Error("Application type must be api or minimal.");
  if (typeof options.auth !== "boolean" || typeof options.install !== "boolean") throw new Error("Authentication and install choices must be booleans.");
}

export function parseOptions(args: string[]): { options: StarterOptions; missing: Set<string>; yes: boolean } {
  const options: StarterOptions = { name: "my-api", packageManager: "npm", type: "api", auth: false, install: true };
  const missing = new Set(["name", "packageManager", "type", "auth"]);
  const seen = new Set<string>();
  let yes = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("-")) {
      if (!missing.has("name")) throw new Error("Provide only one project name.");
      options.name = arg;
      missing.delete("name");
      continue;
    }
    const key = arg === "--no-auth" ? "--auth" : arg;
    if (seen.has(key)) throw new Error(`Duplicate or conflicting option: ${arg}`);
    seen.add(key);
    if (arg === "--yes" || arg === "-y") { yes = true; continue; }
    if (arg === "--no-install") { options.install = false; continue; }
    if (arg === "--auth" || arg === "--no-auth") {
      options.auth = arg === "--auth";
      missing.delete("auth");
      continue;
    }
    if (arg === "--package-manager" || arg === "--type") {
      const value = args[++i];
      if (!value || value.startsWith("-")) throw new Error(`Missing value for ${arg}.`);
      if (arg === "--package-manager") {
        options.packageManager = value as StarterOptions["packageManager"];
        missing.delete("packageManager");
      } else {
        options.type = value as StarterOptions["type"];
        missing.delete("type");
      }
      continue;
    }
    throw new Error(`Unknown option: ${arg}. Run create-tilcayo-app --help.`);
  }
  validateOptions(options);
  return { options, missing, yes };
}
