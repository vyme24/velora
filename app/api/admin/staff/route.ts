import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { verifyCsrf } from "@/lib/csrf";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { ADMIN_PERMISSIONS, ensureDefaultAdminRoles } from "@/lib/admin-roles";
import { AdminRole } from "@/models/AdminRole";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "super_admin"]).default("admin"),
  staffRoleKey: z.string().min(2).default("admin_manager")
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req, { permission: "manage_staff" });
  if ("response" in auth) return auth.response;

  await ensureDefaultAdminRoles();

  const [staff, roles] = await Promise.all([
    User.find({ role: { $in: ["admin", "super_admin"] } })
      .select("_id name email role staffRoleKey accountStatus isVerified createdAt")
      .sort({ createdAt: -1 })
      .limit(300),
    AdminRole.find({ active: true }).select("key name permissions description").sort({ key: 1 })
  ]);

  return ok({
    staff,
    roles,
    permissionsCatalog: ADMIN_PERMISSIONS,
    actorRole: auth.actor.role,
    actorPermissions: auth.permissions || []
  });
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { permission: "manage_staff" });
  if ("response" in auth) return auth.response;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  if (parsed.data.role === "super_admin" && auth.actor.role !== "super_admin") {
    return fail("Only super admin can create super admin", 403);
  }

  const roleExists = await AdminRole.findOne({ key: parsed.data.staffRoleKey.toLowerCase(), active: true });
  if (!roleExists && parsed.data.role !== "super_admin") {
    return fail("Invalid staff role", 422);
  }

  const exists = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (exists) return fail("Email already in use", 409);

  const password = await hashPassword(parsed.data.password);
  const created = await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    password,
    role: parsed.data.role,
    staffRoleKey: parsed.data.role === "super_admin" ? "super_admin" : parsed.data.staffRoleKey.toLowerCase(),
    accountStatus: "active",
    isVerified: true,
    age: 18,
    gender: "other",
    lookingFor: "all"
  });

  return ok({ staff: created }, { status: 201 });
}
