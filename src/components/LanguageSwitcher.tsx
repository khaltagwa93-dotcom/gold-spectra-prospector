"use client";

import clsx from "clsx";
import { useLanguage } from "@/components/LanguageProvider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-full border border-navy-700 bg-navy-900/60 p-1 text-sm">
      <button
        type="button"
        onClick={() => setLocale("ar")}
        className={clsx(
          "rounded-full px-3 py-1 transition-colors",
          locale === "ar" ? "bg-gold-500 text-navy-950 font-semibold" : "text-gold-400/70 hover:text-gold-400"
        )}
      >
        العربية
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={clsx(
          "rounded-full px-3 py-1 transition-colors",
          locale === "en" ? "bg-gold-500 text-navy-950 font-semibold" : "text-gold-400/70 hover:text-gold-400"
        )}
      >
        English
      </button>
    </div>
  );
}
