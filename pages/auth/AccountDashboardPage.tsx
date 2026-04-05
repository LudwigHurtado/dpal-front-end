import React from "react";
import { Link } from "react-router-dom";
import { AuthPageShell } from "./AuthPageShell";
import { ProtectedRoute } from "../../auth/ProtectedRoute";
import { useAuth } from "../../auth/AuthContext";

const ROLE_COPY: Record<string, { title: string; blurb: string }> = {
  admin: {
    title: "Administrator",
    blurb: "Manage users, audit activity, and platform access from the admin console.",
  },
  moderator: {
    title: "Moderator",
    blurb: "Review flagged content and enforce community standards.",
  },
  validator: {
    title: "Validator",
    blurb: "Review submissions and help verify reports for the ledger.",
  },
  standard: {
    title: "Standard user",
    blurb: "Create reports, manage your profile, and track your activity.",
  },
  support_agent: {
    title: "Support agent",
    blurb: "Assist users with account issues and platform questions.",
  },
};

function AccountDashboardInner() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const copy = ROLE_COPY[user.role] ?? ROLE_COPY.standard;

  return (
    <AuthPageShell title="Your account" subtitle={copy.title}>
      <div className="space-y-4 text-sm text-[var(--dpal-text-muted)]">
        <p className="text-white/90 leading-relaxed">{copy.blurb}</p>
        <dl className="grid gap-2 rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)]/50 p-4 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--dpal-text-muted)]">Name</dt>
            <dd className="text-white font-medium text-right">{user.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--dpal-text-muted)]">Username</dt>
            <dd className="text-white font-medium text-right">{user.username}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--dpal-text-muted)]">Email</dt>
            <dd className="text-white font-medium text-right break-all">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--dpal-text-muted)]">Role</dt>
            <dd className="text-white font-medium text-right">{user.role}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--dpal-text-muted)]">Status</dt>
            <dd className="text-white font-medium text-right">{user.status}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--dpal-text-muted)]">Email verified</dt>
            <dd className="text-white font-medium text-right">
              {user.emailVerified ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
        {!user.emailVerified ? (
          <p className="text-amber-200/90 text-xs">
            Verify your email to activate full access. Use the link from your welcome message, or ask an
            admin to resend if email is not configured yet.
          </p>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Link
            to="/account/profile"
            className="inline-flex justify-center rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            Profile & security
          </Link>
          {user.role === "admin" ? (
            <Link
              to="/admin"
              className="inline-flex justify-center rounded-lg border border-violet-500/50 text-violet-200 hover:bg-violet-950/40 px-4 py-2 text-sm font-semibold transition-colors"
            >
              Admin dashboard
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex justify-center rounded-lg border border-[color:var(--dpal-border)] text-[var(--dpal-text-muted)] hover:text-white px-4 py-2 text-sm transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </AuthPageShell>
  );
}

/** Logged-in home: role-aware summary and shortcuts. */
export default function AccountDashboardPage() {
  return (
    <ProtectedRoute>
      <AccountDashboardInner />
    </ProtectedRoute>
  );
}
