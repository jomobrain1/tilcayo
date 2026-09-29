import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { createApp } from "../packages/core/dist/index.js";
import apiRoutes from "../examples/basic-api/dist/routes/api.routes.js";

test("products return basic write responses without changing sample arrays", async () => {
  const server = createApp().routes(apiRoutes).listen(0);
  try {
    await once(server, "listening");
    const base = `http://localhost:${server.address().port}/api`;
    for (const [collection, body, changes, invalid] of [
      ["products", { name: "Monitor", price: 9000 }, { price: 0 }, { price: -1 }],
    ]) {
      const request = async (method, path = "", data) => {
        const response = await fetch(`${base}/${collection}${path}`, {
          method, headers: { "Content-Type": "application/json" },
          body: data === undefined ? undefined : JSON.stringify(data),
        });
        return { status: response.status, body: response.status === 204 ? await response.text() : await response.json() };
      };
      const initial = (await request("GET")).body.data;
      const created = await request("POST", "", { ...body, id: "1" });
      assert.equal(created.status, 201);
      assert.deepEqual(created.body.data, body);
      const item = initial[0];
      assert.deepEqual((await request("GET", `/${item.id}`)).body.data, item);
      assert.deepEqual((await request("GET")).body.data, initial);
      assert.equal((await request("PUT", `/${item.id}`, invalid)).status, 422);
      assert.deepEqual((await request("GET", `/${item.id}`)).body.data, item);
      const updated = await request("PUT", `/${item.id}`, changes);
      assert.equal(updated.status, 200);
      assert.deepEqual(updated.body.data, { id: item.id, body: changes });
      assert.deepEqual((await request("GET", `/${item.id}`)).body.data, item);
      const removed = await request("DELETE", `/${item.id}`);
      assert.equal(removed.status, 204);
      assert.equal(removed.body, "");
      assert.deepEqual((await request("GET", `/${item.id}`)).body.data, item);
      assert.equal((await request("GET", "/999")).status, 404);
      assert.deepEqual((await request("GET")).body.data, initial);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
