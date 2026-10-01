import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, readFile, readdir, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { make } from "../packages/cli/dist/commands/make.js";
import { parseFields } from "../packages/cli/dist/utils/fields.js";
import { createApp } from "../packages/core/dist/index.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const id = "1234567890abcdef12345678";

async function fixture(t) {
  const cwd = await mkdtemp(path.join(repo, ".relationship-test-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(cwd)), path.resolve(repo));
    assert.ok(path.basename(cwd).startsWith(".relationship-test-"));
    await rm(cwd, { recursive: true, force: true });
  });
  await writeFile(path.join(cwd, "package.json"), JSON.stringify({ type: "module", private: true }));
  return cwd;
}

test("relationship parser retains target, cardinality, optionality and primitive compatibility", () => {
  for (const [syntax, many] of [["ref", false], ["refs", true]]) {
    for (const optional of [false, true]) {
      assert.deepEqual(parseFields(`author:${syntax}:Author${optional ? "?" : ""}`, true), [
        { kind: "reference", name: "author", model: "Author", many, optional },
      ]);
    }
  }
  for (const type of ["string", "number", "boolean", "date"]) {
    for (const syntax of [`value:${type}?`, `value?:${type}`]) {
      assert.deepEqual(parseFields(syntax, true), [{ kind: "primitive", name: "value", type, optional: true }]);
    }
    assert.equal(parseFields(`value:${type}`, true)[0].optional, false);
  }
});

test("invalid relation definitions and names fail before creating any files", async (t) => {
  const cwd = await fixture(t);
  for (const declaration of ["author:ref", "author:refs", "author:ref:", "author:refs:",
    "author:reference:Author", "author:foo:Author", "author:ref:../Author", "author:ref:..\\Author",
    "author:ref:123Author", "author:ref:author", "author:ref:Author.ts", "author:ref:Author:extra",
    "author:ref:Author??", "author:ref:Author?extra", "../author:ref:Author", "constructor:ref:Author",
    "author:ref:Author,author:refs:Tag"]) {
    await assert.rejects(make(["make:resource", "Book", declaration], cwd), /Invalid|Reserved|Duplicate/);
    assert.ok(!(await readdir(cwd)).includes("src"), declaration);
  }
  await assert.rejects(make(["make:resource", "Book", "author:ref:"], cwd), /Expected field:ref:Model or field:refs:Model/);
  assert.match((await make(["make:resource", "--help"], cwd)).join("\n"), /author:ref:Author/);
});

test("relationship resources preflight all five targets including services", async (t) => {
  for (const target of ["models/Book.ts", "controllers/books.controller.ts", "validators/books.validator.ts", "routes/books.routes.ts", "services/books.service.ts"]) {
    const cwd = await fixture(t);
    const file = path.join(cwd, "src", target);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "existing content");
    await assert.rejects(make(["make:resource", "Book", "author:ref:Author"], cwd), /already exists/);
    assert.equal(await readFile(file, "utf8"), "existing content");
    assert.equal((await readdir(path.join(cwd, "src"), { recursive: true })).filter((file) => file.endsWith(".ts")).length, 1);
  }
});

