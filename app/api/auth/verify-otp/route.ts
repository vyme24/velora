import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { hashOneWay } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { verifyOtpSchema } from "@/lib/validations/auth";
import { OtpCode } from "@/models/OtpCode";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = verifyOtpSchema.safeParse(body);

  if (!parsed.success) {
    return fail("OTP and userId required", 422);
  }

  await connectToDatabase();

  const otpDoc = await OtpCode.findOne({
    userId: parsed.data.userId,
    purpose: "email_verification",
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

  otpDoc.consumedAt = new Date();
  await otpDoc.save();

  await User.updateOne(
    { _id: parsed.data.userId },
    {
      $set: {
        isVerified: true,
        "verification.emailOtpVerifiedAt": new Date(),
        "verification.badgeLevel": "basic"
      }
    }
  );

  return ok({ verified: true });
}
