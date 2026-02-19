import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { hashOneWay, hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid reset payload", 422);
  }

  await connectToDatabase();

  const tokenHash = hashOneWay(parsed.data.token);
  const resetDoc = await PasswordResetToken.findOne({ tokenHash, consumedAt: null });

  if (!resetDoc) return fail("Reset token not found", 404);
  if (resetDoc.expiresAt.getTime() < Date.now()) return fail("Reset token expired", 410);

  const nextPasswordHash = await hashPassword(parsed.data.password);

  await User.updateOne({ _id: resetDoc.userId }, { $set: { password: nextPasswordHash } });

  resetDoc.consumedAt = new Date();
  await resetDoc.save();

  return ok({ passwordUpdated: true });
}
