import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ALL_ROLES = ["admin", "moderator", "validator", "standard", "support_agent"] as const;

export type PlatformRole = (typeof ALL_ROLES)[number];

export function RequireRole({
  roles,
  children,
}: {
  roles: PlatformRole[];
  children: React.ReactNode;
}) {
  const { user, loading, ready } = useAuth();

  if (!ready || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[var(--dpal-text-muted)] text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role as PlatformRole)) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
}
