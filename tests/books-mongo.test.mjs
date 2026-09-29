import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import mongoose from "mongoose";
import { createApp, connectMongo, disconnectMongo } from "../packages/core/dist/index.js";
import { Book } from "../examples/basic-api/dist/models/Book.js";
import booksRoutes from "../examples/basic-api/dist/routes/books.routes.js";

async function withApi(run, port = 0) {
  const server = createApp().routes(booksRoutes).listen(port);
  try {
    await once(server, "listening");
    await run(async (method, path = "", body) => {
      const response = await fetch(`http://localhost:${server.address().port}/api/books${path}`, {
        method, headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: response.status === 204 ? await response.text() : await response.json() };
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function exerciseCrud(request) {
  const empty = await request("GET");
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.data, []);
  const input = { title: "Clean Code", author: "Robert C. Martin", publishedYear: 2008 };
  const created = await request("POST", "", { ...input, ignored: "strip" });
  assert.equal(created.status, 201);
  const book = created.body.data;
  assert.match(book._id, /^[a-f0-9]{24}$/);
  assert.equal(book.ignored, undefined);
  assert.equal(book.title, input.title);
  assert.ok(book.createdAt);
  assert.ok(book.updatedAt);
  const fetched = await request("GET", `/${book._id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.data.author, input.author);
  assert.equal((await request("GET")).body.data.length, 1);
  const updated = await request("PUT", `/${book._id}`, { title: "Updated book" });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.title, "Updated book");
  assert.equal(updated.body.data.author, input.author);
  assert.equal((await request("GET", `/${book._id}`)).body.data.title, "Updated book");
  assert.equal((await request("POST", "", { title: "A" })).status, 422);
  assert.equal((await request("PUT", `/${book._id}`, { publishedYear: 1.5 })).status, 422);
  for (const method of ["GET", "PUT", "DELETE"]) {
    assert.equal((await request(method, "/invalid", method === "PUT" ? {} : undefined)).status, 422);
    const missing = await request(method, "/000000000000000000000000", method === "PUT" ? {} : undefined);
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { success: false, statusCode: 404, error: { code: "NOT_FOUND", message: "Book not found" } });
  }
  const deleted = await request("DELETE", `/${book._id}`);
  assert.equal(deleted.status, 204);
  assert.equal(deleted.body, "");
  assert.equal((await request("GET", `/${book._id}`)).status, 404);
  assert.deepEqual((await request("GET")).body.data, []);
}

test("book resource HTTP behavior with isolated Mongoose method doubles", async (t) => {
  const records = new Map();
  const calls = [];
  t.mock.method(Book.raw, "find", () => ({ exec: async () => [...records.values()] }));
  t.mock.method(Book.raw, "create", async (body) => {
    calls.push("create");
    const book = { ...body, _id: "1234567890abcdef12345678", createdAt: new Date(), updatedAt: new Date() };
    records.set(book._id, book);
    return book;
  });
  t.mock.method(Book.raw, "findById", async (id) => { calls.push("findById"); return records.get(id) ?? null; });
  t.mock.method(Book.raw, "findByIdAndUpdate", (id, update, options) => ({ exec: async () => {
    assert.deepEqual(options, { returnDocument: "after", runValidators: true });
    const book = records.get(id);
    if (!book) return null;
    Object.assign(book, update.$set);
    return book;
  } }));
  t.mock.method(Book.raw, "findByIdAndDelete", (id) => ({ exec: async () => {
    const book = records.get(id);
    records.delete(id);
    return book ?? null;
  } }));
  await withApi(async (request) => {
    await exerciseCrud(request);
    const count = calls.length;
    assert.equal((await request("GET", "/not-an-id")).status, 422);
    assert.equal((await request("POST", "", {})).status, 422);
    assert.equal(calls.length, count);
  });
});

test("Book model validates required fields", async () => {
  await assert.rejects(new Book.raw({}).validate(), { name: "ValidationError" });
  await new Book.raw({ title: "Grit", author: "Angela Duckworth" }).validate();
});

test("live MongoDB book CRUD", { skip: !process.env.MONGODB_URI, timeout: 60000 }, async () => {
  const dbName = `tilcayo_test_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
  let connected = false;
  try {
    try {
      await connectMongo(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 10000 });
    } catch (error) {
      // Do not expose credentials or server details in connection test failures.
      throw new Error(`Live MongoDB connection failed (${error instanceof Error ? error.name : "unknown error"})`);
    }
    connected = true;
    await withApi(exerciseCrud);
    await Book.createMany([
      { title: "One", author: "Author", publishedYear: 2000 },
      { title: "Two", author: "Author", publishedYear: 2001 },
      { title: "Three", author: "Author", publishedYear: 2002 },
    ]);
    assert.equal(await Book.count(), 3);
    assert.equal(await Book.exists({ title: "Two" }), true);
    assert.equal((await Book.firstOrFail({ title: "Two" })).publishedYear, 2001);
    const page = await Book.paginate({ perPage: 2 }, { sort: { publishedYear: 1 } });
    assert.equal(page.pagination.total, 3);
    assert.deepEqual(page.items.map((book) => book.title), ["One", "Two"]);
    assert.equal((await Book.paginate({ page: 2, perPage: 2 })).items.length, 1);
    const first = await Book.cursorPaginate({ perPage: 2 });
    const second = await Book.cursorPaginate({ perPage: 2, after: first.pagination.nextCursor });
    assert.equal(second.items.length, 1);
    assert.equal(second.pagination.hasNextPage, false);
    assert.equal(new Set([...first.items, ...second.items].map((book) => String(book._id))).size, 3);
    await assert.rejects(Book.update(String(first.items[0]._id), { title: "A" }), { name: "ValidationError" });
    assert.equal(await Book.updateMany({ publishedYear: { $gt: 2000 } }, { author: "Bulk" }), 2);
    await Book.upsert({ title: "Four" }, { title: "Four", author: "Author", publishedYear: 2003 });
    assert.deepEqual((await Book.distinct("author")).sort(), ["Author", "Bulk"]);
    assert.deepEqual(await Book.aggregate([{ $count: "total" }]), [{ total: 4 }]);
    assert.equal(await Book.deleteMany({ author: "Bulk" }), 2);
  } finally {
    try {
      if (connected && mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
    } finally {
      await disconnectMongo();
    }
  }
});
