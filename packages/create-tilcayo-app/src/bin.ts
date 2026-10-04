#!/usr/bin/env node
import { stdin, stdout } from "node:process";
import { cancel, intro, isCancel, select, text } from "@clack/prompts";
import color from "picocolors";
import { generateApp, installApp } from "./index.js";
import { help, parseOptions, validateOptions } from "./options.js";

function answer<T>(value: T): Exclude<T, symbol> {
  if (isCancel(value)) {
    cancel("Setup cancelled. No files were created.");
    process.exit(130);
  }
  return value as Exclude<T, symbol>;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) { console.log(help); return; }
  const { options, missing, yes } = parseOptions(args);
  if (!yes && stdin.isTTY && stdout.isTTY) {
    intro(color.bgCyan(color.black(" Create Tilcayo App ")));
    if (missing.has("name")) options.name = answer(await text({
      message: "Project name",
      placeholder: options.name,
      defaultValue: options.name,
      validate(value) {
        try { validateOptions({ ...options, name: value?.trim() || options.name }); }
        catch (error) { return error instanceof Error ? error.message : "Invalid project name."; }
      },
    })).trim();
    if (missing.has("packageManager")) options.packageManager = answer(await select({
      message: "Package manager (use arrow keys, Enter to select)",
      initialValue: options.packageManager,
      options: [
        { value: "npm" as const, label: color.red("npm") },
        { value: "pnpm" as const, label: color.yellow("pnpm") },
        { value: "yarn" as const, label: color.cyan("yarn") },
      ],
    }));
    if (missing.has("type")) options.type = answer(await select({
      message: "Application type",
      initialValue: options.type,
      options: [
        { value: "api" as const, label: color.green("API"), hint: "MongoDB with sample CRUD routes" },
        { value: "minimal" as const, label: color.magenta("Minimal"), hint: "Health-check endpoint only" },
        { value: "react" as const, label: color.cyan("React"), hint: "React client with Tilcayo styles and responsive navigation" },
      ],
    }));
    if (missing.has("auth") && options.type !== "react") options.auth = answer(await select({
      message: "Include authentication?",
      initialValue: options.auth,
      options: [
        { value: true, label: color.green("Yes"), hint: "Register, login, refresh and logout; requires MongoDB" },
        { value: false, label: color.yellow("No"), hint: "Start without authentication" },
      ],
    }));
  }
  validateOptions(options);
  const target = await generateApp(options);
  console.log(`Created ${target}`);
  if (options.install) {
    console.log(`Installing dependencies with ${options.packageManager} and building the application...`);
    await installApp(target, options.packageManager);
  }
  console.log(`\nNext:\n  cd ${options.name}`);
  if (!options.install) console.log(`  ${options.packageManager} install`);
  const cli = options.packageManager === "npm" ? "npx tilcayo" : `${options.packageManager} exec tilcayo`;
  if (options.type === "react") console.log(`  ${options.packageManager} run dev`);
  else console.log(`  ${cli} dev\n\nWith Tilcayo on PATH, use tilcayo dev directly.`);
  if (options.type === "api" || options.auth) console.log("Start MongoDB or update MONGODB_URI in .env before starting the API.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to create application.");
  process.exitCode = 1;
});
