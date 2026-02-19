import { NextRequest } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { User } from "@/models/User";
import { adminUpdateUserSchema } from "@/lib/validations/admin";
import { verifyCsrf } from "@/lib/csrf";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = adminUpdateUserSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const target = await User.findById(params.id);
  if (!target) return fail("User not found", 404);

  const actor = auth.actor;

  if (target.role === "super_admin" && actor.role !== "super_admin") {
    return fail("Cannot modify super admin", 403);
  }

  if (parsed.data.role && actor.role !== "super_admin") {
    return fail("Only super admin can change roles", 403);
  }

  if (String(target._id) === String(actor._id) && parsed.data.accountStatus && parsed.data.accountStatus !== "active") {
    return fail("Cannot deactivate/disable yourself", 422);
  }

  if (parsed.data.name !== undefined) target.name = parsed.data.name;
  if (parsed.data.role !== undefined) target.role = parsed.data.role;
  if (parsed.data.accountStatus !== undefined) target.accountStatus = parsed.data.accountStatus;
  if (parsed.data.isVerified !== undefined) target.isVerified = parsed.data.isVerified;

  await target.save();

  return ok({
    _id: target._id,
    name: target.name,
    email: target.email,
    role: target.role,
    accountStatus: target.accountStatus,
    isVerified: target.isVerified
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { superOnly: true });
  if ("response" in auth) return auth.response;

  const target = await User.findById(params.id);
  if (!target) return fail("User not found", 404);

  if (String(target._id) === String(auth.actor._id)) {
    return fail("Cannot delete yourself", 422);
  }

  target.accountStatus = "deactivated";
  target.deletedAt = new Date();
  await target.save();

  return ok({ deleted: true });
}
