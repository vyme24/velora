"use client";

import { Globe2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { AppLanguage } from "@/lib/i18n-dictionary";

const labels: Record<string, string> = {
  en: "EN",
  es: "ES",
  fr: "FR",
  hi: "AR"
};

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { language, setLanguage, enabledLanguages } = useI18n();
  if (!enabledLanguages.length) return null;

  return (
    <label className="relative inline-flex items-center" aria-label="Language">
      <Globe2 className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-foreground/65" />
      <select
        value={language}
        onChange={(event) => setLanguage(event?.target?.value as AppLanguage)}
        className={`h-11 rounded-xl border border-border bg-card pl-7 pr-2 text-xs font-semibold ${className}`}
      >
        {enabledLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {labels[lang] || lang.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
