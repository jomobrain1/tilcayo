import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { mongoModel, paginationParams } from "../packages/core/dist/index.js";

const id = "1234567890abcdef12345678";

function fixture(t, execute) {
  const Book = mongoModel("HelperBook", new mongoose.Schema({ title: { type: String, required: true }, year: Number }));
  const raw = Book.raw;
  t.after(() => mongoose.deleteModel("HelperBook"));
  const calls = [];
  t.mock.method(raw.Query.prototype, "exec", async function () {
    calls.push(this);
    return execute(this);
  });
  return { raw, Book, calls };
}

test("reads support filters, selection, population, limits, counts and missing records", async (t) => {
  let found = true;
  const { Book, raw, calls } = fixture(t, (q) => {
    if (q.op === "countDocuments") return 3;
    if (q.op === "findOne") return found ? { _id: id, title: "Book" } : null;
    return found ? [{ _id: id, title: "Book" }] : [];
  });
  assert.equal(Book.raw, raw);
  assert.equal((await Book.all()).length, 1);
  await Book.where({ year: { $gte: 2000 } }, { select: ["title"], populate: ["author"], sort: { year: -1 }, limit: 5 });
  const query = calls.at(-1);
  assert.deepEqual(query.getFilter(), { year: { $gte: 2000 } });
  assert.deepEqual(query.projection(), { title: 1 });
  assert.equal(query.mongooseOptions().populate.author.path, "author");
  assert.deepEqual(query.getOptions(), { sort: { year: -1 }, limit: 5 });
  assert.equal((await Book.find(id)).title, "Book");
  assert.equal((await Book.findOrFail(id)).title, "Book");
  assert.equal((await Book.first({ year: 2000 })).title, "Book");
  assert.equal(calls.at(-1).getOptions().limit, 1);
  assert.equal((await Book.firstOrFail()).title, "Book");
  assert.equal(await Book.count({ year: 2000 }), 3);
  assert.equal(await Book.exists({ title: "Book" }), true);
  found = false;
  assert.equal(await Book.find(id), null);
  assert.equal(await Book.first(), null);
  assert.equal(await Book.exists({ title: "Book" }), false);
  await assert.rejects(Book.findOrFail(id), { statusCode: 404, message: "HelperBook not found" });
  await assert.rejects(Book.firstOrFail(), { statusCode: 404 });
  const count = calls.length;
  await assert.rejects(Book.find("invalid"), { statusCode: 400 });
  await assert.rejects(Book.find([id]), { statusCode: 400 });
  assert.equal(calls.length, count);
});

test("pagination caps page size, preserves filters and uses a stable sort", async (t) => {
  let total = 45;
  const { Book, calls } = fixture(t, (q) => q.op === "countDocuments" ? total : [{ _id: id }]);
  const result = await Book.paginate({ page: "2", perPage: "10" }, { filter: { year: 2000 }, sort: { year: -1 } });
  assert.deepEqual(result.pagination, { page: 2, perPage: 10, total: 45, lastPage: 5, hasNextPage: true, hasPreviousPage: true });
  const query = calls.find((q) => q.op === "find");
  assert.deepEqual(query.getOptions(), { sort: { year: -1, _id: 1 }, limit: 10, skip: 10 });
  assert.ok(calls.every((q) => q.getFilter().year === 2000));
  await Book.paginate({ page: "1", filter: { year: 1999 }, sort: { year: -1 }, populate: ["author"], select: ["secret"] });
  const safeQuery = calls.filter((q) => q.op === "find").at(-1);
  assert.deepEqual(safeQuery.getFilter(), {});
  assert.deepEqual(safeQuery.getOptions().sort, { _id: 1 });
  assert.equal(safeQuery.projection(), undefined);
  assert.equal(safeQuery.mongooseOptions().populate, undefined);
  await assert.rejects(Book.paginate({ page: ["1", "2"] }), { statusCode: 400 });
  assert.equal((await Book.paginate({ perPage: 1000 })).pagination.perPage, 100);
  assert.equal((await Book.paginate()).pagination.perPage, 20);
  total = 0;
  assert.deepEqual((await Book.paginate()).pagination, { page: 1, perPage: 20, total: 0, lastPage: 1, hasNextPage: false, hasPreviousPage: false });
  for (const value of [0, -1, 1.5, "", "abc", ["2"], {}, null, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => paginationParams({ page: value }), { statusCode: 400 });
    assert.throws(() => paginationParams({ perPage: value }), { statusCode: 400 });
  }
  assert.throws(() => paginationParams({ page: Number.MAX_SAFE_INTEGER, perPage: 100 }), { statusCode: 400 });
});

