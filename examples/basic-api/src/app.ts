import { createApp } from "@tilcayo/core";
import apiRoutes from "./routes/api.routes.js";
import booksRoutes from "./routes/books.routes.js";
import membersRoutes from "./routes/members.routes.js";
import notebookRoutes from "./routes/notebooks.routes.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";

const app = createApp();
app.routes(apiRoutes);
app.routes(booksRoutes);
app.routes(membersRoutes);
app.routes(notebookRoutes);
app.routes(authRoutes);
app.routes(profileRoutes);

export default app;
