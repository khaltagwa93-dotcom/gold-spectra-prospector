"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { AOI_PRESET_AREAS_KM2 } from "@/lib/gis/aoi";

interface ParsedLocation {
  lat: number;
  lng: number;
  placeName: string | null;
  zoom: number | null;
  precise: boolean;
}

export function QuickAnalysis() {
  const { strings, locale } = useLanguage();
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedLocation | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setParsed(null);

    try {
      const res = await fetch("/api/maps/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message?.[locale] ?? strings.unresolvedLink);
        return;
      }

      setParsed({
        lat: data.location.lat,
        lng: data.location.lng,
        placeName: data.location.placeName,
        zoom: data.location.zoom,
        precise: data.location.precise
      });
    } catch {
      setMessage(strings.unresolvedLink);
    } finally {
      setLoading(false);
    }
  }

  async function handlePresetArea(areaKm2: (typeof AOI_PRESET_AREAS_KM2)[number]) {
    if (!parsed) return;
    setLoading(true);
    setMessage(null);

    try {
      const projectName =
        parsed.placeName ??
        `${locale === "ar" ? "استكشاف" : "Exploration"} ${parsed.lat.toFixed(3)}, ${parsed.lng.toFixed(3)}`;

      const projectRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName })
      });
      if (!projectRes.ok) throw new Error("project_create_failed");
      const { project } = await projectRes.json();

      const aoiRes = await fetch("/api/aoi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "preset_circle",
          projectId: project.id,
          center: { lat: parsed.lat, lng: parsed.lng },
          areaKm2,
          sourceUrl: url,
          placeName: parsed.placeName ?? undefined,
          zoomLevel: parsed.zoom ?? undefined
        })
      });
      if (!aoiRes.ok) throw new Error("aoi_create_failed");

      router.push(`/projects/${project.id}`);
    } catch {
      setMessage(locale === "ar" ? "حدث خطأ أثناء إنشاء المشروع." : "Something went wrong creating the project.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900/60 p-6">
      <form onSubmit={handleAnalyze} className="space-y-3">
        <label className="block text-sm text-slate-300">{strings.pasteMapsUrl}</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={strings.mapsUrlPlaceholder}
            className="flex-1 rounded border border-navy-700 bg-navy-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-gold-500"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded bg-gold-500 px-5 py-2 text-sm font-semibold text-navy-950 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "…" : strings.startAnalysis}
          </button>
        </div>
      </form>

      {message && <p className="mt-3 text-sm text-amber-400">{message}</p>}

      {parsed && (
        <div className="mt-4 rounded-lg border border-gold-500/30 bg-navy-950/60 p-4">
          <p className="mb-1 text-sm text-slate-300">
            {parsed.placeName ?? (locale === "ar" ? "موقع بلا اسم" : "Unnamed location")} —{" "}
            <span dir="ltr">
              {parsed.lat.toFixed(5)}, {parsed.lng.toFixed(5)}
            </span>
          </p>
          {!parsed.precise && (
            <p className="mb-3 text-xs text-amber-400/80">
              {locale === "ar"
                ? "هذا مركز الخريطة وليس تثبيتًا دقيقًا للمكان — تحقق منه قبل المتابعة."
                : "This is the map's center point, not a precise place pin — verify it before continuing."}
            </p>
          )}
          <p className="mb-2 text-sm text-gold-400">{strings.presetAreas}</p>
          <div className="flex flex-wrap gap-2">
            {AOI_PRESET_AREAS_KM2.map((areaKm2) => (
              <button
                key={areaKm2}
                type="button"
                disabled={loading}
                onClick={() => handlePresetArea(areaKm2)}
                className="rounded border border-gold-500/50 px-3 py-1 text-sm text-gold-400 hover:bg-gold-500 hover:text-navy-950 disabled:opacity-50"
              >
                {areaKm2} km²
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
