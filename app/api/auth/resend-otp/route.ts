import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { OtpCode } from "@/models/OtpCode";
import { User } from "@/models/User";
import { generateOtp, hashOneWay } from "@/lib/auth";
import { getOtpEmailContent, sendEmail } from "@/lib/email";

const schema = z.object({
  userId: z.string().min(8)
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("userId is required", 422);

  await connectToDatabase();
  const user = await User.findById(parsed.data.userId).select("_id email name isVerified");
  if (!user) return fail("User not found", 404);
  if (user.isVerified) return fail("Email already verified", 409);

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const userKey = `resend:register:${String(user._id)}`;
  const ipKey = `resend:register:ip:${ip}`;
  const userLimit = checkRateLimit(userKey, 3, 15 * 60_000);
  const ipLimit = checkRateLimit(ipKey, 3, 15 * 60_000);
  if (!userLimit.allowed || !ipLimit.allowed) {
    const resetAt = Math.max(userLimit.resetAt || 0, ipLimit.resetAt || 0);
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    return NextResponse.json(
      {
        success: false,
        message: `Too many resend attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
        data: { retryAfterSec }
      },
      { status: 429 }
    );
  }

  await OtpCode.updateMany(
    { userId: user._id, purpose: "email_verification", consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await OtpCode.create({
    userId: user._id,
    email: user.email,
    codeHash: hashOneWay(otp),
    purpose: "email_verification",
    expiresAt
  });

  const otpEmail = await getOtpEmailContent(user.name || "User", otp);
  const emailResult = await sendEmail({
    to: user.email,
    subject: otpEmail.subject,
    html: otpEmail.html
  });
  if ("skipped" in emailResult && emailResult.skipped) {
    return fail("OTP email service is not configured. Please configure SMTP in Admin > Settings > SMTP.", 503);
  }

  return ok({
    resent: true,
    otpExpiresInSec: 600,
    resendCooldownSec: 60
  });
}
