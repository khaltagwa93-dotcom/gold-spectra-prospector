"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { QuickAnalysis } from "@/components/QuickAnalysis";
import { ManualAoiButton } from "@/components/ManualAoiButton";
import { SignOutButton } from "@/components/SignOutButton";

export interface DashboardProjectSummary {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  studyAreaCount: number;
  analysisJobCount: number;
}

export function DashboardClient({ projects }: { projects: DashboardProjectSummary[] }) {
  const { strings, locale } = useLanguage();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gold-400">{strings.appName}</h1>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold text-slate-200">{strings.startAnalysis}</h2>
        <QuickAnalysis />
        <div className="mt-3">
          <ManualAoiButton />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-200">{strings.projects}</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-slate-500">
            {locale === "ar" ? "لا توجد مشاريع بعد." : "No projects yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-lg border border-navy-700 bg-navy-900/40 px-4 py-3 transition-colors hover:border-gold-500/60"
                >
                  <div>
                    <p className="font-medium text-slate-100">{project.name}</p>
                    {project.description && (
                      <p className="text-sm text-slate-500">{project.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {project.studyAreaCount} {locale === "ar" ? "منطقة" : "areas"} ·{" "}
                    {project.analysisJobCount} {locale === "ar" ? "تحليل" : "jobs"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
