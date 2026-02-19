import { NextRequest } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { User } from "@/models/User";
import { adminCreateUserSchema } from "@/lib/validations/admin";
import { hashPassword } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if ("response" in auth) return auth.response;

  const users = await User.find({})
    .select("_id name email role accountStatus isVerified subscriptionPlan subscription createdAt deletedAt")
    .sort({ createdAt: -1 })
    .limit(500);

  return ok({ users, actorRole: auth.actor.role });
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { superOnly: true });
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = adminCreateUserSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const exists = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (exists) return fail("Email already in use", 409);

  const password = await hashPassword(parsed.data.password);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    password,
    role: parsed.data.role,
    age: parsed.data.age ?? 18,
    gender: parsed.data.gender ?? "other",
    lookingFor: parsed.data.lookingFor ?? "all",
    isVerified: true,
    accountStatus: "active"
  });

  return ok(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    },
    { status: 201 }
  );
}
