import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { comparePassword, generateOtp, hashOneWay, signAuthToken, signRefreshToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { fail } from "@/lib/http";
import { User } from "@/models/User";
import { setAuthCookies } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api";
import { getSystemSettings } from "@/lib/app-settings";
import { getOtpEmailContent, sendEmail } from "@/lib/email";
import { OtpCode } from "@/models/OtpCode";

export async function POST(req: NextRequest) {
  return withApiHandler(req, async () => {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const limit = checkRateLimit(`login:${ip}`, 20, 60_000);
    if (!limit.allowed) return fail("Too many requests", 429);

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid credentials", 422);
    }

    await connectToDatabase();
    const system = await getSystemSettings();
    const user = await User.findOne({ email: parsed.data.email });

    if (!user) return fail("Invalid credentials", 401);

    const valid = await comparePassword(parsed.data.password, user.password);
    if (!valid) return fail("Invalid credentials", 401);
    if (process.env.NODE_ENV === "production" && !user.isVerified) {
      return fail("Email verification required", 403);
    }
    if (user.accountStatus !== "active") return fail("Account is not active", 403);

    if (system.requireOtpLogin) {
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await OtpCode.updateMany(
        { userId: user._id, purpose: "login_2fa", consumedAt: null },
        { $set: { consumedAt: new Date() } }
      );
      await OtpCode.create({
        userId: user._id,
        email: user.email,
        codeHash: hashOneWay(otp),
        purpose: "login_2fa",
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

      return NextResponse.json({
        success: true,
        data: {
          otpRequired: true,
          userId: String(user._id),
          otpExpiresInSec: 600,
          resendCooldownSec: 60
        }
      });
    }

    const accessToken = signAuthToken({ userId: String(user._id), role: user.role });
    const refreshToken = signRefreshToken({ userId: String(user._id), role: user.role });

    const response = NextResponse.json({
      success: true,
      data: { userId: String(user._id), role: user.role }
    });

    setAuthCookies(response, { accessToken, refreshToken });
    return response;
  });
}
