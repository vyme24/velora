import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { generateOtp, hashOneWay, hashPassword, signAuthToken, signRefreshToken } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";
import { fail, ok } from "@/lib/http";
import { User } from "@/models/User";
import { OtpCode } from "@/models/OtpCode";
import { canSendUserNotificationEmail, getOtpEmailContent, getWelcomeEmailContent, sendEmail } from "@/lib/email";
import { setAuthCookies } from "@/lib/session";
import { calculateAgeFromDob, isAdultDob } from "@/lib/dob";
import { getSystemSettings } from "@/lib/app-settings";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || "Invalid request", 422);
  }

  await connectToDatabase();
  const system = await getSystemSettings();

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return fail("Email already in use", 409);
  }

  const { acceptedAgePolicy, ...input } = parsed.data;
  void acceptedAgePolicy;
  if (!isAdultDob(input.dob)) {
    return fail("You must be at least 18 years old", 422);
  }
  const age = calculateAgeFromDob(input.dob);
  if (!Number.isFinite(age)) {
    return fail("Invalid date of birth", 422);
  }

  const password = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    username: input.username,
    email: input.email,
    gender: input.gender,
    lookingFor: input.lookingFor,
    dob: new Date(input.dob),
    age,
    password,
    isVerified: process.env.NODE_ENV !== "production" || !system.requireOtpRegistration
  });

  if (process.env.NODE_ENV !== "production" || !system.requireOtpRegistration) {
    if (await canSendUserNotificationEmail()) {
      const welcome = await getWelcomeEmailContent(user.name);
      await sendEmail({
        to: user.email,
        subject: welcome.subject,
        html: welcome.html
      });
    }

    const accessToken = signAuthToken({ userId: String(user._id), role: user.role });
    const refreshToken = signRefreshToken({ userId: String(user._id), role: user.role });

    const response = NextResponse.json({
      success: true,
      data: {
        userId: String(user._id),
        verificationRequired: false,
        autoLoggedIn: true
      }
    });

    setAuthCookies(response, { accessToken, refreshToken });
    return response;
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await OtpCode.updateMany(
    { userId: user._id, purpose: "email_verification", consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  await OtpCode.create({
    userId: user._id,
    email: user.email,
    codeHash: hashOneWay(otp),
    purpose: "email_verification",
    expiresAt
  });

  const otpEmail = await getOtpEmailContent(user.name, otp);
  const emailResult = await sendEmail({
    to: user.email,
    subject: otpEmail.subject,
    html: otpEmail.html
  });
  if ("skipped" in emailResult && emailResult.skipped) {
    return fail("OTP email service is not configured. Please configure SMTP in Admin > Settings > SMTP.", 503);
  }

  if (await canSendUserNotificationEmail()) {
    const welcome = await getWelcomeEmailContent(user.name);
    await sendEmail({
      to: user.email,
      subject: welcome.subject,
      html: welcome.html
    });
  }

  return ok(
    {
      userId: String(user._id),
      verificationRequired: true,
      otpExpiresInSec: 600,
      resendCooldownSec: 60
    },
    { status: 201 }
  );
}
