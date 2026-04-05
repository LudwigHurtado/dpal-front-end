import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthPageShell } from "./AuthPageShell";
import { resetPassword } from "../../auth/authApi";
import { validatePlatformPassword } from "../../auth/passwordPolicy";

export default function ResetPasswordPage() {
  const [search] = useSearchParams();
  const token = search.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Missing token. Open the link from your email.");
      return;
    }
    const pwErr = validatePlatformPassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      navigate("/login", { replace: true, state: { resetOk: true } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      title="Choose a new password"
      subtitle="After reset, all existing sessions are signed out for safety."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        <div>
          <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
            New password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
            maxLength={128}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
            Confirm password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={10}
            maxLength={128}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--dpal-text-muted)]">
        <Link className="text-blue-400 hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
