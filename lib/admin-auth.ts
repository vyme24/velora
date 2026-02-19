import { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail } from "@/lib/http";
import { getPermissionsForActor } from "@/lib/admin-roles";
import { User } from "@/models/User";

export async function requireAdminActor(req: NextRequest, options?: { superOnly?: boolean; permission?: string }) {
  const token = req.cookies.get("velora_token")?.value;
  if (!token) return { response: fail("Unauthorized", 401) };

  try {
    const payload = verifyAuthToken(token);
    await connectToDatabase();

    const actor = await User.findById(payload.userId).select("_id role accountStatus email staffRoleKey");
    if (!actor || actor.accountStatus !== "active") {
      return { response: fail("Unauthorized", 401) };
    }

    if (actor.role !== "admin" && actor.role !== "super_admin") {
      return { response: fail("Forbidden", 403) };
    }

    if (options?.superOnly && actor.role !== "super_admin") {
      return { response: fail("Super admin required", 403) };
    }

    const permissionInfo = await getPermissionsForActor({
      role: actor.role,
      staffRoleKey: actor.staffRoleKey || null
    });

    if (options?.permission && actor.role !== "super_admin" && !permissionInfo.permissions.includes(options.permission)) {
      return { response: fail("Permission denied", 403) };
    }

    return {
      actor,
      permissions: permissionInfo.permissions,
      staffRoleKey: permissionInfo.staffRoleKey,
      staffRoleName: permissionInfo.staffRoleName
    };
  } catch {
    return { response: fail("Unauthorized", 401) };
  }
}
