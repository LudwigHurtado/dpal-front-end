import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthPageShell } from "./AuthPageShell";
import { ProtectedRoute } from "../../auth/ProtectedRoute";
import { useAuth } from "../../auth/AuthContext";
import { changePassword } from "../../auth/authApi";
import { validatePlatformPassword } from "../../auth/passwordPolicy";

function ProfileInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submitPw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const pwErr = validatePlatformPassword(next);
    if (pwErr) {
      setErr(pwErr);
      return;
    }
    if (next !== confirm) {
      setErr("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      await logout();
      navigate("/login", { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPageShell
      title="Profile & security"
      subtitle="Password changes revoke other sessions — you will sign in again on this device."
    >
      <div className="space-y-6">
        <section className="text-xs text-[var(--dpal-text-muted)] space-y-1">
          <p>
            <span className="text-[var(--dpal-text-muted)]">Email: </span>
            <span className="text-white">{user.email}</span>
          </p>
          <p>
            <span className="text-[var(--dpal-text-muted)]">Username: </span>
            <span className="text-white">{user.username}</span>
          </p>
        </section>

        <form onSubmit={submitPw} className="space-y-3 border-t border-[color:var(--dpal-border)] pt-6">
          <h2 className="text-sm font-semibold text-white">Change password</h2>
          {err ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {err}
            </div>
          ) : null}
          <div>
            <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={10}
              maxLength={128}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--dpal-text-muted)] mb-1">
              Confirm new password
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
            disabled={busy}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-4 py-2 text-sm transition-colors"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="text-center text-sm">
          <Link className="text-blue-400 hover:underline" to="/account">
            ← Account home
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileInner />
    </ProtectedRoute>
  );
}
