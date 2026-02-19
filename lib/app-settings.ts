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
    key: "integrations.smtp_password",
    valueType: "string" as const,
    stringValue: "",
    label: "SMTP Password",
    description: "SMTP auth password or app password.",
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
  },
  {
    key: "offers.limited_enabled",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "Limited Offer Enabled",
    description: "Show limited offer banner and allow direct offer checkout.",
    group: "offers"
  },
  {
    key: "offers.limited_code",
    valueType: "string" as const,
    stringValue: "limited_700_499",
    label: "Limited Offer Code",
    description: "Offer code sent to checkout for validation.",
    group: "offers"
  },
  {
    key: "offers.limited_badge",
    valueType: "string" as const,
    stringValue: "Limited Offer",
    label: "Limited Offer Badge",
    description: "Small badge text shown on banner.",
    group: "offers"
  },
  {
    key: "offers.limited_headline",
    valueType: "string" as const,
    stringValue: "DOUBLE",
    label: "Limited Offer Headline",
    description: "Main banner headline.",
    group: "offers"
  },
  {
    key: "offers.limited_coins",
    valueType: "number" as const,
    numberValue: 700,
    label: "Limited Offer Coins",
    description: "Coins granted by the offer.",
    group: "offers"
  },
  {
    key: "offers.limited_amount_cents",
    valueType: "number" as const,
    numberValue: 499,
    label: "Limited Offer Amount (cents)",
    description: "Checkout amount in cents.",
    group: "offers"
  },
  {
    key: "offers.limited_currency",
    valueType: "string" as const,
    stringValue: "USD",
    label: "Limited Offer Currency",
    description: "Currency code for limited offer amount.",
    group: "offers"
  },
  {
    key: "offers.limited_cta",
    valueType: "string" as const,
    stringValue: "Claim deal now",
    label: "Limited Offer CTA",
    description: "Button label for limited offer.",
    group: "offers"
  },
  {
    key: "offers.limited_reason",
    valueType: "string" as const,
    stringValue: "Claim deal now and get coins instantly.",
    label: "Limited Offer Reason",
    description: "Reason text used when opening coin modal.",
    group: "offers"
  },
  {
    key: "system.user_email_notifications_enabled",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "User Email Notifications",
    description: "Master toggle for non-security user notification emails.",
    group: "system"
  },
  {
    key: "system.require_otp_registration",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "Require OTP On Registration",
    description: "Require email OTP verification during registration.",
    group: "system"
  },
  {
    key: "system.require_otp_login",
    valueType: "boolean" as const,
    booleanValue: false,
    label: "Require OTP On Login",
    description: "Require a login OTP after password verification.",
    group: "system"
  },
  {
    key: "system.passkey_enabled",
    valueType: "boolean" as const,
    booleanValue: false,
    label: "Passkey Login Enabled",
    description: "Enable passkey-based authentication flows.",
    group: "system"
  },
  {
    key: "system.send_payment_invoice_email",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "Send Payment Invoice Email",
    description: "Send invoice/payment confirmation email after successful payment.",
    group: "system"
  },
  {
    key: "notifications.in_app_enabled",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "In-App Notifications",
    description: "Enable in-app notifications for users.",
    group: "notifications"
  },
  {
    key: "notifications.push_enabled",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "Push Notifications",
    description: "Enable push delivery for supported devices.",
    group: "notifications"
  },
  {
    key: "notifications.email_enabled",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "Email Notifications",
    description: "Allow non-security lifecycle and engagement email notifications.",
    group: "notifications"
  },
  {
    key: "notifications.new_message_enabled",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "New Message Alerts",
    description: "Notify users when a new message is received.",
    group: "notifications"
  },
  {
    key: "notifications.new_match_enabled",
    valueType: "boolean" as const,
    booleanValue: true,
    label: "New Match Alerts",
    description: "Notify users when a new match is created.",
    group: "notifications"
  },
  {
    key: "notifications.marketing_enabled",
    valueType: "boolean" as const,
    booleanValue: false,
    label: "Marketing Campaign Notifications",
    description: "Allow promotional announcements and campaign notifications.",
    group: "notifications"
  },
  {
    key: "notifications.quiet_hours_enabled",
    valueType: "boolean" as const,
    booleanValue: false,
    label: "Quiet Hours",
    description: "Suppress non-urgent notifications during configured quiet hours.",
    group: "notifications"
  },
  {
    key: "notifications.quiet_hours_start",
    valueType: "string" as const,
    stringValue: "22:00",
    label: "Quiet Hours Start",
    description: "Start time for quiet hours (24h format).",
    group: "notifications"
  },
  {
    key: "notifications.quiet_hours_end",
    valueType: "string" as const,
    stringValue: "08:00",
    label: "Quiet Hours End",
    description: "End time for quiet hours (24h format).",
    group: "notifications"
  },
  {
    key: "localization.default_language",
    valueType: "string" as const,
    stringValue: "en",
    label: "Default Language",
    description: "Default UI language code (e.g. en, es, fr, hi).",
    group: "localization"
  },
  {
    key: "localization.enabled_languages",
    valueType: "string" as const,
    stringValue: "en,es,fr,hi",
    label: "Enabled Languages",
    description: "Comma separated language codes available to users.",
    group: "localization"
  },
  {
    key: "localization.default_locale",
    valueType: "string" as const,
    stringValue: "en-US",
    label: "Default Locale",
    description: "Locale used for formatting (e.g. en-US, es-ES, hi-IN).",
    group: "localization"
  },
  {
    key: "localization.default_currency",
    valueType: "string" as const,
    stringValue: "USD",
    label: "Default Currency",
    description: "Default currency code for prices (e.g. USD, EUR, INR).",
    group: "localization"
  },
  {
    key: "email_templates.otp_subject",
    valueType: "string" as const,
    stringValue: "Velora verification code",
    label: "OTP Email Subject",
    description: "Subject for OTP email messages.",
    group: "email_templates"
  },
  {
    key: "email_templates.otp_html",
    valueType: "string" as const,
    stringValue:
      "<h2>Velora Verification</h2><p>Hi {{name}}, your OTP is <strong>{{otp}}</strong>. This code expires in 10 minutes.</p>",
    label: "OTP Email HTML",
    description: "HTML template. Available variables: {{name}}, {{otp}}",
    group: "email_templates"
  },
  {
    key: "email_templates.welcome_subject",
    valueType: "string" as const,
    stringValue: "Welcome to Velora",
    label: "Welcome Email Subject",
    description: "Subject for welcome email.",
    group: "email_templates"
  },
  {
    key: "email_templates.welcome_html",
    valueType: "string" as const,
    stringValue:
      "<h2>Welcome to Velora</h2><p>Hi {{name}}, your profile is ready. Complete photos and interests to improve your match quality.</p>",
    label: "Welcome Email HTML",
    description: "HTML template. Available variables: {{name}}",
    group: "email_templates"
  },
  {
    key: "email_templates.payment_subject",
    valueType: "string" as const,
    stringValue: "Payment confirmed",
    label: "Payment Email Subject",
    description: "Subject for payment confirmation/invoice emails.",
    group: "email_templates"
  },
  {
    key: "email_templates.payment_html",
    valueType: "string" as const,
    stringValue:
      "<h2>Payment Confirmed</h2><p>Hi {{name}}, we received your payment of <strong>{{amount}}</strong>.</p><p>{{description}}</p>",
    label: "Payment Email HTML",
    description: "HTML template. Variables: {{name}}, {{amount}}, {{description}}",
    group: "email_templates"
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

export async function getSettingString(key: string, fallback: string) {
  await ensureDefaultAppSettings();
  const row = await AppSetting.findOne({ key: key.toLowerCase(), active: true }).select("stringValue");
  if (!row || typeof row.stringValue !== "string") return fallback;
  return row.stringValue;
}

export async function getSettingBoolean(key: string, fallback: boolean) {
  await ensureDefaultAppSettings();
  const row = await AppSetting.findOne({ key: key.toLowerCase(), active: true }).select("booleanValue");
  if (!row || typeof row.booleanValue !== "boolean") return fallback;
  return row.booleanValue;
}

export async function getCoinRules() {
  const [messageCost, profileUnlockCost] = await Promise.all([
    getSettingNumber("coins.message_cost", 50),
    getSettingNumber("coins.profile_unlock_cost", 70)
  ]);

  return { messageCost, profileUnlockCost };
}

export async function getLimitedOfferSettings() {
  const [enabled, code, badge, headline, coins, amountCents, currency, cta, reason] = await Promise.all([
    getSettingBoolean("offers.limited_enabled", true),
    getSettingString("offers.limited_code", "limited_700_499"),
    getSettingString("offers.limited_badge", "Limited Offer"),
    getSettingString("offers.limited_headline", "DOUBLE"),
    getSettingNumber("offers.limited_coins", 700),
    getSettingNumber("offers.limited_amount_cents", 499),
    getSettingString("offers.limited_currency", "USD"),
    getSettingString("offers.limited_cta", "Claim deal now"),
    getSettingString("offers.limited_reason", "Claim deal now and get coins instantly.")
  ]);

  return {
    enabled,
    code,
    badge,
    headline,
    coins,
    amountCents,
    currency: currency.toUpperCase(),
    cta,
    reason,
    label: `${badge} ${headline}`.trim(),
    subtext: `Get ${coins} coins for ${currency.toUpperCase()} ${(amountCents / 100).toFixed(2)}`
  };
}

export async function getSystemSettings() {
  const [userEmailNotificationsEnabled, requireOtpRegistration, requireOtpLogin, passkeyEnabled, sendPaymentInvoiceEmail] = await Promise.all([
    getSettingBoolean("system.user_email_notifications_enabled", true),
    getSettingBoolean("system.require_otp_registration", true),
    getSettingBoolean("system.require_otp_login", false),
    getSettingBoolean("system.passkey_enabled", false),
    getSettingBoolean("system.send_payment_invoice_email", true)
  ]);

  return {
    userEmailNotificationsEnabled,
    requireOtpRegistration,
    requireOtpLogin,
    passkeyEnabled,
    sendPaymentInvoiceEmail
  };
}

export async function getSmtpSettings() {
  const [host, port, user, password, from, secure] = await Promise.all([
    getSettingString("integrations.smtp_host", ""),
    getSettingNumber("integrations.smtp_port", 587),
    getSettingString("integrations.smtp_user", ""),
    getSettingString("integrations.smtp_password", ""),
    getSettingString("integrations.smtp_from", "noreply@velora.app"),
    getSettingBoolean("integrations.smtp_secure", false)
  ]);

  return {
    host: host.trim(),
    port: Math.max(1, Math.min(65535, port)),
    user: user.trim(),
    password,
    from: from.trim() || "noreply@velora.app",
    secure
  };
}

export async function getNotificationRuntimeSettings() {
  const [
    inAppEnabled,
    pushEnabled,
    emailEnabled,
    newMessageEnabled,
    newMatchEnabled,
    marketingEnabled,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd
  ] = await Promise.all([
    getSettingBoolean("notifications.in_app_enabled", true),
    getSettingBoolean("notifications.push_enabled", true),
    getSettingBoolean("notifications.email_enabled", true),
    getSettingBoolean("notifications.new_message_enabled", true),
    getSettingBoolean("notifications.new_match_enabled", true),
    getSettingBoolean("notifications.marketing_enabled", false),
    getSettingBoolean("notifications.quiet_hours_enabled", false),
    getSettingString("notifications.quiet_hours_start", "22:00"),
    getSettingString("notifications.quiet_hours_end", "08:00")
  ]);

  return {
    inAppEnabled,
    pushEnabled,
    emailEnabled,
    newMessageEnabled,
    newMatchEnabled,
    marketingEnabled,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd
  };
}

export async function getLocalizationSettings() {
  const [defaultLanguage, enabledLanguagesRaw, defaultLocale, defaultCurrency] = await Promise.all([
    getSettingString("localization.default_language", "en"),
    getSettingString("localization.enabled_languages", "en,es,fr,hi"),
    getSettingString("localization.default_locale", "en-US"),
    getSettingString("localization.default_currency", "USD")
  ]);

  const enabledLanguages = enabledLanguagesRaw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return {
    defaultLanguage: defaultLanguage.trim().toLowerCase() || "en",
    enabledLanguages: enabledLanguages.length ? enabledLanguages : ["en"],
    defaultLocale: defaultLocale.trim() || "en-US",
    defaultCurrency: defaultCurrency.trim().toUpperCase() || "USD"
  };
}

export async function getEditableSettings(group?: string) {
  await ensureDefaultAppSettings();
  return AppSetting.find({
    editable: true,
    ...(group ? { group: group.toLowerCase() } : {})
  }).sort({ group: 1, key: 1 });
}
