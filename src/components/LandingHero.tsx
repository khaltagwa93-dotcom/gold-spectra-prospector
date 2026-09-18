"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function LandingHero() {
  const { strings } = useLanguage();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="mb-10 flex justify-end">
        <LanguageSwitcher />
      </div>

      <p className="mb-3 text-sm tracking-wide text-gold-500">
        AI-Powered Satellite &amp; Geological Gold Exploration Targeting Platform
      </p>
      <h1 className="mb-4 text-4xl font-extrabold text-gold-400 sm:text-5xl">{strings.appName}</h1>
      <p className="mb-10 max-w-xl text-lg text-slate-300">{strings.tagline}</p>

      <Link
        href="/login"
        className="mb-12 inline-flex w-fit rounded-lg bg-gold-500 px-6 py-3 font-semibold text-navy-950 transition-opacity hover:opacity-90"
      >
        {strings.signIn}
      </Link>

      <div className="rounded-lg border border-navy-700 bg-navy-900/50 p-5 text-sm leading-relaxed text-slate-400">
        {strings.disclaimerFull}
      </div>
    </main>
  );
}
