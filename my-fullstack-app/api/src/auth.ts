import { storage } from "./storage.js";
import { createAuth } from "@tilcayo/auth";

import { sendPasswordResetCode } from "./password-reset-email.js";

export const auth = createAuth({
  avatarStorage: storage,
  tenancy: { baseDomain: process.env.TENANCY_BASE_DOMAIN || "localhost" },
  cookieSession: true,
  sendPasswordResetCode,
  accessTokenSecret: process.env.AUTH_ACCESS_SECRET ?? "",
  refreshTokenSecret: process.env.AUTH_REFRESH_SECRET ?? "",
});
