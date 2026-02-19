import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { getRefreshToken, setAuthCookies } from "@/lib/session";
import { signAuthToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { withApiHandler } from "@/lib/api";

export async function POST(req: NextRequest) {
  return withApiHandler(req, async () => {
    const refreshToken = getRefreshToken(req);
    if (!refreshToken) return fail("Missing refresh token", 401);

    let decoded: { userId: string; role: "user" | "admin" | "super_admin"; type?: string };
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return fail("Invalid refresh token", 401);
    }

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    if (!user || user.accountStatus !== "active") return fail("Unauthorized", 401);

    const nextAccessToken = signAuthToken({ userId: String(user._id), role: user.role });
    const nextRefreshToken = signRefreshToken({ userId: String(user._id), role: user.role });

    const response = NextResponse.json({ success: true, data: { userId: String(user._id), role: user.role } });
    setAuthCookies(response, { accessToken: nextAccessToken, refreshToken: nextRefreshToken });
    return response;
  });
}
