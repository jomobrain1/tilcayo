import { connectMongo, createApp } from "@tilcayo/core";

import apiRoutes from "./routes/api.routes.js";
import booksRoutes from "./routes/books.routes.js";
import membersRoutes from "./routes/members.routes.js";

async function main() {
  await connectMongo(process.env.MONGODB_URI ?? "");
  const app = createApp();

  // After creating app:
  app.routes(apiRoutes);
  app.routes(booksRoutes);
  app.routes(membersRoutes);

  app.listen(9149);
}

main().catch(() => {
  console.error(
    "Unable to start the API. Check MONGODB_URI and MongoDB connectivity.",
  );
  process.exitCode = 1;
});
