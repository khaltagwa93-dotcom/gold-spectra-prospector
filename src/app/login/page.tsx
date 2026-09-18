"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const { strings, locale } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", { redirect: false, email, password });
    setLoading(false);

    if (result?.error) {
      setError(
        locale === "ar"
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
          : "Incorrect email or password."
      );
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gold-400">{strings.appName}</h1>
          <LanguageSwitcher />
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-navy-700 bg-navy-900/60 p-6"
        >
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              {locale === "ar" ? "البريد الإلكتروني" : "Email"}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-navy-700 bg-navy-950 px-3 py-2 text-slate-100 outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              {locale === "ar" ? "كلمة المرور" : "Password"}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-navy-700 bg-navy-950 px-3 py-2 text-slate-100 outline-none focus:border-gold-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gold-500 py-2 font-semibold text-navy-950 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "…" : strings.signIn}
          </button>
        </form>
      </div>
    </main>
  );
}
