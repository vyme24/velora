import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { comparePassword, signAuthToken, signRefreshToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { fail } from "@/lib/http";
import { User } from "@/models/User";
import { setAuthCookies } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api";

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
    const user = await User.findOne({ email: parsed.data.email });

    if (!user) return fail("Invalid credentials", 401);

    const valid = await comparePassword(parsed.data.password, user.password);
    if (!valid) return fail("Invalid credentials", 401);
    if (process.env.NODE_ENV === "production" && !user.isVerified) {
      return fail("Email verification required", 403);
    }
    if (user.accountStatus !== "active") return fail("Account is not active", 403);

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
