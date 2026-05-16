import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DmrvCategoryPage from './DmrvCategoryPage';
import DmrvHubPage from './DmrvHubPage';

export type DmrvRoutesProps = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

export default function DmrvRoutes({ onReturn, onNavigate }: DmrvRoutesProps): React.ReactElement {
  return (
    <Routes>
      <Route index element={<DmrvHubPage onReturn={onReturn} />} />
      <Route path=":categorySlug" element={<DmrvCategoryPage onReturn={onReturn} onNavigate={onNavigate} />} />
      <Route path="*" element={<Navigate to="/dmrv" replace />} />
    </Routes>
  );
}
