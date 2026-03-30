import React, { useEffect } from 'react';
import AppRouter from '../routes/AppRouter';
import '../styles/globals.css';
import { useAuthStore } from '../store/useAuthStore';

/**
 * DPAL Good Wheels entry for embedding:
 * - Keeps the module self-contained for future extraction to a standalone app.
 * - Uses a memory router today (see AppRouter) so it can run inside DPAL without DPAL adopting RR immediately.
 */
const GoodWheelsApp: React.FC = () => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  // Soft initializer: keep this minimal; real session restore lives in app/AppInitializer.ts later.
  useEffect(() => {
    if (status === 'signed_in' && user) return;
  }, [status, user]);

  return <AppRouter />;
};

export default GoodWheelsApp;

