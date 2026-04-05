import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Renders children only when a session exists after bootstrap.
 * Sends anonymous users to /login with return path.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, ready } = useAuth();
  const location = useLocation();

  if (!ready || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[var(--dpal-text-muted)] text-sm">
        Loading session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
