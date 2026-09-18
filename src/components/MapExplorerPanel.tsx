"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MapExplorer, type AoiDraft } from "@/components/MapExplorer";

export interface StudyAreaSummary {
  id: string;
  name: string | null;
  areaKm2: number;
  centerLat: number;
  centerLng: number;
  sourceType: string;
  createdAt: string;
}

interface MapExplorerPanelProps {
  projectId: string;
  projectName: string;
  studyAreas: StudyAreaSummary[];
}

export function MapExplorerPanel({ projectId, projectName, studyAreas: initial }: MapExplorerPanelProps) {
  const { strings, locale } = useLanguage();
  const [studyAreas, setStudyAreas] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAoiReady(draft: AoiDraft) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/aoi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...draft })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "aoi_create_failed");
      }
      const { studyArea } = await res.json();
      setStudyAreas((prev) => [
        {
          id: studyArea.id,
          name: studyArea.name,
          areaKm2: studyArea.areaKm2,
          centerLat: studyArea.centerLat,
          centerLng: studyArea.centerLng,
          sourceType: studyArea.sourceType,
          createdAt: studyArea.createdAt
        },
        ...prev
      ]);
    } catch {
      setError(
        locale === "ar" ? "تعذر حفظ منطقة الدراسة. حاول مرة أخرى." : "Could not save the study area. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-gold-400">
            ← {strings.dashboard}
          </Link>
          <h1 className="text-lg font-bold text-slate-100">{projectName}</h1>
        </div>
        <LanguageSwitcher />
      </header>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {saving && (
        <p className="mb-3 text-sm text-gold-400">{locale === "ar" ? "جارٍ الحفظ…" : "Saving…"}</p>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="h-[520px] lg:h-auto">
          <MapExplorer onAoiReady={handleAoiReady} />
        </div>

        <aside className="rounded-lg border border-navy-700 bg-navy-900/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gold-400">
            {locale === "ar" ? "مناطق الدراسة المحفوظة" : "Saved study areas"}
          </h2>
          {studyAreas.length === 0 ? (
            <p className="text-sm text-slate-500">
              {locale === "ar"
                ? "استخدم إحدى أدوات الرسم على الخريطة لإنشاء أول منطقة دراسة."
                : "Use one of the drawing tools on the map to create your first study area."}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {studyAreas.map((sa) => (
                <li key={sa.id} className="rounded border border-navy-700 bg-navy-950/50 p-3">
                  <p className="font-medium text-slate-100">
                    {sa.name ?? `${sa.areaKm2.toFixed(2)} km²`}
                  </p>
                  <p className="text-xs text-slate-500" dir="ltr">
                    {sa.centerLat.toFixed(4)}, {sa.centerLng.toFixed(4)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {locale === "ar" ? "المساحة" : "Area"}: {sa.areaKm2.toFixed(2)} km²
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 rounded border border-navy-700/60 bg-navy-950/40 p-3 text-xs text-slate-500">
            {locale === "ar"
              ? "تشغيل التحليل الفعلي (استقبال بيانات الأقمار الصناعية، التحليل الطيفي والجيولوجي) يأتي في المراحل التالية من البناء ولم يُنفَّذ بعد."
              : "Actually running an analysis job (satellite retrieval, spectral & geological processing) is a later build phase and is not implemented yet."}
          </div>
        </aside>
      </div>
    </main>
  );
}
