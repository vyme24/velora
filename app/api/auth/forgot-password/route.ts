import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { fail, ok } from "@/lib/http";
import { User } from "@/models/User";
import { resetPasswordEmailTemplate, sendEmail } from "@/lib/email";
import { generateSecureToken, hashOneWay } from "@/lib/auth";
import { PasswordResetToken } from "@/models/PasswordResetToken";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Invalid email", 422);
  }

  await connectToDatabase();
  const user = await User.findOne({ email: parsed.data.email });

  if (!user) {
    return ok({ sent: true });
  }

  const rawToken = generateSecureToken();
  const tokenHash = hashOneWay(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: "Velora reset password",
    html: resetPasswordEmailTemplate(user.name, resetUrl)
  });

  return ok({ sent: true });
}
