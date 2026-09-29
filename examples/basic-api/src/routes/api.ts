import { defineRoutes } from "@tilcayo/core";

import { ProductController } from "../controllers/ProductController.js";

export default defineRoutes(({ get, group, resource }) => {
  group({ prefix: "/api" }, () => {
    resource("/products", ProductController);
  });

  get("/", () => ({
    framework: "Tilcayo",
    message: "Tilcayo API",
  }));

  get("/hello", () => ({
    message: "Routing works",
  }));
});
