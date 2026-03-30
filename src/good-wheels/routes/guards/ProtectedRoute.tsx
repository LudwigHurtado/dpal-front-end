import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../paths';

const ProtectedRoute: React.FC = () => {
  const status = useAuthStore((s) => s.status);
  if (status === 'loading') return null;
  if (status !== 'signed_in') return <Navigate to={GW_PATHS.auth.signIn} replace />;
  return <Outlet />;
};

export default ProtectedRoute;

