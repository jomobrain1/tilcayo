import { createApp, tilcayoVersion } from "@tilcayo/core";

const app = createApp();

app.route.get("/", () => {
  return {
    framework: "Tilcayo",
    version: tilcayoVersion,
    message: "Hello from Tilcayo",
  };
});

app.route.get("/hello", () => {
  return {
    message: "Tilcayo routing works",
  };
});

app.listen(9149);
