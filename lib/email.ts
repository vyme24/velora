import { Resend } from "resend";

const resend = process.env.EMAIL_API_KEY ? new Resend(process.env.EMAIL_API_KEY) : null;

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    return { skipped: true };
  }

  return resend.emails.send({
    from: "Velora <noreply@velora.app>",
    to: params.to,
    subject: params.subject,
    html: params.html
  });
}

export function otpEmailTemplate(name: string, otp: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #533AFD, #6A5CFF); color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Velora Verification</h2>
      </div>
      <div style="padding: 24px; color: #111827;">
        <p>Hi ${name},</p>
        <p>Your OTP is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    </div>
  `;
}

export function welcomeEmailTemplate(name: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #533AFD, #6A5CFF); color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Welcome to Velora</h2>
      </div>
      <div style="padding: 24px; color: #111827;">
        <p>Hi ${name},</p>
        <p>Your profile is ready. Complete your photos and interests to improve match quality.</p>
      </div>
    </div>
  `;
}

export function resetPasswordEmailTemplate(name: string, resetUrl: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #533AFD, #6A5CFF); color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Reset Password</h2>
      </div>
      <div style="padding: 24px; color: #111827;">
        <p>Hi ${name},</p>
        <p>Use the button below to reset your password.</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 18px; border-radius: 10px; text-decoration: none; color: white; background: linear-gradient(135deg, #533AFD, #6A5CFF);">Reset password</a></p>
      </div>
    </div>
  `;
}

export function paymentConfirmationTemplate(name: string, amountLabel: string, description: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #533AFD, #6A5CFF); color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Payment Confirmed</h2>
      </div>
      <div style="padding: 24px; color: #111827;">
        <p>Hi ${name},</p>
        <p>We received your payment of <strong>${amountLabel}</strong>.</p>
        <p>${description}</p>
      </div>
    </div>
  `;
}
