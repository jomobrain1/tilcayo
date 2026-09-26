import { createApp } from "@tilcayo/core";

import { registerApiRoutes } from "./routes/api.js";

const app = createApp();

registerApiRoutes(app.route);

app.listen(9149);
