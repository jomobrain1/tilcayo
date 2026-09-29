import { connectMongo, createApp } from "@tilcayo/core";

import apiRoutes from "./routes/api.routes.js";
import booksRoutes from "./routes/books.routes.js";
import membersRoutes from "./routes/members.routes.js";
import notebookRoutes from "./routes/notebooks.routes.js";
async function main() {
  // Load configuration inside the startup error boundary.
  const { auth } = await import("./auth.js");
  const { default: profileRoutes } = await import("./routes/profile.routes.js");
  await connectMongo(process.env.MONGODB_URI ?? "");
  const app = createApp();

  // After creating app:
  app.routes(apiRoutes);
  app.routes(booksRoutes);
  app.routes(membersRoutes);
  app.routes(notebookRoutes);
  app.routes(auth.routes);
  app.routes(profileRoutes);

  app.listen(9149);
}

main().catch(() => {
  console.error(
    "Unable to start the API. Check MONGODB_URI, MongoDB connectivity, and AUTH_ACCESS_SECRET / AUTH_REFRESH_SECRET (distinct, at least 32 bytes each).",
  );
  process.exitCode = 1;
});
