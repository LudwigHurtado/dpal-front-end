import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthPageShell } from "./AuthPageShell";
import { useAuth } from "../../auth/AuthContext";
import { validatePlatformPassword, validateUsername } from "../../auth/passwordPolicy";

export default function SignupPage() {
  const { register, user, ready, loading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && !loading && user) {
      navigate("/account", { replace: true });
    }
  }, [ready, loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const pwErr = validatePlatformPassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const u = username.trim().toLowerCase();
    const uErr = validateUsername(u);
    if (uErr) {
      setError(uErr);
      return;
    }
    setSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        username: u,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      });
      navigate("/account", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      title="Create account"
      subtitle="Your password is hashed on the server — never stored as plain text."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        {error ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        <div>
          <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
            Full name
          </label>
          <input
            className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={1}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
            Username
          </label>
          <input
            autoComplete="username"
            className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_]+"
            title="Letters, numbers, underscore"
          />
        </div>
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
        <div>
          <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
            Phone <span className="opacity-60">(optional)</span>
          </label>
          <input
            type="tel"
            autoComplete="tel"
            className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
            Password
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
          className="w-full mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--dpal-text-muted)]">
        Already have an account?{" "}
        <Link className="text-blue-400 hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
