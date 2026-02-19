import { connectToDatabase } from "@/lib/db";
import { ok } from "@/lib/http";
import { getCoinRules, getLocalizationSettings, getNotificationRuntimeSettings, getSystemSettings } from "@/lib/app-settings";

export async function GET() {
  await connectToDatabase();
  const [system, notifications, coinRules, localization] = await Promise.all([
    getSystemSettings(),
    getNotificationRuntimeSettings(),
    getCoinRules(),
    getLocalizationSettings()
  ]);

  return ok({
    system,
    notifications,
    coinRules,
    localization
  });
}
