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

export const sendMfaEmail = async (email, mfaCode) => {
    const mailOptions = {
        from: `"TrustPrism Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "TrustPrism Admin Login - Your MFA Code",
        html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333; padding: 2rem;">
            <h2>Admin Privileged Login Request</h2>
            <p>You or someone else has attempted to log into a privileged TrustPrism account.</p>
            <p>Your one-time Hard Token PIN is:</p>
            <div style="font-size: 2rem; letter-spacing: 4px; font-weight: bold; background: #f4f4f4; padding: 1rem; margin: 1rem auto; width: 200px; border-radius: 8px;">
                ${mfaCode}
            </div>
            <p>This code will expire in 10 minutes. If this was not you, please secure your account immediately.</p>
        </div>
        `,
    };

    return transporter.sendMail(mailOptions);
};

export const sendResearcherInviteEmail = async (email, groupId, groupName) => {
    const signupUrl = `${process.env.FRONTEND_URL}/register?group=${encodeURIComponent(groupId)}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
        from: `"TrustPrism" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Invitation to join TrustPrism Researcher Group",
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 2rem; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a;">You've been invited!</h2>
            <p style="line-height: 1.6;">You have been invited to join the <strong>${groupName}</strong> researcher group on TrustPrism.</p>
            <p style="line-height: 1.6;">Please click the button below to sign up and join the group automatically:</p>
            <a href="${signupUrl}" style="display: inline-block; margin: 1.5rem 0; padding: 0.75rem 1.5rem; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Join Group
            </a>
            <p style="line-height: 1.6;">If you already have an account, please log in and navigate to the group directly. This link contains your invitation code.</p>
        </div>
        `,
    };

    return transporter.sendMail(mailOptions);
};