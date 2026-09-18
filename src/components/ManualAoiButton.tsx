"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export function ManualAoiButton() {
  const { strings, locale } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const name = `${locale === "ar" ? "مشروع" : "Project"} ${new Date().toLocaleDateString(
        locale === "ar" ? "ar-EG" : "en-US"
      )}`;
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error("failed");
      const { project } = await res.json();
      router.push(`/projects/${project.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded border border-navy-700 px-5 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-gold-500 hover:text-gold-400 disabled:opacity-50"
    >
      {loading ? "…" : strings.manualAoi}
    </button>
  );
}
