import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log("Transport Auth User:", process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (email, token) => {

  console.log("--- Email Debug ---");
  console.log("Current EMAIL_USER:", process.env.EMAIL_USER);
  console.log("Current EMAIL_PASS Length:", process.env.EMAIL_PASS?.length);
  console.log("-------------------");
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"TrustPrism" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your TrustPrism account",
    html: `
      <h1>Welcome to TrustPrism</h1>
      <p>Please click the link below to verify your email address and activate your account:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email, token) => {
    // Construct the URL exactly once here
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
        from: `"TrustPrism" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Password Reset Request",
        html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Please click the link below to set a new password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        `,
    };

    return transporter.sendMail(mailOptions);
};