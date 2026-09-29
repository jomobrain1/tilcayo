import assert from "node:assert/strict";
import dns from "node:dns";
import mongoose from "mongoose";
import { test } from "node:test";
import { connectMongo, disconnectMongo, getMongoState } from "../packages/core/dist/index.js";

test("Mongo connection validates URI, configures DNS first, reuses connections and propagates errors", async (t) => {
  const events = [];
  const connection = { readyState: 0 };
  const descriptor = Object.getOwnPropertyDescriptor(mongoose, "connection");
  Object.defineProperty(mongoose, "connection", { configurable: true, value: connection });
  t.after(() => {
    if (descriptor) Object.defineProperty(mongoose, "connection", descriptor);
    else delete mongoose.connection;
  });
  t.mock.method(dns, "setServers", (servers) => {
    assert.deepEqual(servers, ["8.8.8.8", "1.1.1.1"]);
    events.push("dns");
  });
  const options = { serverSelectionTimeoutMS: 1000 };
  const connect = t.mock.method(mongoose, "connect", async (uri, passedOptions) => {
    assert.equal(uri, "mongodb://localhost/test");
    assert.equal(passedOptions, options);
    events.push("connect");
    connection.readyState = 1;
    return mongoose;
  });
  for (const uri of ["", "  ", undefined]) await assert.rejects(connectMongo(uri), /URI is required/);
  assert.deepEqual(events, []);
  assert.equal(await connectMongo("mongodb://localhost/test", options), connection);
  assert.deepEqual(events, ["dns", "connect"]);
  assert.equal(await connectMongo("mongodb://localhost/test"), connection);
  assert.deepEqual(events, ["dns", "connect", "dns"]);
  assert.equal(connect.mock.callCount(), 1);
  for (const [raw, state] of [[0, "disconnected"], [1, "connected"], [2, "connecting"], [3, "disconnecting"], [99, "unknown"]]) {
    connection.readyState = raw;
    assert.equal(getMongoState(), state);
  }
  const failure = new Error("connection failed");
  connection.readyState = 0;
  connect.mock.mockImplementation(async () => { throw failure; });
  await assert.rejects(connectMongo("mongodb://localhost/test"), (error) => error === failure);
  const disconnect = t.mock.method(mongoose, "disconnect", async () => { connection.readyState = 0; });
  await disconnectMongo();
  assert.equal(disconnect.mock.callCount(), 1);
  assert.equal(getMongoState(), "disconnected");
});
