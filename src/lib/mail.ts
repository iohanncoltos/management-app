import nodemailer from "nodemailer";

import { env } from "./env";

const port = Number(env.server.PROTON_SMTP_PORT ?? "465");

export const mailer = nodemailer.createTransport({
  host: env.server.PROTON_SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: env.server.PROTON_SMTP_USER,
    pass: env.server.PROTON_SMTP_PASSWORD,
  },
});

interface ProjectMailParams {
  projectCode: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendProjectMail({ projectCode, to, subject, html, text }: ProjectMailParams) {
  const prefixedSubject = `[Project: ${projectCode}] ${subject}`;

  await mailer.sendMail({
    from: env.server.PROTON_FROM_EMAIL,
    to,
    subject: prefixedSubject,
    html,
    text,
  });
}

interface ResetPasswordParams {
  to: string;
  token: string;
}

export async function sendPasswordResetEmail({ to, token }: ResetPasswordParams) {
  const resetUrl = `${env.server.APP_BASE_URL}/reset-password?token=${token}`;
  const html = `
    <p>We received a request to reset your Intermax Management App password.</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  await mailer.sendMail({
    from: env.server.PROTON_FROM_EMAIL,
    to,
    subject: "Intermax Management App - Reset Password",
    html,
    text: `Use the link to reset your password: ${resetUrl}`,
  });
}
