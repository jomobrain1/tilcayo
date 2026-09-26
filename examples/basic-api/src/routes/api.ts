import {
  createRouter,
} from "@tilcayo/core";

type Router = ReturnType<typeof createRouter>;

export function registerApiRoutes(
  route: Router
) {
  route.get("/", () => {
    return {
      framework: "Tilcayo",
      message: "Tilcayo API",
    };
  });

  route.get("/hello", () => {
    return {
      message: "Routing works",
    };
  });
}