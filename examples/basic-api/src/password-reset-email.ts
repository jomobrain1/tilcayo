import { createSmtpPasswordResetSender } from "@tilcayo/auth";

const user = process.env.MAIL_USER;
const password = process.env.MAIL_PASS;

export const sendPasswordResetCode = user && password
  ? createSmtpPasswordResetSender({
    user, password,
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT || 465),
    ...(process.env.MAIL_SECURE ? { secure: process.env.MAIL_SECURE === "true" } : {}),
    from: process.env.MAIL_FROM || user,
  })
  : undefined;
