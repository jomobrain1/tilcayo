import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resourceNames } from "../packages/cli/dist/utils/naming.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const binary = path.join(repo, "packages/cli/dist/bin.js");
const compiler = path.join(repo, "node_modules/typescript/bin/tsc");

async function fixture(t) {
  const directory = await mkdtemp(path.join(repo, ".generator-test-"));
  t.after(async () => {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(repo));
    assert.ok(path.basename(resolved).startsWith(".generator-test-"));
    await rm(resolved, { recursive: true, force: true });
  });
  await writeFile(path.join(directory, "package.json"), JSON.stringify({ name: "generator-fixture", type: "module", private: true }));
  await writeFile(path.join(directory, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, skipLibCheck: true, noEmit: true, types: ["node"] },
    include: ["src/**/*.ts"],
  }));
  return directory;
}

function run(cwd, ...args) {
  const result = spawnSync(process.execPath, [binary, ...args], { cwd, encoding: "utf8", windowsHide: true });
  assert.ifError(result.error);
  return result;
}

function success(cwd, ...args) {
  const result = run(cwd, ...args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function compile(cwd) {
  const result = spawnSync(process.execPath, [compiler, "-p", "tsconfig.json"], { cwd, encoding: "utf8", windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

test("naming supports singular, plural, PascalCase and categories", () => {
  for (const input of ["Book", "book", "books"]) assert.deepEqual(resourceNames(input), {
    model: "Book", singular: "book", plural: "books", pluralPascal: "Books",
  });
  for (const [input, singular, plural] of [["Product", "product", "products"], ["User", "user", "users"], ["Category", "category", "categories"], ["categories", "category", "categories"], ["Box", "box", "boxes"]]) {
    assert.equal(resourceNames(input).singular, singular);
    assert.equal(resourceNames(input).plural, plural);
  }
  for (const name of ["../Book", "..\\Book", "/Book", "Book.ts", "a/b", "a\\b", "", "1book", "con"]) assert.throws(() => resourceNames(name));
});

test("all individual generators produce compilable explicit-style files and protect collisions", async (t) => {
  const cwd = await fixture(t);
  for (const [command, name, file] of [
    ["model", "Book", "models/Book.ts"],
    ["controller", "books", "controllers/books.controller.ts"],
    ["validator", "books", "validators/books.validator.ts"],
    ["route", "books", "routes/books.routes.ts"],
    ["service", "books", "services/books.service.ts"],
  ]) {
    assert.match(success(cwd, `make:${command}`, name), new RegExp(`Created src/${file.replaceAll(".", "\\.")}`));
    const target = path.join(cwd, "src", file);
    const original = await readFile(target, "utf8");
    const duplicate = run(cwd, `make:${command}`, name);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /already exists/);
    assert.equal(await readFile(target, "utf8"), original);
    assert.doesNotMatch(original, /\bclass\s|\brequire\(|from ["']express["']/);
  }
  const controller = await readFile(path.join(cwd, "src/controllers/books.controller.ts"), "utf8");
  for (const name of ["getBooks", "getBook", "createBook", "updateBook", "deleteBook"]) assert.match(controller, new RegExp(`export const ${name} = async`));
  const route = await readFile(path.join(cwd, "src/routes/books.routes.ts"), "utf8");
  assert.match(route, /controllers\/books\.controller\.js/);
  assert.match(route, /validators\/books\.validator\.js/);
  assert.match(route, /router.delete/);
  compile(cwd);
});

test("resource-mode controllers and routes compile together", async (t) => {
  const cwd = await fixture(t);
  success(cwd, "make:model", "Category");
  success(cwd, "make:controller", "categories", "--resource");
  success(cwd, "make:validator", "categories");
  success(cwd, "make:route", "categories", "--resource");
  const controller = await readFile(path.join(cwd, "src/controllers/categories.controller.ts"), "utf8");
  for (const action of ["index", "store", "show", "update", "destroy"]) assert.match(controller, new RegExp(`export const ${action} = async`));
  const route = await readFile(path.join(cwd, "src/routes/categories.routes.ts"), "utf8");
  assert.match(route, /import \* as CategoryController/);
  assert.match(route, /router.resource/);
  compile(cwd);
});

test("standalone routes compile without nonexistent imports in either mode", async (t) => {
  const cwd = await fixture(t);
  assert.match(success(cwd, "make:route", "books"), /Inline placeholder handlers/);
  assert.match(success(cwd, "make:route", "products", "--resource"), /app.routes\(productRoutes\)/);
  compile(cwd);
});

test("invalid commands, flags, styles and paths fail before writing files", async (t) => {
  const cwd = await fixture(t);
  for (const args of [["make:resource", "Book"], ["make:model"], ["make:model", "../Book"], ["make:model", "Book", "--resource"], ["make:controller", "books", "--force"]]) {
    assert.notEqual(run(cwd, ...args).status, 0);
  }
  assert.ok(!(await readdir(cwd)).includes("src"));
  success(cwd, "make:controller", "books", "--resource");
  const mismatch = run(cwd, "make:route", "books");
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /must export getBooks/);
  assert.match(success(cwd, "--help"), /make:service/);
});

test("source directory links cannot escape the application", async (t) => {
  const cwd = await fixture(t);
  const outside = await fixture(t);
  await symlink(outside, path.join(cwd, "src"), process.platform === "win32" ? "junction" : "dir");
  const result = run(cwd, "make:model", "Book");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /regular directory/);
  assert.ok(!(await readdir(outside)).includes("models"));
});
