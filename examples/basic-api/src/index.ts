import { createApp } from "@tilcayo/core";

import apiRoutes from "./routes/api.routes.js";
import booksRoutes from "./routes/books.routes.js";

const app = createApp();

app.routes(apiRoutes);
app.routes(booksRoutes);

app.listen(9149);
