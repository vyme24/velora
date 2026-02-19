"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Mail, RefreshCcw, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";

type AppSetting = {
  _id: string;
  key: string;
  group?: string;
  valueType?: "number" | "string" | "boolean";
  label: string;
  description?: string;
  stringValue?: string | null;
};

type TemplateId = "otp" | "welcome" | "payment";

type TemplateBlock = {
  id: TemplateId;
  title: string;
  description: string;
  variables: string[];
  subject?: AppSetting;
  html?: AppSetting;
};

const templateMeta: Record<TemplateId, { title: string; description: string; variables: string[] }> = {
  otp: {
    title: "OTP Verification",
    description: "Used for registration/login verification emails.",
    variables: ["{{name}}", "{{otp}}"]
  },
  welcome: {
    title: "Welcome Email",
    description: "Sent after successful account onboarding.",
    variables: ["{{name}}"]
  },
  payment: {
    title: "Payment Confirmation",
    description: "Sent after successful payment/invoice processing.",
    variables: ["{{name}}", "{{amount}}", "{{description}}"]
  }
};

function csrfHeaders() {
  const token = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("velora_csrf="))
    ?.split("=")[1];
  const headers: Record<string, string> = {};
  if (token) headers["x-csrf-token"] = decodeURIComponent(token);
  return headers;
}

function applyPreviewVariables(html: string, variables: string[]) {
  const replacements: Record<string, string> = {
    "{{name}}": "User",
    "{{otp}}": "483920",
    "{{amount}}": "$39.95",
    "{{description}}": "Your monthly package has been renewed successfully."
  };
  return variables.reduce((acc, key) => acc.replaceAll(key, replacements[key] || key), html);
}

export function AdminEmailTemplateStudio() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>("otp");
  const [subjectDraft, setSubjectDraft] = useState("");
  const [htmlDraft, setHtmlDraft] = useState("");
  const [saving, setSaving] = useState<"" | "subject" | "html" | "all">("");

  async function loadTemplates() {
    setLoading(true);
    const res = await fetch("/api/admin/app-settings?group=email_templates", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to load email templates");
      setLoading(false);
      return;
    }
    setSettings(json.data?.settings || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const templates = useMemo<TemplateBlock[]>(() => {
    const mapSetting = (key: string) => settings.find((item) => item.key === key);
    return (Object.keys(templateMeta) as TemplateId[]).map((id) => ({
      id,
      title: templateMeta[id].title,
      description: templateMeta[id].description,
      variables: templateMeta[id].variables,
      subject: mapSetting(`email_templates.${id}_subject`),
      html: mapSetting(`email_templates.${id}_html`)
    }));
  }, [settings]);

  const activeBlock = useMemo(
    () => templates.find((item) => item.id === activeTemplate) || templates[0],
    [templates, activeTemplate]
  );

  useEffect(() => {
    if (!activeBlock) return;
    setSubjectDraft(activeBlock.subject?.stringValue || "");
    setHtmlDraft(activeBlock.html?.stringValue || "");
  }, [activeBlock]);

  async function saveSetting(setting: AppSetting | undefined, value: string) {
    if (!setting) return;
    const res = await fetch("/api/admin/app-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ key: setting.key, stringValue: value })
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || `Failed to save ${setting.label}`);
      return false;
    }
    return true;
  }

  async function onSave(mode: "subject" | "html" | "all") {
    if (!activeBlock) return;
    setSaving(mode);
    const results = await Promise.all([
      mode === "html" ? Promise.resolve(true) : saveSetting(activeBlock.subject, subjectDraft),
      mode === "subject" ? Promise.resolve(true) : saveSetting(activeBlock.html, htmlDraft)
    ]);
    setSaving("");
    if (results.every(Boolean)) {
      setMessage("Template updated");
      await loadTemplates();
    }
  }

  if (loading) {
    return (
      <main className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-[520px] w-full rounded-3xl" />
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <section className="rounded-2xl border border-border bg-card/70 px-4 py-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
          <Mail className="h-5 w-5 text-primary" />
          Email Templates Studio
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          Separate full customization module for subjects, HTML, and live variable preview.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2 rounded-2xl border border-border bg-card/70 p-3">
          {templates.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTemplate(item.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                activeTemplate === item.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-0.5 text-xs text-foreground/65">{item.description}</p>
            </button>
          ))}
        </aside>

        {activeBlock ? (
          <article className="space-y-4 rounded-2xl border border-border bg-card/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-lg font-semibold">{activeBlock.title}</p>
                <p className="text-sm text-foreground/70">{activeBlock.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSubjectDraft(activeBlock.subject?.stringValue || "");
                    setHtmlDraft(activeBlock.html?.stringValue || "");
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </button>
                <button
                  onClick={() => onSave("all")}
                  disabled={Boolean(saving)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save all"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Variables</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeBlock.variables.map((key) => (
                  <span key={key} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                    {key}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Email Subject</label>
              <input
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                value={subjectDraft}
                onChange={(event) => setSubjectDraft(event.target.value)}
              />
              <button
                onClick={() => onSave("subject")}
                disabled={Boolean(saving)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                Save subject
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Email HTML</label>
              <textarea
                className="min-h-[240px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={htmlDraft}
                onChange={(event) => setHtmlDraft(event.target.value)}
              />
              <button
                onClick={() => onSave("html")}
                disabled={Boolean(saving)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                Save HTML
              </button>
            </div>

            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-sm font-semibold">
                <Eye className="h-4 w-4 text-primary" />
                Live Preview
              </p>
              <div className="rounded-xl border border-border bg-white p-4 text-black">
                <p className="mb-2 text-sm font-semibold">{subjectDraft || "(No subject)"}</p>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: applyPreviewVariables(htmlDraft, activeBlock.variables) }}
                />
              </div>
            </div>
          </article>
        ) : null}
      </section>

      <Toast open={Boolean(message)} message={message} />
    </main>
  );
}
