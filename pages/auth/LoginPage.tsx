import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthPageShell } from "./AuthPageShell";
import { useAuth } from "../../auth/AuthContext";

export default function LoginPage() {
  const { login, user, ready, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/account";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resetOk = Boolean((location.state as { resetOk?: boolean } | null)?.resetOk);

  useEffect(() => {
    if (ready && !loading && user) {
      navigate(from, { replace: true });
    }
  }, [ready, loading, user, navigate, from]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      title="Sign in"
      subtitle="Use your email or username. Sessions stay secure with refresh tokens."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {resetOk ? (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
            Password updated. Sign in with your new password.
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        <div>
          <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
            Email or username
          </label>
          <input
            autoComplete="username"
            className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={1}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--dpal-text-muted)]">
        <Link className="text-blue-400 hover:underline" to="/forgot-password">
          Forgot password?
        </Link>
        {" · "}
        <Link className="text-blue-400 hover:underline" to="/signup">
          Create an account
        </Link>
      </p>
    </AuthPageShell>
  );
}
