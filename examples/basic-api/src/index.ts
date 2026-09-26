import {
  createApp,
  tilcayoVersion,
} from "@tilcayo/core";

const app = createApp();

app.get("/", () => {
  return {
    framework: "Tilcayo",
    version: tilcayoVersion,
    message: "Hello from Tilcayo",
  };
});

app.listen(9149);