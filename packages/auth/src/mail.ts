import nodemailer from "nodemailer";
import type { AuthConfig } from "./types.js";

export interface SmtpPasswordResetConfig {
  user: string;
  password: string;
  host?: string;
  port?: number;
  secure?: boolean;
  from?: string;
}

/** Gmail defaults; change host/port to use another SMTP provider. */
export function createSmtpPasswordResetSender({ user, password, host = "smtp.gmail.com",
  port = 465, secure = port === 465, from = user,
}: SmtpPasswordResetConfig): NonNullable<AuthConfig["sendPasswordResetCode"]> {
  if (!user.trim() || !password || !host.trim() || !from.trim()
    || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid SMTP configuration");
  const transport = nodemailer.createTransport({
    host, port, secure, requireTLS: !secure, auth: { user, pass: password },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  return async ({ email, code }) => {
    await transport.sendMail({ from, to: email, subject: "Your password reset code",
      text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    });
  };
}
