import { createAuth } from "@tilcayo/auth";

export const auth = createAuth({
  accessTokenSecret: process.env.AUTH_ACCESS_SECRET ?? "",
  refreshTokenSecret: process.env.AUTH_REFRESH_SECRET ?? "",
});
