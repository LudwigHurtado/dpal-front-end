import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AuthPageShell } from "./AuthPageShell";
import { forgotPassword } from "../../auth/authApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      title="Reset password"
      subtitle="We never reveal whether an email exists — you will only receive a link if the account is found."
    >
      {done ? (
        <p className="text-sm text-[var(--dpal-text-muted)] leading-relaxed">
          If an account exists for that address, check your inbox for reset instructions. In development,
          the server may log a reset token to the console.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          <div>
            <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-[var(--dpal-text-muted)]">
        <Link className="text-blue-400 hover:underline" to="/login">
          Back to sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
