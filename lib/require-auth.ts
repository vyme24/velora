import { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import { verifyAuthToken } from "@/lib/auth";
import { getAccessToken } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export async function requireAuthUser(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) return { response: fail("Unauthorized", 401) };

  try {
    const payload = verifyAuthToken(token);
    await connectToDatabase();
    const user = await User.findById(payload.userId);
    if (!user) return { response: fail("Unauthorized", 401) };
    if (user.accountStatus !== "active") return { response: fail("Account is not active", 403) };
    return { user };
  } catch {
    return { response: fail("Unauthorized", 401) };
  }
}
