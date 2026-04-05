import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthPageShell } from "./AuthPageShell";
import { ProtectedRoute } from "../../auth/ProtectedRoute";
import { RequireRole } from "../../auth/RequireRole";
import { adminListActivity, adminListUsers, adminPatchUser } from "../../auth/authApi";

type AdminUserRow = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
};

const ROLES = ["admin", "moderator", "validator", "standard", "support_agent"] as const;
const STATUSES = ["active", "suspended", "pending_verification"] as const;

function AdminInner() {
  const [tab, setTab] = useState<"users" | "activity">("users");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [activity, setActivity] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListUsers(page, limit);
      setUsers((data.items as AdminUserRow[]) || []);
      setTotal(Number(data.total) || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListActivity(1, 50);
      setActivity((data.items as Record<string, unknown>[]) || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "users") void loadUsers();
    else void loadActivity();
  }, [tab, loadUsers, loadActivity]);

  const onPatch = async (id: string, patch: { role?: string; status?: string }) => {
    setPatching(id);
    setError(null);
    try {
      await adminPatchUser(id, patch);
      await loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPatching(null);
    }
  };

  return (
    <AuthPageShell
      title="Admin"
      subtitle="User management and audit log. Changes are recorded in activity logs."
    >
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            tab === "users" ? "bg-violet-600 text-white" : "bg-[var(--dpal-surface)] text-[var(--dpal-text-muted)]"
          }`}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setTab("activity")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            tab === "activity" ? "bg-violet-600 text-white" : "bg-[var(--dpal-surface)] text-[var(--dpal-text-muted)]"
          }`}
        >
          Activity
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--dpal-text-muted)]">Loading…</p>
      ) : tab === "users" ? (
        <div className="overflow-x-auto rounded-xl border border-[color:var(--dpal-border)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--dpal-surface)] text-[var(--dpal-text-muted)]">
              <tr>
                <th className="p-2 font-medium">User</th>
                <th className="p-2 font-medium">Role</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[color:var(--dpal-border)]">
                  <td className="p-2 align-top">
                    <div className="text-white font-medium">{u.fullName}</div>
                    <div className="text-[var(--dpal-text-muted)]">{u.email}</div>
                    <div className="text-[var(--dpal-text-muted)] opacity-80">@{u.username}</div>
                  </td>
                  <td className="p-2 align-top">
                    <select
                      className="bg-[var(--dpal-surface)] border border-[color:var(--dpal-border)] rounded px-2 py-1 text-white max-w-[140px]"
                      value={u.role}
                      disabled={patching === u.id}
                      onChange={(e) => void onPatch(u.id, { role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 align-top">
                    <select
                      className="bg-[var(--dpal-surface)] border border-[color:var(--dpal-border)] rounded px-2 py-1 text-white max-w-[160px]"
                      value={u.status}
                      disabled={patching === u.id}
                      onChange={(e) => void onPatch(u.id, { status: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-[var(--dpal-text-muted)]">
                    {patching === u.id ? "Saving…" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-y-auto text-xs">
          {activity.map((row, i) => (
            <li
              key={i}
              className="rounded-lg border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)]/40 p-3 font-mono text-[10px] text-[var(--dpal-text-muted)]"
            >
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(row, null, 2)}</pre>
            </li>
          ))}
        </ul>
      )}

      {tab === "users" && total > limit ? (
        <div className="flex justify-between items-center mt-4 text-xs text-[var(--dpal-text-muted)]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 rounded border border-[color:var(--dpal-border)] disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} · {total} users
          </span>
          <button
            type="button"
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 rounded border border-[color:var(--dpal-border)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm">
        <Link className="text-blue-400 hover:underline" to="/account">
          ← Account home
        </Link>
      </p>
    </AuthPageShell>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute>
      <RequireRole roles={["admin"]}>
        <AdminInner />
      </RequireRole>
    </ProtectedRoute>
  );
}
