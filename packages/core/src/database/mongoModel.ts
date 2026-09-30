import mongoose, { Types, type Model, type Schema, type PipelineStage, type QueryFilter, type SortOrder } from "mongoose";
import { badRequest, notFound } from "../errors/httpErrors.js";
import { paginationParams, positiveInteger, type Page } from "./pagination.js";

export interface MongoReadOptions {
  select?: string[];
  populate?: string[];
  sort?: Record<string, SortOrder>;
  limit?: number;
}

export interface MongoPaginationOptions<T> extends Omit<MongoReadOptions, "limit"> {
  filter?: QueryFilter<T>;
}

export interface MongoCursorOptions<T> extends Omit<MongoReadOptions, "sort" | "limit"> {
  filter?: QueryFilter<T>;
  after?: string;
  perPage?: number | string;
}

type MongoId = string | string[] | Types.ObjectId;

function objectId(id: MongoId): string | Types.ObjectId {
  if (id instanceof Types.ObjectId || (typeof id === "string" && /^[a-f\d]{24}$/i.test(id))) return id;
  throw badRequest("Invalid MongoDB ID");
}

// Updates accept fields, not Mongo operators or dotted paths from request bodies.
function writeData<T>(data: Partial<T>): Partial<T> {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw badRequest("Expected an object of fields");
  for (const key of Object.keys(data)) {
    if (key.startsWith("$") || key.includes(".") || ["_id", "__v", "__proto__", "constructor", "prototype"].includes(key)) {
      throw badRequest(`Cannot write field: ${key}`);
    }
  }
  return data;
}

function nonemptyFilter<T>(filter: QueryFilter<T>): QueryFilter<T> {
  if (!filter || typeof filter !== "object" || Array.isArray(filter) || !Object.keys(filter).length) {
    throw badRequest("A nonempty filter is required");
  }
  return filter;
}

export function mongoModel<S extends Schema>(name: string, schema: S) {
  // Reuse registered schemas so reloading a model does not compile it twice.
  const registeredSchema = mongoose.models[name]?.schema as S | undefined;
  return modelMethods(mongoose.model<S>(name, registeredSchema ?? schema));
}

// Keep Mongoose intact and expose simple methods beside it.
function modelMethods<T extends object, Q, I, V, H extends { _id: unknown }, S, L>(raw: Model<T, Q, I, V, H, S, L>) {
  function read(filter: QueryFilter<T> = {}, options: MongoReadOptions = {}) {
    const query = raw.find(filter);
    if (options.select) query.select(options.select.join(" "));
    if (options.populate) for (const field of options.populate) query.populate(field);
    if (options.sort) query.sort(options.sort);
    if (options.limit !== undefined) query.limit(positiveInteger(options.limit, 20, "limit"));
    return query;
  }

  async function find(id: MongoId) {
    return raw.findById(objectId(id));
  }

  async function findOrFail(id: MongoId) {
    const record = await find(id);
    if (!record) throw notFound(`${raw.modelName} not found`);
    return record;
  }

  async function first(filter: QueryFilter<T> = {}, options: MongoReadOptions = {}) {
    const records = await read(filter, { ...options, limit: 1 });
    return records[0] ?? null;
  }

  async function firstOrFail(filter: QueryFilter<T> = {}, options: MongoReadOptions = {}) {
    const record = await first(filter, options);
    if (!record) throw notFound(`${raw.modelName} not found`);
    return record;
  }

  async function paginate(query: { page?: unknown; perPage?: unknown } = {}, options: MongoPaginationOptions<T> = {}) {
    const { page, perPage } = paginationParams(query);
    const filter = options.filter ?? {};
    // Always add a unique tie-breaker to keep page ordering predictable.
    const sort = { ...options.sort, _id: options.sort?._id ?? 1 };
    const [items, total] = await Promise.all([
      read(filter, { ...options, sort, limit: perPage }).skip((page - 1) * perPage),
      raw.countDocuments(filter),
    ]);
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    return {
      items,
      pagination: { page, perPage, total, lastPage, hasNextPage: page < lastPage, hasPreviousPage: page > 1 },
    } satisfies Page<(typeof items)[number]>;
  }

  // Forward pagination by ObjectId. No offset or total-count query is needed.
  async function cursorPaginate(options: MongoCursorOptions<T> = {}) {
    const { perPage } = paginationParams({ perPage: options.perPage });
    const filter: QueryFilter<T> = options.after === undefined ? options.filter ?? {} : {
      $and: [options.filter ?? {}, { _id: { $gt: objectId(options.after) } }],
    } as QueryFilter<T>;
    if (options.select?.some((field) => field === "-_id")) throw badRequest("Cursor pagination requires _id");
    const records = await read(filter, { ...options, sort: { _id: 1 }, limit: perPage + 1 });
    const hasNextPage = records.length > perPage;
    const items = records.slice(0, perPage);
    const last = items.at(-1);
    const nextCursor = hasNextPage && last && typeof last === "object" && "_id" in last ? String(last._id) : null;
    return { items, pagination: { perPage, hasNextPage, nextCursor } };
  }

  return {
    raw,
    all: (options: MongoReadOptions = {}) => read({}, options).exec(),
    where: (filter: QueryFilter<T>, options: MongoReadOptions = {}) => read(filter, options).exec(),
    find, findOrFail, first, firstOrFail, paginate, cursorPaginate,
    create: (data: Partial<T>) => raw.create(writeData(data)),
    createMany: (items: Partial<T>[]) => raw.insertMany(items.map(writeData)),
    update: (id: MongoId, data: Partial<T>) => raw.findByIdAndUpdate(objectId(id), { $set: writeData(data) }, { returnDocument: "after", runValidators: true }).exec(),
    delete: (id: MongoId) => raw.findByIdAndDelete(objectId(id)).exec(),
    count: (filter: QueryFilter<T> = {}) => raw.countDocuments(filter).exec(),
    exists: async (filter: QueryFilter<T>) => Boolean(await raw.exists(filter)),
    updateMany: async (filter: QueryFilter<T>, data: Partial<T>) => (await raw.updateMany(nonemptyFilter(filter), { $set: writeData(data) }, { runValidators: true })).modifiedCount,
    deleteMany: async (filter: QueryFilter<T>) => (await raw.deleteMany(nonemptyFilter(filter))).deletedCount,
    upsert: (filter: QueryFilter<T>, data: Partial<T>) => raw.findOneAndUpdate(nonemptyFilter(filter), { $set: writeData(data) }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).exec(),
    distinct: <K extends Extract<keyof T, string>>(field: K, filter: QueryFilter<T> = {}) => raw.distinct(field, filter).exec(),
    aggregate: <R = Record<string, unknown>>(pipeline: PipelineStage[]) => raw.aggregate<R>(pipeline).exec(),
  };
}
