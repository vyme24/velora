import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { hashOneWay, signAuthToken, signRefreshToken } from "@/lib/auth";
import { fail } from "@/lib/http";
import { verifyOtpSchema } from "@/lib/validations/auth";
import { OtpCode } from "@/models/OtpCode";
import { User } from "@/models/User";
import { setAuthCookies } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) return fail("OTP and userId required", 422);

  await connectToDatabase();

  const otpDoc = await OtpCode.findOne({
    userId: parsed.data.userId,
    purpose: "login_2fa",
    consumedAt: null
  }).sort({ createdAt: -1 });

  if (!otpDoc) return fail("OTP not found", 404);
  if (otpDoc.expiresAt.getTime() < Date.now()) return fail("OTP expired", 410);
  if (otpDoc.attempts >= 5) return fail("Too many attempts", 429);

  const incomingHash = hashOneWay(parsed.data.otp);
  if (incomingHash !== otpDoc.codeHash) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    return fail("Invalid OTP", 401);
  }

  const user = await User.findById(parsed.data.userId);
  if (!user || user.accountStatus !== "active") return fail("Unauthorized", 401);

  otpDoc.consumedAt = new Date();
  await otpDoc.save();

  const accessToken = signAuthToken({ userId: String(user._id), role: user.role });
  const refreshToken = signRefreshToken({ userId: String(user._id), role: user.role });

  const response = NextResponse.json({ success: true, data: { userId: String(user._id), role: user.role } });
  setAuthCookies(response, { accessToken, refreshToken });
  return response;
}
