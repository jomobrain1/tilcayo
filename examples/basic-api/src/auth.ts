import { createAuth } from "@tilcayo/auth";

import { sendPasswordResetCode } from "./password-reset-email.js";

export const auth = createAuth({
  sendPasswordResetCode,
  accessTokenSecret: process.env.AUTH_ACCESS_SECRET ?? "",
  refreshTokenSecret: process.env.AUTH_REFRESH_SECRET ?? "",
});
