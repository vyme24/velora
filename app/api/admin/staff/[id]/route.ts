import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { verifyCsrf } from "@/lib/csrf";
import { User } from "@/models/User";
import { AdminRole } from "@/models/AdminRole";

const patchSchema = z
  .object({
    name: z.string().min(2).optional(),
    role: z.enum(["admin", "super_admin"]).optional(),
    staffRoleKey: z.string().min(2).optional(),
    accountStatus: z.enum(["active", "deactivated", "disabled"]).optional(),
    isVerified: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { permission: "manage_staff" });
  if ("response" in auth) return auth.response;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const target = await User.findById(params.id);
  if (!target) return fail("Staff user not found", 404);
  if (target.role !== "admin" && target.role !== "super_admin") return fail("Target is not staff", 422);

  if (String(target._id) === String(auth.actor._id) && parsed.data.accountStatus && parsed.data.accountStatus !== "active") {
    return fail("Cannot deactivate/disable yourself", 422);
  }

  if (target.role === "super_admin" && auth.actor.role !== "super_admin") {
    return fail("Cannot modify super admin", 403);
  }

  if (parsed.data.role === "super_admin" && auth.actor.role !== "super_admin") {
    return fail("Only super admin can assign super admin role", 403);
  }

  if (parsed.data.staffRoleKey && parsed.data.role !== "super_admin") {
    const roleExists = await AdminRole.findOne({ key: parsed.data.staffRoleKey.toLowerCase(), active: true });
    if (!roleExists) return fail("Invalid staff role", 422);
    target.staffRoleKey = parsed.data.staffRoleKey.toLowerCase();
  }

  if (parsed.data.name !== undefined) target.name = parsed.data.name;
  if (parsed.data.role !== undefined) {
    target.role = parsed.data.role;
    target.staffRoleKey = parsed.data.role === "super_admin" ? "super_admin" : target.staffRoleKey || "admin_manager";
  }
  if (parsed.data.accountStatus !== undefined) target.accountStatus = parsed.data.accountStatus;
  if (parsed.data.isVerified !== undefined) target.isVerified = parsed.data.isVerified;

  await target.save();
  return ok({ staff: target });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { permission: "manage_staff" });
  if ("response" in auth) return auth.response;

  const target = await User.findById(params.id);
  if (!target) return fail("Staff user not found", 404);
  if (String(target._id) === String(auth.actor._id)) return fail("Cannot delete yourself", 422);
  if (target.role === "super_admin" && auth.actor.role !== "super_admin") return fail("Cannot delete super admin", 403);

  target.accountStatus = "deactivated";
  target.deletedAt = new Date();
  await target.save();
  return ok({ deleted: true });
}

