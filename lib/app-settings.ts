import { AppSetting } from "@/models/AppSetting";

const DEFAULT_SETTINGS = [
  {
    key: "coins.message_cost",
    valueType: "number" as const,
    numberValue: 50,
    label: "Message Cost",
    description: "Coins charged when sending each message.",
    group: "coins"
  },
  {
    key: "coins.profile_unlock_cost",
    valueType: "number" as const,
    numberValue: 70,
    label: "Profile Unlock Cost",
    description: "Coins charged to unlock private profile photos.",
    group: "coins"
  },
  {
    key: "integrations.smtp_host",
    valueType: "string" as const,
    stringValue: "",
    label: "SMTP Host",
    description: "SMTP server host for outbound emails.",
    group: "integrations"
  },
  {
    key: "integrations.smtp_port",
    valueType: "number" as const,
    numberValue: 587,
    label: "SMTP Port",
    description: "SMTP server port.",
    group: "integrations"
  },
  {
    key: "integrations.smtp_user",
    valueType: "string" as const,
    stringValue: "",
    label: "SMTP Username",
    description: "SMTP auth username.",
    group: "integrations"
  },
  {
    key: "integrations.smtp_from",
    valueType: "string" as const,
    stringValue: "noreply@velora.app",
    label: "SMTP From Address",
    description: "Default sender address for emails.",
    group: "integrations"
  },
  {
    key: "integrations.smtp_secure",
    valueType: "boolean" as const,
    booleanValue: false,
    label: "SMTP Secure",
    description: "Use secure SMTP transport.",
    group: "integrations"
  },
  {
    key: "integrations.stripe_enabled",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "Stripe Enabled",
    description: "Enable Stripe payment gateway.",
    group: "integrations"
  },
  {
    key: "integrations.stripe_publishable_key",
    valueType: "string" as const,
    stringValue: "",
    label: "Stripe Publishable Key",
    description: "Stripe publishable key used by frontend checkout.",
    group: "integrations"
  },
  {
    key: "integrations.stripe_secret_key",
    valueType: "string" as const,
    stringValue: "",
    label: "Stripe Secret Key",
    description: "Stripe secret key for backend charges/webhooks.",
    group: "integrations"
  },
  {
    key: "integrations.stripe_webhook_secret",
    valueType: "string" as const,
    stringValue: "",
    label: "Stripe Webhook Secret",
    description: "Stripe webhook signature secret.",
    group: "integrations"
  }
];

let settingsSeeded = false;

export async function ensureDefaultAppSettings() {
  if (settingsSeeded) return;

  for (const setting of DEFAULT_SETTINGS) {
    await AppSetting.updateOne(
      { key: setting.key },
      {
        $setOnInsert: {
          ...setting,
          editable: true,
          active: true
        }
      },
      { upsert: true }
    );
  }

  settingsSeeded = true;
}

export async function getSettingNumber(key: string, fallback: number) {
  await ensureDefaultAppSettings();
  const row = await AppSetting.findOne({ key: key.toLowerCase(), active: true }).select("numberValue");
  if (!row || typeof row.numberValue !== "number" || Number.isNaN(row.numberValue)) return fallback;
  return Math.max(0, Math.round(row.numberValue));
}

export async function getCoinRules() {
  const [messageCost, profileUnlockCost] = await Promise.all([
    getSettingNumber("coins.message_cost", 50),
    getSettingNumber("coins.profile_unlock_cost", 70)
  ]);

  return { messageCost, profileUnlockCost };
}

export async function getEditableSettings(group?: string) {
  await ensureDefaultAppSettings();
  return AppSetting.find({
    editable: true,
    ...(group ? { group: group.toLowerCase() } : {})
  }).sort({ group: 1, key: 1 });
}
