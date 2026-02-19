import { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail } from "@/lib/http";
import { User } from "@/models/User";

export async function requireAdminActor(req: NextRequest, options?: { superOnly?: boolean }) {
  const token = req.cookies.get("velora_token")?.value;
  if (!token) return { response: fail("Unauthorized", 401) };

  try {
    const payload = verifyAuthToken(token);
    await connectToDatabase();

    const actor = await User.findById(payload.userId).select("_id role accountStatus email");
    if (!actor || actor.accountStatus !== "active") {
      return { response: fail("Unauthorized", 401) };
    }

    if (actor.role !== "admin" && actor.role !== "super_admin") {
      return { response: fail("Forbidden", 403) };
    }

    if (options?.superOnly && actor.role !== "super_admin") {
      return { response: fail("Super admin required", 403) };
    }

    return { actor };
  } catch {
    return { response: fail("Unauthorized", 401) };
  }
}
