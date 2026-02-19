import { NextRequest } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req, { permission: "manage_users" });
  if ("response" in auth) return auth.response;

  const users = await User.find({ role: "user" })
    .select("_id name email role accountStatus isVerified subscriptionPlan subscription createdAt deletedAt")
    .sort({ createdAt: -1 })
    .limit(500);

  return ok({ users, actorRole: auth.actor.role });
}

export async function POST() {
  return fail("Create user moved to Staff & Access page", 405);
}
