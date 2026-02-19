"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { DEFAULT_LANGUAGE, dictionaries, type AppLanguage } from "@/lib/i18n-dictionary";

type LocalizationConfig = {
  defaultLanguage: string;
  enabledLanguages: string[];
  defaultLocale: string;
  defaultCurrency: string;
};

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  enabledLanguages: AppLanguage[];
  locale: string;
  currency: string;
  t: (key: string, fallback?: string) => string;
  formatMoney: (amountCents: number, currencyOverride?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function safeLanguage(value: string | null | undefined): AppLanguage {
  const lang = (value || "").toLowerCase();
  if (lang === "es" || lang === "fr" || lang === "ar") return lang;
  return DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LocalizationConfig>({
    defaultLanguage: "en",
    enabledLanguages: ["en", "es", "fr", "ar"],
    defaultLocale: "en-US",
    defaultCurrency: "USD"
  });
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    (async () => {
      const res = await apiFetch("/api/auth/system-config", { retryOn401: false });
      const json = await res.json();
      if (res.ok && json.data?.localization) {
        setConfig(json.data.localization);
        const localPreferred = typeof window !== "undefined" ? window.localStorage.getItem("velora_lang") : null;
        const candidate = safeLanguage(localPreferred || json.data.localization.defaultLanguage);
        setLanguageState(candidate);
        if (typeof window !== "undefined") document.documentElement.lang = candidate;
      } else {
        const localPreferred = typeof window !== "undefined" ? window.localStorage.getItem("velora_lang") : null;
        const candidate = safeLanguage(localPreferred || "en");
        setLanguageState(candidate);
        if (typeof window !== "undefined") document.documentElement.lang = candidate;
      }
    })();
  }, []);

  function setLanguage(next: AppLanguage) {
    setLanguageState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("velora_lang", next);
      document.documentElement.lang = next;
    }
  }

  const enabledLanguages = useMemo(
    () => config.enabledLanguages.map((value) => safeLanguage(value)),
    [config.enabledLanguages]
  );

  const context = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[language] || dictionaries.en;
    const defaultDict = dictionaries.en;
    const locale = config.defaultLocale || "en-US";
    const currency = (config.defaultCurrency || "USD").toUpperCase();

    return {
      language,
      setLanguage,
      enabledLanguages,
      locale,
      currency,
      t: (key: string, fallback?: string) => dict[key] || defaultDict[key] || fallback || key,
      formatMoney: (amountCents: number, currencyOverride?: string) => {
        const amount = (amountCents || 0) / 100;
        const code = (currencyOverride || currency).toUpperCase();
        try {
          return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: code,
            maximumFractionDigits: 2
          }).format(amount);
        } catch {
          return `${code} ${amount.toFixed(2)}`;
        }
      }
    };
  }, [config.defaultCurrency, config.defaultLocale, enabledLanguages, language]);

  return <I18nContext.Provider value={context}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
