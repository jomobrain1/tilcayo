import { randomBytes } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

const keys = ["AUTH_ACCESS_SECRET", "AUTH_REFRESH_SECRET"] as const;

async function readRegularFile(target: string): Promise<string | undefined> {
  try {
    const stat = await lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a regular file: ${path.basename(target)}`);
    return await readFile(target, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

function authSettings(source: string, example: boolean): string {
  const values = parseEnv(source);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const missing: string[] = [];
  for (const key of keys) {
    // Match quoted multiline values too, without consuming adjacent settings.
    const assignment = new RegExp(`^([ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=[ \\t]*)(?:"[^"]*"|'[^']*'|\`[^\`]*\`|[^#\\r\\n]*)([ \\t]*(?:#[^\\r\\n]*)?)`, "gm");
    if (!example && values[key]) continue;
    const value = example ? "" : randomBytes(32).toString("hex");
    if (assignment.test(source)) {
      source = source.replace(assignment, (_match, prefix: string, comment: string) => `${prefix}${value}${comment ? " " + comment.trimStart() : ""}`);
    } else missing.push(`${key}=${value}`);
  }
  if (missing.length) {
    source += `${source && !source.endsWith("\n") ? newline : ""}${source ? newline : ""}# Authentication${example ? " - generated in .env by tilcayo make:auth" : " - keep these secrets private"}${newline}${missing.join(newline)}${newline}`;
  }
  return source;
}

// Prepare every environment change before the command writes scaffold files.
export async function prepareAuthEnv(root: string): Promise<() => Promise<void>> {
  const files: { target: string; previous: string | undefined; source: string; name: string }[] = [];
  for (const name of [".env", ".env.example", ".gitignore"]) {
    const target = path.join(root, name);
    const previous = await readRegularFile(target);
    let source = previous ?? "";
    if (name === ".gitignore") {
      const newline = source.includes("\r\n") ? "\r\n" : "\n";
      const rules = [".env", ".env.*", "!.env.example"];
      if (rules.some((rule) => !source.split(/\r?\n/).includes(rule))) {
        source += `${source && !source.endsWith("\n") ? newline : ""}${newline}# Local environment${newline}${rules.join(newline)}${newline}`;
      }
    } else source = authSettings(source, name === ".env.example");
    files.push({ target, previous, source, name });
  }
  return async () => {
    for (const file of files) {
      if (file.source === file.previous) continue;
      await writeFile(file.target, file.source, {
        encoding: "utf8", flag: file.previous === undefined ? "wx" : "w",
        ...(file.name === ".env" ? { mode: 0o600 } : {}),
      });
    }
  };
}
