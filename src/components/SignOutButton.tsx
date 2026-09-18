"use client";

import { signOut } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

export function SignOutButton() {
  const { strings } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-slate-400 hover:text-gold-400"
    >
      {strings.signOut}
    </button>
  );
}
