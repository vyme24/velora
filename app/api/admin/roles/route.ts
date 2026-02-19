import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { verifyCsrf } from "@/lib/csrf";
import { AdminRole } from "@/models/AdminRole";
import { ADMIN_PERMISSIONS, ensureDefaultAdminRoles } from "@/lib/admin-roles";

const patchSchema = z.object({
  key: z.string().min(2),
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(220).optional(),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).optional(),
  active: z.boolean().optional()
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req, { permission: "manage_staff" });
  if ("response" in auth) return auth.response;

  await ensureDefaultAdminRoles();
  const roles = await AdminRole.find({}).sort({ system: -1, key: 1 });
  return ok({ roles, permissions: ADMIN_PERMISSIONS });
}

export async function PATCH(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { permission: "manage_staff" });
  if ("response" in auth) return auth.response;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const updated = await AdminRole.findOneAndUpdate(
    { key: parsed.data.key.toLowerCase() },
    {
      $set: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.permissions !== undefined ? { permissions: parsed.data.permissions } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {})
      }
    },
    { new: true }
  );

  if (!updated) return fail("Role not found", 404);
  return ok({ role: updated });
}

