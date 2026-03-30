import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '../../types/role';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../paths';

const RoleProtectedRoute: React.FC<{ role: Role }> = ({ role }) => {
  const status = useAuthStore((s) => s.status);
  const activeRole = useAuthStore((s) => s.activeRole);
  if (status === 'loading') return null;
  if (status !== 'signed_in') return <Navigate to={GW_PATHS.auth.signIn} replace />;
  if (!activeRole) return <Navigate to={GW_PATHS.auth.roleSelect} replace />;
  if (activeRole !== role) return <Navigate to={GW_PATHS.auth.roleSelect} replace />;
  return <Outlet />;
};

export default RoleProtectedRoute;

