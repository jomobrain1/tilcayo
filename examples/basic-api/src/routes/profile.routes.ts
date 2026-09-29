import { defineRoutes } from "@tilcayo/core";
import { auth } from "../auth.js";
import { getProfile } from "../controllers/profile.controller.js";

export default defineRoutes((router) => {
  router.get("/api/profile", getProfile, {
    middleware: [auth.middleware],
  });
});
