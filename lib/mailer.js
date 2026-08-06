"use strict";

const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || "L";

const isProd = process.env.NODE_ENV === "production";
const hasRealPass = Boolean(SMTP_PASS) && !/^(REPLACE_|change-me|your-)/i.test(SMTP_PASS);
const configured = Boolean(SMTP_USER && hasRealPass);

let transporter = null;
if (configured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Sends a verification code.
 * Returns { sent: true } when emailed.
 * Returns { sent: false, devCode } in development when SMTP is not configured,
 * so the code can be tested locally without real email.
 */
async function sendVerificationCode(to, code) {
  if (!configured) {
    if (isProd) {
      const err = new Error("Email is not configured (SMTP_USER / SMTP_PASS).");
      err.misconfigured = true;
      throw err;
    }
    console.log(`[dev-otp] ${to} -> ${code}`);
    return { sent: false, devCode: code };
  }

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: "Your L verification code",
    text: `Your verification code is: ${code}\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Your L verification code is:</p><h2 style="letter-spacing:6px;font-size:28px">${code}</h2><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });
  return { sent: true };
}

module.exports = { sendVerificationCode, configured };
