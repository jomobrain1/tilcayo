import { createApp } from "@tilcayo/core";

import apiRoutes from "./routes/api.js";

const app = createApp();

app.routes(apiRoutes);

app.listen(9149);
