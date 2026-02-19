import { Resend } from "resend";
import { getSettingString, getSmtpSettings, getSystemSettings } from "@/lib/app-settings";
import { connectToDatabase } from "@/lib/db";
import { EmailLog } from "@/models/EmailLog";
import nodemailer from "nodemailer";

const resend = process.env.EMAIL_API_KEY ? new Resend(process.env.EMAIL_API_KEY) : null;

async function logEmailDelivery(params: {
  to: string;
  subject: string;
  htmlLength: number;
  status: "sent" | "skipped" | "failed";
  provider?: string;
  messageId?: string | null;
  errorMessage?: string | null;
}) {
  try {
    await connectToDatabase();
    await EmailLog.create({
      to: params.to,
      subject: params.subject,
      status: params.status,
      provider: params.provider || "resend",
      messageId: params.messageId || null,
      errorMessage: params.errorMessage || null,
      metadata: { htmlLength: params.htmlLength }
    });
  } catch {
    // keep email flow non-blocking if logging fails
  }
}

async function getSmtpTransport() {
  const smtp = await getSmtpSettings();
  const smtpReady = Boolean(smtp.host && smtp.port && smtp.user && smtp.password);
  if (!smtpReady) return null;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.password
    }
  });

  return { transporter, smtp };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const smtpConn = await getSmtpTransport();
  if (smtpConn) {
    try {
      const info = await smtpConn.transporter.sendMail({
        from: smtpConn.smtp.from,
        to: params.to,
        subject: params.subject,
        html: params.html
      });

      const messageId = info?.messageId || null;
      await logEmailDelivery({
        to: params.to,
        subject: params.subject,
        htmlLength: params.html.length,
        status: "sent",
        provider: "smtp",
        messageId
      });
      return { provider: "smtp", messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown SMTP error";
      await logEmailDelivery({
        to: params.to,
        subject: params.subject,
        htmlLength: params.html.length,
        status: "failed",
        provider: "smtp",
        errorMessage: message
      });
      if (!resend) {
        return { skipped: true };
      }
    }
  }

  if (!resend) {
    await logEmailDelivery({
      to: params.to,
      subject: params.subject,
      htmlLength: params.html.length,
      status: "skipped",
      provider: "none",
      errorMessage: "SMTP not configured and EMAIL_API_KEY missing"
    });
    return { skipped: true };
  }

  try {
    const result = await resend.emails.send({
      from: "Velora <noreply@velora.app>",
      to: params.to,
      subject: params.subject,
      html: params.html
    });

    const responseWithId = result as { data?: { id?: string } } | undefined;
    const messageId = responseWithId?.data?.id || null;
    await logEmailDelivery({
      to: params.to,
      subject: params.subject,
      htmlLength: params.html.length,
      status: "sent",
      provider: "resend",
      messageId
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    await logEmailDelivery({
      to: params.to,
      subject: params.subject,
      htmlLength: params.html.length,
      status: "failed",
      provider: "resend",
      errorMessage: message
    });
    throw error;
  }
}

export async function sendSmtpTestEmail(to: string) {
  const smtpConn = await getSmtpTransport();
  if (!smtpConn) {
    throw new Error("SMTP is not fully configured. Add host, port, username, and password.");
  }

  const subject = "Velora SMTP test";
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #533AFD, #6A5CFF); color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">SMTP Test Successful</h2>
      </div>
      <div style="padding: 24px; color: #111827;">
        <p>This is a test email from Velora admin SMTP settings.</p>
      </div>
    </div>
  `;

  try {
    const info = await smtpConn.transporter.sendMail({
      from: smtpConn.smtp.from,
      to,
      subject,
      html
    });
    const messageId = info?.messageId || null;
    await logEmailDelivery({
      to,
      subject,
      htmlLength: html.length,
      status: "sent",
      provider: "smtp_test",
      messageId
    });
    return { messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP test failed";
    await logEmailDelivery({
      to,
      subject,
      htmlLength: html.length,
      status: "failed",
      provider: "smtp_test",
      errorMessage: message
    });
    throw error;
  }
}

function renderTemplate(template: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((output, [key, value]) => {
    const safeValue = String(value ?? "");
    return output.replaceAll(`{{${key}}}`, safeValue);
  }, template);
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

async function dynamicEmailContent(params: {
  subjectKey: string;
  htmlKey: string;
  fallbackSubject: string;
  fallbackHtml: string;
  variables: Record<string, string>;
}) {
  const [subjectTpl, htmlTpl] = await Promise.all([
    getSettingString(params.subjectKey, params.fallbackSubject),
    getSettingString(params.htmlKey, params.fallbackHtml)
  ]);

  return {
    subject: renderTemplate(subjectTpl, params.variables),
    html: renderTemplate(htmlTpl, params.variables)
  };
}

export async function getOtpEmailContent(name: string, otp: string) {
  return dynamicEmailContent({
    subjectKey: "email_templates.otp_subject",
    htmlKey: "email_templates.otp_html",
    fallbackSubject: "Velora verification code",
    fallbackHtml: otpEmailTemplate(name, otp),
    variables: { name, otp }
  });
}

export async function getWelcomeEmailContent(name: string) {
  return dynamicEmailContent({
    subjectKey: "email_templates.welcome_subject",
    htmlKey: "email_templates.welcome_html",
    fallbackSubject: "Welcome to Velora",
    fallbackHtml: welcomeEmailTemplate(name),
    variables: { name }
  });
}

export async function getPaymentEmailContent(name: string, amount: string, description: string) {
  return dynamicEmailContent({
    subjectKey: "email_templates.payment_subject",
    htmlKey: "email_templates.payment_html",
    fallbackSubject: "Payment confirmed",
    fallbackHtml: paymentConfirmationTemplate(name, amount, description),
    variables: { name, amount, description }
  });
}

export async function canSendUserNotificationEmail() {
  const settings = await getSystemSettings();
  return settings.userEmailNotificationsEnabled;
}

export async function canSendInvoiceEmail() {
  const settings = await getSystemSettings();
  return settings.sendPaymentInvoiceEmail;
}
