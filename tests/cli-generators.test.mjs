import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { once } from "node:events";
import mongoose from "mongoose";
import { createApp } from "../packages/core/dist/index.js";
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

test("model fields generate a simple schema with inferred TypeScript types", async (t) => {
  const cwd = await fixture(t);
  success(cwd, "make:model", "Customer", "--fields", "name:string, email:string,age:number,active:boolean,birthday:date");
  const target = path.join(cwd, "src/models/Customer.ts");
  const source = await readFile(target, "utf8");
  assert.doesNotMatch(source, /InferSchemaType|modelNames|CustomerDocument/);
  await writeFile(path.join(cwd, "src/check.ts"), `import { Customer } from "./models/Customer.js";
const customer = new Customer.raw();
const name: string | null | undefined = customer.name;
const email: string | null | undefined = customer.email;
const age: number | null | undefined = customer.age;
const active: boolean | null | undefined = customer.active;
const birthday: Date | null | undefined = customer.birthday;
// @ts-expect-error Number fields cannot be assigned strings.
customer.age = "wrong";
`);
  compile(cwd);
  assert.notEqual(run(cwd, "make:model", "Customer", "--fields", "other:string").status, 0);
  assert.equal(await readFile(target, "utf8"), source);
});

test("invalid field options fail without creating files", async (t) => {
  const cwd = await fixture(t);
  for (const value of ["", "name", "name:unknown", "name:string,", "name:string,name:number", "../name:string", "name:string:extra", "__proto__:string", "constructor:string", "createdAt:date"]) {
    assert.notEqual(run(cwd, "make:model", "Customer", "--fields", value).status, 0, value);
  }
  for (const args of [
    ["make:model", "Customer", "--fields"],
    ["make:model", "Customer", "--fields", "name:string", "--fields", "age:number"],
    ["make:model", "Customer", "--fields", "name:string", "--resource"],
    ["make:controller", "customers", "--fields", "name:unknown"],
    ["make:controller", "customers", "--fields", "name:string,name?:string"],
    ["make:route", "customers", "--fields", "name:string"],
  ]) assert.notEqual(run(cwd, ...args).status, 0);
  assert.ok(!(await readdir(cwd)).includes("src"));
});

