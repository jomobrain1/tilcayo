import { defineRoutes } from "@tilcayo/core";
import { health } from "../controllers/health.controller.js";

export default defineRoutes((router) => {
  router.get("/health", health);
});
