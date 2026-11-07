import { connectMongo, disconnectMongo } from "@tilcayo/core";

async function main() {
  const { config } = await import("./config.js");
  const { default: app } = await import("./app.js");
  await connectMongo(config.mongoUri);
  const server = app.listen(config.port);
  const shutdown = () => {
    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    server.close(() => {
      void disconnectMongo().then(() => process.exit(0), () => process.exit(1));
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch(() => {
  console.error("Unable to start the API. Check .env configuration, MongoDB connectivity, and distinct auth secrets of at least 32 bytes each.");
  process.exitCode = 1;
});
