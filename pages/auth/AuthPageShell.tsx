import React from "react";
import { Link } from "react-router-dom";

/** Shared chrome for standalone auth screens (outside main App shell). */
export function AuthPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--dpal-background)] text-[var(--dpal-text-primary)]">
      <header className="border-b border-[color:var(--dpal-border)] px-4 py-4 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          ← Back to app
        </Link>
        <span className="text-[10px] uppercase tracking-wider text-[var(--dpal-text-muted)]">
          Account
        </span>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-[color:var(--dpal-border)] bg-[var(--dpal-panel)] p-6 md:p-8 shadow-xl">
          <h1 className="text-xl font-bold text-white mb-1">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-[var(--dpal-text-muted)] mb-6">{subtitle}</p>
          ) : (
            <div className="mb-6" />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