test("resource-mode controllers and routes compile together", async (t) => {
  const cwd = await fixture(t);
  success(cwd, "make:model", "Category");
  success(cwd, "make:controller", "categories", "--resource");
  success(cwd, "make:validator", "categories");
  success(cwd, "make:route", "categories");
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

test("Mongo models and CRUD controllers compile with both naming styles and retain field types", async (t) => {
  const cwd = await fixture(t);
  for (const [model, name, flags] of [["Book", "books", ["--resource"]], ["Member", "members", []]]) {
    success(cwd, "make:model", model, "--fields", "title:string,year:number", "--mongo");
    const modelSource = await readFile(path.join(cwd, `src/models/${model}.ts`), "utf8");
    assert.ok(modelSource.includes(`mongoModel("${model}",`));
    assert.doesNotMatch(modelSource, /mongoose\.model\(/);
    success(cwd, "make:controller", name, "--crud", "--mongo", "--fields", "title?:string,year?:number", ...flags);
    success(cwd, "make:validator", name);
    success(cwd, "make:route", name, ...flags);
    const controller = await readFile(path.join(cwd, `src/controllers/${name}.controller.ts`), "utf8");
    assert.match(controller, /\.all\(\)/);
    assert.doesNotMatch(controller, /paginationParams/);
    for (const method of ["create", "findOrFail", "update", "delete"]) assert.ok(controller.includes(`${model}.${method}(`));
    assert.doesNotMatch(controller, /findById|findByIdAndUpdate|\bany\b|z\.infer|Parameters<|ctx\.body as/);
    assert.match(controller, /title\?: string;/);
    assert.match(controller, /year\?: number;/);
    assert.ok(controller.includes(`TilcayoContext<Create${model}Body>`));
  }
  await writeFile(path.join(cwd, "src/check.ts"), `import { Book } from "./models/Book.js";
Book.create({ title: "Hello", year: 2020 });
Book.update("1234567890abcdef12345678", { year: 2021 });
// @ts-expect-error Wrong field type.
Book.create({ year: "wrong" });
// @ts-expect-error Unknown field.
Book.update("1234567890abcdef12345678", { unknown: true });
const record = await Book.findOrFail("1234567890abcdef12345678");
const title: string | null | undefined = record.title;
// @ts-expect-error Returned fields must retain their types.
const wrong: number = record.title;
const page = await Book.paginate({ page: 1, perPage: 10 });
const query: Record<string, unknown> = { page: "1", perPage: "10" };
await Book.paginate(query);
const year: number | null | undefined = page.items[0]?.year;
Book.raw.findById("1234567890abcdef12345678");
`);
  compile(cwd);
});

test("Mongo generator options reject missing adapters, invalid combinations and unwrapped models", async (t) => {
  const cwd = await fixture(t);
  for (const args of [
    ["make:controller", "books", "--crud"],
    ["make:controller", "books", "--mongo"],
    ["make:model", "Book", "--crud", "--mongo"],
    ["make:model", "Book", "--mongo", "--mongo"],
    ["make:route", "books", "--mongo"],
    ["make:model", "Book", "--mysql"],
  ]) assert.notEqual(run(cwd, ...args).status, 0);
  assert.ok(!(await readdir(cwd)).includes("src"));
  success(cwd, "make:model", "Book");
  await writeFile(path.join(cwd, "src/models/Book.ts"), "export const Book = {};\n");
  const result = run(cwd, "make:controller", "books", "--crud", "--mongo");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /use mongoModel/);
});

test("typed bodies work across route methods and reject incompatible validators", async (t) => {
  const cwd = await fixture(t);
  success(cwd, "make:controller", "profiles", "--fields", "name:string,age?:number,active:boolean,birthday:date");
  const controller = await readFile(path.join(cwd, "src/controllers/profiles.controller.ts"), "utf8");
  assert.match(controller, /birthday: Date;/);
  assert.match(controller, /age\?: number;/);
  assert.doesNotMatch(controller, /\bas\b|\bany\b|infer/);
  await writeFile(path.join(cwd, "src/typed-routes.ts"), `import { createRouter, type TilcayoContext, type RouteHandler, type ResourceController } from "@tilcayo/core";
import { z } from "zod";
type CreateBody = { title: string; year?: number };
type UpdateBody = Partial<CreateBody>;
const store: RouteHandler<CreateBody> = (ctx) => ctx.body.title.toUpperCase();
const update = (ctx: TilcayoContext<UpdateBody>) => ctx.body.title?.toUpperCase();
const empty = (ctx: TilcayoContext) => ctx.response.noContent();
const controller: ResourceController<CreateBody, UpdateBody> = { index: empty, show: empty, store, update, destroy: empty };
const schema = z.object({ title: z.string(), year: z.number().optional() });
const router = createRouter();
router.get("/", store, { validate: { body: schema } });
router.post("/", store, { validate: { body: schema } });
router.put("/", update, { validate: { body: schema.partial() } });
router.patch("/", update, { validate: { body: schema.partial() } });
router.delete("/", store, { validate: { body: schema } });
router.resource("/books", controller, { store: { validate: { body: schema } }, update: { validate: { body: schema.partial() } } });
// @ts-expect-error The schema produces a number, not a string title.
router.post("/wrong", store, { validate: { body: z.object({ title: z.number() }) } });
// @ts-expect-error Required body fields cannot be omitted by the validator.
router.post("/wrong", store, { validate: { body: schema.partial() } });
// @ts-expect-error Resource routes must check body schemas too.
router.resource("/wrong", controller, { store: { validate: { body: z.object({ title: z.number() }) } } });
const check = (ctx: TilcayoContext<CreateBody>) => {
  // @ts-expect-error Plain body types reject wrong property types.
  ctx.body.title = 123;
};
const untyped = (ctx: TilcayoContext) => {
  // @ts-expect-error The default body must remain unknown.
  return ctx.body.title;
};
`);
  compile(cwd);
});

test("generated Mongo CRUD routes list all records and support optional pagination", async (t) => {
  const cwd = await fixture(t);
  success(cwd, "make:resource", "Novel", "title:string", "year?:number", "active?:boolean", "publishedAt?:date");
  const build = spawnSync(process.execPath, [compiler, "-p", "tsconfig.json", "--noEmit", "false", "--rootDir", "src", "--outDir", "dist"], { cwd, encoding: "utf8", windowsHide: true });
  assert.equal(build.status, 0, build.stdout + build.stderr);
  const { Novel } = await import(pathToFileURL(path.join(cwd, "dist/models/Novel.js")));
  const { default: routes } = await import(pathToFileURL(path.join(cwd, "dist/routes/novels.routes.js")));
  t.after(() => mongoose.deleteModel("Novel"));
  const id = "1234567890abcdef12345678";
  const records = new Map();
  t.mock.method(Novel.raw, "create", async (data) => {
    if (data.publishedAt) assert.ok(data.publishedAt instanceof Date);
    const document = new Novel.raw({ ...data, _id: id });
    await document.validate();
    const record = document.toObject();
    records.set(id, record);
    return record;
  });
  t.mock.method(Novel.raw.Query.prototype, "exec", async function () {
    const key = String(this.getFilter()._id);
    if (this.op === "find") return [...records.values()].slice(this.getOptions().skip ?? 0, (this.getOptions().skip ?? 0) + (this.getOptions().limit ?? records.size));
    if (this.op === "countDocuments") return records.size;
    const record = records.get(key) ?? null;
    if (this.op === "findOneAndUpdate" && record) {
      assert.equal(this.getOptions().runValidators, true);
      Object.assign(record, this.getUpdate().$set);
    }
    if (this.op === "findOneAndDelete") records.delete(key);
    return record;
  });
  const app = createApp().routes(routes);
  app.route.get("/paginated-novels", async (ctx) => ctx.response.success(await Novel.paginate(ctx.query)));
  const server = app.listen(0);
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  await once(server, "listening");
  async function request(method, path = "", body) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/novels${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }
  const created = await request("POST", "", { title: "Novel", active: false, publishedAt: "2025-01-01T00:00:00Z", ignored: "strip" });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.ignored, undefined);
  assert.equal(created.body.data.active, false);
  assert.equal(created.body.data.publishedAt, "2025-01-01T00:00:00.000Z");
  const listed = await request("GET", "?page=1&perPage=2");
  assert.equal(listed.body.data.length, 1);
  const paginated = await fetch(`http://127.0.0.1:${server.address().port}/paginated-novels?page=1&perPage=2`);
  const page = await paginated.json();
  assert.equal(page.data.items.length, 1);
  assert.equal(page.data.pagination.total, 1);
  assert.equal(page.data.pagination.perPage, 2);
  assert.equal((await request("GET", `/${id}`)).body.data.title, "Novel");
  assert.equal((await request("PUT", `/${id}`, { title: "Updated" })).body.data.title, "Updated");
  for (const body of [{}, { title: "" }, { title: "Novel", active: "false" }, { title: "Novel", year: "bad" }, { title: "Novel", publishedAt: true }]) {
    assert.equal((await request("POST", "", body)).status, 422);
  }
  assert.equal((await request("GET", "/bad-id")).status, 422);
  for (const query of ["page=bad", "page=1&page=2"]) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/paginated-novels?${query}`);
    assert.equal(response.status, 400);
    await response.text();
  }
  assert.equal((await request("DELETE", `/${id}`)).status, 204);
  for (const method of ["GET", "PUT", "DELETE"]) {
    assert.equal((await request(method, `/${id}`, method === "PUT" ? { title: "Missing" } : undefined)).status, 404);
  }
});

test("invalid commands, flags, styles and paths fail before writing files", async (t) => {
  const cwd = await fixture(t);
  for (const args of [["make:unknown", "Book"], ["make:model"], ["make:model", "../Book"], ["make:model", "Book", "--resource"], ["make:controller", "books", "--force"]]) {
    assert.notEqual(run(cwd, ...args).status, 0);
  }
  assert.ok(!(await readdir(cwd)).includes("src"));
  success(cwd, "make:controller", "books");
  const mismatch = run(cwd, "make:route", "books", "--resource");
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /must export index/);
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

test("resource command shares required and optional fields across all four files", async (t) => {
  const cwd = await fixture(t);
  const output = success(cwd, "make:resource", "Product", "name:string", "price:number", "active:boolean", "releasedAt?:date");
  assert.equal((output.match(/Created src\//g) ?? []).length, 4);
  assert.match(output, /import productRoutes from "\.\/routes\/products\.routes\.js"/);
  assert.match(output, /app.routes\(productRoutes\)/);
  const model = await readFile(path.join(cwd, "src/models/Product.ts"), "utf8");
  assert.match(model, /name: \{ type: String, required: true \}/);
  assert.match(model, /releasedAt: \{ type: Date \}/);
  const controller = await readFile(path.join(cwd, "src/controllers/products.controller.ts"), "utf8");
  assert.match(controller, /name: string;/);
  assert.match(controller, /releasedAt\?: Date;/);
  assert.match(controller, /Product.all\(\)/);
  const validator = await readFile(path.join(cwd, "src/validators/products.validator.ts"), "utf8");
  assert.match(validator, /name: z.string\(\).min\(1\)/);
  assert.match(validator, /active: z.boolean\(\)/);
  assert.match(validator, /\.pipe\(z.coerce.date\(\)\).optional\(\)/);
  const route = await readFile(path.join(cwd, "src/routes/products.routes.ts"), "utf8");
  assert.match(route, /router.resource\("\/products"/);
  compile(cwd);
});

test("resource preflight rejects every file collision and invalid fields without partial writes", async (t) => {
  for (const [folder, filename] of [["models", "Product.ts"], ["controllers", "products.controller.ts"], ["validators", "products.validator.ts"], ["routes", "products.routes.ts"]]) {
    const cwd = await fixture(t);
    await mkdir(path.join(cwd, "src", folder), { recursive: true });
    const target = path.join(cwd, "src", folder, filename);
    await writeFile(target, "existing content");
    assert.match(run(cwd, "make:resource", "Product", "name:string").stderr, /already exists/);
    assert.equal(await readFile(target, "utf8"), "existing content");
    assert.deepEqual(await readdir(path.join(cwd, "src")), [folder]);
  }
  const cwd = await fixture(t);
  for (const fields of [["name:string", "name?:number"], ["price:unknown"], ["../name:string"], ["name:string", "--fields", "price:number"]]) {
    assert.notEqual(run(cwd, "make:resource", "Product", ...fields).status, 0);
  }
  assert.ok(!(await readdir(cwd)).includes("src"));
  const outside = await fixture(t);
  await mkdir(path.join(cwd, "src"));
  await symlink(outside, path.join(cwd, "src/routes"), process.platform === "win32" ? "junction" : "dir");
  assert.match(run(cwd, "make:resource", "Product", "name:string").stderr, /regular directory/);
  assert.deepEqual(await readdir(path.join(cwd, "src")), ["routes"]);
});

test("database settings are checked and short individual commands work", async (t) => {
  const cwd = await fixture(t);
  const packagePath = path.join(cwd, "package.json");
  const config = JSON.parse(await readFile(packagePath, "utf8"));
  await writeFile(packagePath, JSON.stringify({ ...config, tilcayo: { database: "mysql" } }));
  assert.match(run(cwd, "make:resource", "Item", "name:string").stderr, /Unsupported database: mysql/);
  assert.ok(!(await readdir(cwd)).includes("src"));
  await writeFile(packagePath, JSON.stringify({ ...config, tilcayo: { database: "mongo" } }));
  success(cwd, "make:model", "Item", "name:string", "year?:number");
  success(cwd, "make:controller", "items", "--resource", "name:string", "year?:number");
  success(cwd, "make:validator", "items", "name:string", "year?:number");
  success(cwd, "make:route", "items");
  success(cwd, "make:service", "items");
  assert.match(await readFile(path.join(cwd, "src/controllers/items.controller.ts"), "utf8"), /Item.create\(ctx.body\)/);
  compile(cwd);
});

test("mongodb flag selects MongoDB and rejects duplicate aliases before writing", async (t) => {
  const cwd = await fixture(t);
  const packagePath = path.join(cwd, "package.json");
  const config = JSON.parse(await readFile(packagePath, "utf8"));
  await writeFile(packagePath, JSON.stringify({ ...config, tilcayo: { database: "mysql" } }));
  for (const args of [
    ["make:resource", "Notebook", "--mongodb", "--mongo"],
    ["make:resource", "Notebook", "--mongodb", "--mongodb"],
    ["make:route", "notebooks", "--mongodb"],
  ]) assert.notEqual(run(cwd, ...args).status, 0);
  assert.ok(!(await readdir(cwd)).includes("src"));
  success(cwd, "make:resource", "Notebook", "title:string", "price:number", "active:boolean", "--mongodb");
  assert.match(await readFile(path.join(cwd, "src/models/Notebook.ts"), "utf8"), /mongoModel\("Notebook", notebookSchema\)/);
  success(cwd, "make:model", "Entry", "--mongodb");
  success(cwd, "make:controller", "entries", "--mongodb", "--resource");
  compile(cwd);
});
