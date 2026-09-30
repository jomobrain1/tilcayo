import { connectMongo } from "@tilcayo/core";
async function main() {
  // Load configuration inside the startup error boundary.
  const { default: app } = await import("./app.js");
  await connectMongo(process.env.MONGODB_URI ?? "");
  app.listen(9149);
}

main().catch(() => {
  console.error(
    "Unable to start the API. Check MONGODB_URI, MongoDB connectivity, and AUTH_ACCESS_SECRET / AUTH_REFRESH_SECRET (distinct, at least 32 bytes each).",
  );
  process.exitCode = 1;
});
