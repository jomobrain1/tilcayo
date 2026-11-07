const port = Number(process.env.PORT ?? 9149);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be an integer between 0 and 65535.");

export const config = {
  port,
  mongoUri: process.env.MONGODB_URI ?? "",
};
