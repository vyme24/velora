import { AdminRole } from "@/models/AdminRole";

export const ADMIN_PERMISSIONS = [
  "view_dashboard",
  "manage_users",
  "manage_staff",
  "manage_pricing",
  "manage_settings",
  "view_payments"
] as const;

type Permission = (typeof ADMIN_PERMISSIONS)[number];

const DEFAULT_ROLES: Array<{
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
  system: boolean;
}> = [
  {
    key: "admin_manager",
    name: "Admin Manager",
    description: "Full day-to-day operations access.",
    permissions: ["view_dashboard", "manage_users", "manage_staff", "manage_pricing", "manage_settings", "view_payments"],
    system: true
  },
  {
    key: "support_agent",
    name: "Support Agent",
    description: "User support and moderation access.",
    permissions: ["view_dashboard", "manage_users"],
    system: true
  },
  {
    key: "billing_manager",
    name: "Billing Manager",
    description: "Payment and pricing access.",
    permissions: ["view_dashboard", "manage_pricing", "view_payments"],
    system: true
  },
  {
    key: "moderator",
    name: "Moderator",
    description: "User safety and account moderation.",
    permissions: ["view_dashboard", "manage_users"],
    system: true
  }
];

let seeded = false;

export async function ensureDefaultAdminRoles() {
  if (seeded) return;
  for (const role of DEFAULT_ROLES) {
    await AdminRole.updateOne(
      { key: role.key },
      {
        $setOnInsert: {
          ...role,
          active: true
        }
      },
      { upsert: true }
    );
  }
  seeded = true;
}

export async function getPermissionsForActor(actor: { role: string; staffRoleKey?: string | null }) {
  await ensureDefaultAdminRoles();
  if (actor.role === "super_admin") {
    return { staffRoleKey: "super_admin", staffRoleName: "Super Admin", permissions: ["*"] };
  }
  if (actor.role !== "admin") {
    return { staffRoleKey: "user", staffRoleName: "User", permissions: [] as string[] };
  }

  const fallbackKey = "admin_manager";
  const roleKey = (actor.staffRoleKey || fallbackKey).toLowerCase();
  const row = await AdminRole.findOne({ key: roleKey, active: true }).select("key name permissions");

  if (!row) {
    const fallback = await AdminRole.findOne({ key: fallbackKey, active: true }).select("key name permissions");
    return {
      staffRoleKey: fallback?.key || fallbackKey,
      staffRoleName: fallback?.name || "Admin Manager",
      permissions: fallback?.permissions || []
    };
  }

  return {
    staffRoleKey: row.key,
    staffRoleName: row.name,
    permissions: row.permissions || []
  };
}

