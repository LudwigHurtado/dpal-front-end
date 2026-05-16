import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DmrvCategoryPage from './DmrvCategoryPage';
import DmrvHubPage from './DmrvHubPage';

export type DmrvRoutesProps = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

/**
 * Absolute paths required — these Routes are mounted inside App (not under a /dmrv parent Route).
 * Relative `:categorySlug` was incorrectly matching `/dmrv` with slug "dmrv".
 */
export default function DmrvRoutes({ onReturn, onNavigate }: DmrvRoutesProps): React.ReactElement {
  return (
    <Routes>
      <Route path="/dmrv" element={<DmrvHubPage onReturn={onReturn} />} />
      <Route
        path="/dmrv/:categorySlug"
        element={<DmrvCategoryPage onReturn={onReturn} onNavigate={onNavigate} />}
      />
      <Route path="*" element={<Navigate to="/dmrv" replace />} />
    </Routes>
  );
}
