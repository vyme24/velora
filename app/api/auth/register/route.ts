import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { generateOtp, hashOneWay, hashPassword, signAuthToken, signRefreshToken } from "@/lib/auth";
import { registerSchema } from "@/lib/validations/auth";
import { fail, ok } from "@/lib/http";
import { User } from "@/models/User";
import { OtpCode } from "@/models/OtpCode";
import { otpEmailTemplate, sendEmail, welcomeEmailTemplate } from "@/lib/email";
import { setAuthCookies } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || "Invalid request", 422);
  }

  await connectToDatabase();

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return fail("Email already in use", 409);
  }

  const { acceptedAgePolicy, ...input } = parsed.data;
  void acceptedAgePolicy;
  const password = await hashPassword(input.password);
  const user = await User.create({
    ...input,
    password,
    isVerified: process.env.NODE_ENV !== "production"
  });

  if (process.env.NODE_ENV !== "production") {
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

  await OtpCode.create({
    userId: user._id,
    email: user.email,
    codeHash: hashOneWay(otp),
    purpose: "email_verification",
    expiresAt
  });

  const emailResult = await sendEmail({
    to: user.email,
    subject: "Velora verification code",
    html: otpEmailTemplate(user.name, otp)
  });

  await sendEmail({
    to: user.email,
    subject: "Welcome to Velora",
    html: welcomeEmailTemplate(user.name)
  });

  return ok(
    {
      userId: String(user._id),
      verificationRequired: true,
      devOtp:
        process.env.NODE_ENV !== "production" && "skipped" in emailResult && emailResult.skipped ? otp : undefined
    },
    { status: 201 }
  );
}