test("cursor pagination fetches an extra record and combines the cursor with the filter", async (t) => {
  let rows = [{ _id: id }, { _id: "2234567890abcdef12345678" }];
  const { Book, calls } = fixture(t, () => rows);
  const result = await Book.cursorPaginate({ perPage: 1, after: id, filter: { year: 2000 } });
  assert.deepEqual(result.pagination, { perPage: 1, hasNextPage: true, nextCursor: id });
  assert.equal(result.items.length, 1);
  assert.deepEqual(calls[0].getFilter(), { $and: [{ year: 2000 }, { _id: { $gt: id } }] });
  assert.deepEqual(calls[0].getOptions(), { sort: { _id: 1 }, limit: 2 });
  rows = [];
  assert.equal((await Book.cursorPaginate()).pagination.nextCursor, null);
  await assert.rejects(Book.cursorPaginate({ after: "invalid" }), { statusCode: 400 });
  await assert.rejects(Book.cursorPaginate({ select: ["-_id"] }), { statusCode: 400 });
});

test("writes return records or counts, validate updates, and reject unsafe field shapes", async (t) => {
  const { Book, raw, calls } = fixture(t, (q) => {
    if (q.op === "updateMany") return { modifiedCount: 2 };
    if (q.op === "deleteMany") return { deletedCount: 3 };
    return { _id: id, ...q.getUpdate()?.$set };
  });
  t.mock.method(raw, "create", async (data) => {
    const document = new raw(data);
    await document.validate();
    return document;
  });
  t.mock.method(raw, "insertMany", async (items) => items);
  assert.equal((await Book.create({ title: "Book" })).title, "Book");
  await assert.rejects(Book.create({}), { name: "ValidationError" });
  assert.equal((await Book.createMany([{ title: "One" }, { title: "Two" }])).length, 2);
  assert.equal((await Book.update(id, { title: "Updated" })).title, "Updated");
  assert.deepEqual(calls.at(-1).getUpdate(), { $set: { title: "Updated" } });
  assert.deepEqual(calls.at(-1).getOptions(), { returnDocument: "after", runValidators: true });
  assert.equal((await Book.delete(id))._id, id);
  assert.equal(await Book.updateMany({ year: 2000 }, { title: "New" }), 2);
  assert.equal(calls.at(-1).getOptions().runValidators, true);
  assert.equal(await Book.deleteMany({ year: 2000 }), 3);
  await Book.upsert({ title: "Book" }, { year: 2020 });
  assert.equal(calls.at(-1).getOptions().upsert, true);
  assert.equal(calls.at(-1).getOptions().runValidators, true);
  assert.equal(calls.at(-1).getOptions().returnDocument, "after");
  for (const data of [null, [], { $set: { title: "bad" } }, { "nested.field": 1 }, { _id: id }]) {
    assert.throws(() => Book.update(id, data), { statusCode: 400 });
  }
  await assert.rejects(Book.updateMany({}, { title: "No" }), { statusCode: 400 });
  await assert.rejects(Book.deleteMany({}), { statusCode: 400 });
  assert.throws(() => Book.upsert({}, { title: "No" }), { statusCode: 400 });
});

test("distinct and aggregate forward reporting queries", async (t) => {
  const { Book, raw, calls } = fixture(t, () => [2000, 2020]);
  assert.deepEqual(await Book.distinct("year", { title: "Book" }), [2000, 2020]);
  assert.equal(calls.at(-1).op, "distinct");
  assert.deepEqual(calls.at(-1).getFilter(), { title: "Book" });
  const pipeline = [{ $group: { _id: "$year", count: { $sum: 1 } } }];
  t.mock.method(raw, "aggregate", (stages) => {
    assert.deepEqual(stages, pipeline);
    return { exec: async () => [{ _id: 2000, count: 2 }] };
  });
  assert.deepEqual(await Book.aggregate(pipeline), [{ _id: 2000, count: 2 }]);
});
