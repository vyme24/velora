import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { verifyCsrf } from "@/lib/csrf";
import { AppSetting } from "@/models/AppSetting";
import { getEditableSettings } from "@/lib/app-settings";

const patchSchema = z.object({
  key: z.string().min(2).max(120),
  numberValue: z.number().min(0).max(1000000).optional(),
  stringValue: z.string().max(10000).optional(),
  booleanValue: z.boolean().optional()
});

function isSensitiveSettingKey(key: string) {
  const normalized = key.toLowerCase();
  return (
    normalized.includes("password") ||
    normalized.includes("secret") ||
    normalized.includes("private_key") ||
    normalized.includes("token")
  );
}

function sanitizeSetting<T extends { key?: string; valueType?: string; stringValue?: string | null }>(setting: T) {
  const key = String(setting.key || "").toLowerCase();
  if (setting.valueType !== "string" || !isSensitiveSettingKey(key)) return setting;
  return {
    ...setting,
    stringValue: ""
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req, { permission: "manage_settings" });
  if ("response" in auth) return auth.response;

  const group = req.nextUrl.searchParams.get("group") || undefined;
  const settings = await getEditableSettings(group);
  return ok({
    settings: settings.map((setting) =>
      sanitizeSetting(typeof (setting as { toObject?: () => Record<string, unknown> }).toObject === "function" ? setting.toObject() : setting)
    ),
    actorRole: auth.actor.role
  });
}

export async function PATCH(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { permission: "manage_settings" });
  if ("response" in auth) return auth.response;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const data = parsed.data;
  const setting = await AppSetting.findOne({ key: data.key.toLowerCase(), editable: true });
  if (!setting) return fail("Setting not found", 404);

  if (setting.valueType === "number") {
    if (typeof data.numberValue !== "number") return fail("numberValue is required for this setting", 422);
    setting.numberValue = Math.max(0, Math.round(data.numberValue));
  } else if (setting.valueType === "string") {
    if (typeof data.stringValue !== "string") return fail("stringValue is required for this setting", 422);
    setting.stringValue = data.stringValue;
  } else if (setting.valueType === "boolean") {
    if (typeof data.booleanValue !== "boolean") return fail("booleanValue is required for this setting", 422);
    setting.booleanValue = data.booleanValue;
  }

  await setting.save();
  return ok({ setting: sanitizeSetting(setting.toObject()) });
}
