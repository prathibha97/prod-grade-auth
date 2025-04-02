import nodemailer from "nodemailer";
import config from "../../config/environment";

type EmailTemplate = "welcome" | "resetPassword" | "verifyEmail" | "passwordChanged" | "loginAlert";

interface EmailData {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

// Create a transporter object
const transporter = nodemailer.createTransport({
  host: config.emailHost,
  port: config.emailPort,
  secure: config.emailSecure,
  auth: {
    user: config.emailUser,
    pass: config.emailPassword,
  },
});

// Get email template
const getEmailTemplate = (template: EmailTemplate, data: Record<string, any>): string => {
  switch (template) {
    case "welcome":
      return `
        <h1>Welcome to ${config.appName}!</h1>
        <p>Hello ${data.name},</p>
        <p>Thank you for joining us. Please verify your email by clicking the link below:</p>
        <p><a href="${config.baseUrl}/verify-email?token=${data.token}">Verify your email</a></p>
      `;
    case "resetPassword":
      return `
        <h1>Reset Your Password</h1>
        <p>Hello,</p>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <p><a href="${config.baseUrl}/reset-password?token=${data.token}">Reset password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
      `;
    case "verifyEmail":
      return `
        <h1>Email Verification</h1>
        <p>Hello ${data.name},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${config.baseUrl}/verify-email?token=${data.token}">Verify your email</a></p>
      `;
    case "passwordChanged":
      return `
        <h1>Password Changed</h1>
        <p>Hello ${data.name},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you didn't make this change, please contact us immediately.</p>
      `;
    case "loginAlert":
      return `
        <h1>New Login Detected</h1>
        <p>Hello ${data.name},</p>
        <p>We detected a new login to your account from:</p>
        <p>IP: ${data.ipAddress}</p>
        <p>Time: ${data.time}</p>
        <p>If this wasn't you, please secure your account immediately.</p>
      `;
    default:
      return "";
  }
};

// Send email
export const sendEmail = async ({ to, subject, template, data }: EmailData): Promise<void> => {
  try {
    const html = getEmailTemplate(template, data);

    await transporter.sendMail({
      from: `"${config.appName}" <${config.emailFrom}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send email");
  }
};