async function application(t) {
  const cwd = await fixture(t);
  for (const args of [
    ["Author", "name:string"], ["Tag", "name:string"],
    ["Book", "title:string", "year:number?", "author:ref:Author"],
    ["Article", "title:string", "author:ref:Author", "tags:refs:Tag"],
    ["OptionalRelation", "title:string", "author:ref:Author?", "tags:refs:Tag?"],
  ]) await make(["make:resource", ...args], cwd);
  await make(["make:model", "Manuscript", "author:ref:Author", "tags:refs:Tag?"], cwd);
  await make(["make:controller", "manuscripts", "--resource", "author:ref:Author", "tags:refs:Tag?"], cwd);
  await make(["make:validator", "manuscripts", "author:ref:Author", "tags:refs:Tag?"], cwd);
  await make(["make:route", "manuscripts"], cwd);
  await writeFile(path.join(cwd, "src/check.ts"), `import { Book } from "./models/Book.js";
import { Article } from "./models/Article.js";
import { getBooks, getBookById } from "./services/books.service.js";
import { getArticles } from "./services/articles.service.js";
import mongoose from "mongoose";
const check = async () => {
  await getBooks();
  await getBooks({ populate: ["author"] });
  await getBookById("${id}", { populate: ["author"] });
  await getArticles({ populate: ["author", "tags"] });
  // @ts-expect-error Only declared relations may be populated.
  await getBooks({ populate: ["somethingElse"] });
  const book = await Book.findOrFail("${id}");
  const author: mongoose.Types.ObjectId = book.author;
  // @ts-expect-error References retain ObjectId types.
  const wrong: string = book.author;
  const article = await Article.findOrFail("${id}");
  const tags: mongoose.Types.ObjectId[] = article.tags;
};
`);
  await writeFile(path.join(cwd, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, skipLibCheck: true, rootDir: "src", outDir: "dist", types: ["node"] },
    include: ["src/**/*.ts"],
  }));
  const result = spawnSync(process.execPath, [path.join(repo, "node_modules/typescript/bin/tsc"), "-p", cwd], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const load = (file) => import(pathToFileURL(path.join(cwd, "dist", file)));
  const models = {};
  for (const model of ["Author", "Tag", "Book", "Article", "OptionalRelation"]) {
    models[model] = (await load(`models/${model}.js`))[model];
  }
  t.after(() => { for (const model of Object.keys(models)) mongoose.deleteModel(model); });
  const app = createApp();
  for (const name of ["authors", "tags", "books", "articles", "optionalRelations"]) {
    app.routes((await load(`routes/${name.toLowerCase()}.routes.js`)).default);
  }
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const request = async (method, resource, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/${resource}`, {
      method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  return { models, load, request };
}

test("generated relations compile, cast IDs, validate HTTP bodies and only populate explicitly", async (t) => {
  const { models, load, request } = await application(t);
  const { Book, Article, OptionalRelation } = models;
  assert.equal(Book.raw.schema.path("author").instance, "ObjectId");
  assert.equal(Book.raw.schema.path("author").options.ref, "Author");
  assert.equal(Article.raw.schema.path("tags").getEmbeddedSchemaType().options.ref, "Tag");
  assert.equal(OptionalRelation.raw.schema.path("author").isRequired, false);
  assert.equal(new OptionalRelation.raw({ title: "Anonymous" }).tags, undefined);
  await assert.rejects(new Article.raw({ title: "Missing tags", author: id }).validate(), /tags/);
  const { createOptionalRelationSchema, updateOptionalRelationSchema } = await load("validators/optionalrelations.validator.js");
  for (const body of [{ title: "Anonymous" }, { title: "Known", author: id, tags: [id] }, { title: "Empty", tags: [] }]) {
    assert.equal(createOptionalRelationSchema.safeParse(body).success, true);
  }
  assert.equal(updateOptionalRelationSchema.safeParse({}).success, true);
  for (const value of [null, 123, {}, "bad-id"]) assert.equal(createOptionalRelationSchema.safeParse({ title: "Bad", author: value }).success, false);
  let writes = 0;
  const reads = [];
  for (const model of [Book, Article, OptionalRelation]) {
    t.mock.method(model.raw, "create", async (data) => {
      writes++;
      if (data.author !== undefined) assert.ok(data.author instanceof mongoose.Types.ObjectId);
      if (data.tags !== undefined) assert.ok(data.tags.every((tag) => tag instanceof mongoose.Types.ObjectId));
      const document = new model.raw(data);
      await document.validate();
      return document;
    });
    t.mock.method(model.raw.Query.prototype, "exec", async function () {
      reads.push(this.getPopulatedPaths());
      if (this.op === "find") return [];
      return new model.raw({ title: "Existing", author: id, tags: [id] });
    });
  }
  assert.equal((await request("POST", "books", { title: "1984", author: id })).status, 201);
  assert.equal((await request("POST", "articles", { title: "Relations", author: id, tags: [id, id] })).status, 201);
  const before = writes;
  for (const [resource, body, field] of [
    ["books", { title: "Invalid", author: "not-an-object-id" }, "author"],
    ["books", { title: "Missing" }, "author"],
    ["articles", { title: "Invalid", author: id, tags: ["not-valid"] }, "tags"],
    ["articles", { title: "Missing", author: id }, "tags"],
    ["articles", { title: "Invalid", author: id, tags: id }, "tags"],
  ]) {
    const response = await request("POST", resource, body);
    assert.equal(response.status, 422);
    assert.ok(JSON.stringify(response.body).includes(field));
  }
  assert.equal(writes, before);
  const { getBooks, getBookById, updateBook } = await load("services/books.service.js");
  await getBooks();
  assert.deepEqual(reads.at(-1), []);
  await getBooks({ populate: ["author"] });
  assert.deepEqual(reads.at(-1), ["author"]);
  await request("GET", "books?populate=author");
  assert.deepEqual(reads.at(-1), []);
  const populated = [];
  t.mock.method(Book.raw.prototype, "populate", async function (relation) { populated.push(relation); return this; });
  await getBookById(id);
  assert.deepEqual(populated, []);
  await getBookById(id, { populate: ["author"] });
  assert.deepEqual(populated, ["author"]);
  t.mock.method(Book, "update", async (_id, data) => {
    assert.ok(data.author instanceof mongoose.Types.ObjectId);
    return new Book.raw({ title: "Changed", ...data });
  });
  await updateBook(id, { author: id });
  assert.equal((await request("PUT", `books/${id}`, { author: "invalid" })).status, 422);
});

test("live MongoDB: generated HTTP CRUD, optional refs, explicit population and no cascades", { skip: !process.env.MONGODB_URI }, async (t) => {
  const dbName = `tilcayo_relationship_test_${randomUUID().replaceAll("-", "")}`;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 10000 });
  } catch {
    throw new Error("Live relationship test could not connect to MongoDB (connection details withheld)");
  }
  t.after(async () => {
    try {
      if (mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
    } finally { await mongoose.disconnect(); }
  });
  const { models, load, request } = await application(t);
  const author = await request("POST", "authors", { name: "George Orwell" });
  assert.equal(author.status, 201);
  const authorId = author.body.data._id;
  const tags = [];
  for (const name of ["Fiction", "Classic"]) {
    const tag = await request("POST", "tags", { name });
    assert.equal(tag.status, 201);
    tags.push(tag.body.data._id);
  }
  const created = await request("POST", "books", { title: "1984", author: authorId });
  assert.equal(created.status, 201);
  const bookId = created.body.data._id;
  assert.ok((await models.Book.findOrFail(bookId)).author instanceof mongoose.Types.ObjectId);
  const article = await request("POST", "articles", { title: "Relationships", author: authorId, tags });
  assert.equal(article.status, 201);
  assert.deepEqual(article.body.data.tags, tags);
  for (const body of [{ title: "Anonymous" }, { title: "Known", author: authorId, tags }, { title: "Empty", tags: [] }]) {
    assert.equal((await request("POST", "optionalrelations", body)).status, 201);
  }
  const { getBooks, getBookById } = await load("services/books.service.js");
  assert.ok((await getBooks())[0].author instanceof mongoose.Types.ObjectId);
  assert.equal((await getBooks({ populate: ["author"] }))[0].author.name, "George Orwell");
  assert.equal((await getBookById(bookId, { populate: ["author"] })).author.name, "George Orwell");
  const { getArticles } = await load("services/articles.service.js");
  assert.deepEqual((await getArticles({ populate: ["tags"] }))[0].tags.map((tag) => tag.name), ["Fiction", "Classic"]);
  assert.equal((await request("POST", "books", { title: "Dangling", author: id })).status, 201);
  assert.equal((await request("POST", "books", { title: "Invalid", author: "not-valid" })).status, 422);
  assert.equal((await request("POST", "articles", { title: "Invalid", author: authorId, tags: ["bad"] })).status, 422);
  assert.equal((await request("PUT", `books/${bookId}`, { title: "Updated" })).status, 200);
  assert.equal((await models.Book.findOrFail(bookId)).author.toString(), authorId);
  assert.equal((await request("DELETE", `authors/${authorId}`)).status, 204);
  assert.equal((await getBookById(bookId)).title, "Updated");
  assert.equal((await request("DELETE", `tags/${tags[0]}`)).status, 204);
  assert.equal((await models.Article.findOrFail(article.body.data._id)).tags.length, 2);
});
