import React from 'react';
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import DmrvCategoryPage from './DmrvCategoryPage';
import DmrvHubPage from './DmrvHubPage';
import { getCategoryBySlug } from './dmrvRegistry';

export type DmrvRoutesProps = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

/** Unknown slugs redirect to hub instead of a blank "not found" flash. */
function DmrvCategoryGuard({
  onReturn,
  onNavigate,
}: DmrvRoutesProps): React.ReactElement {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  if (!getCategoryBySlug(categorySlug)) {
    return <Navigate to="/dmrv" replace />;
  }
  return <DmrvCategoryPage onReturn={onReturn} onNavigate={onNavigate} />;
}

/**
 * Absolute `/dmrv` layout — category route must be nested so `/dmrv/carbon-land` is not
 * collapsed back to `/dmrv` by App view→URL sync (see App.tsx dmrvSelector guard).
 */
export default function DmrvRoutes({ onReturn, onNavigate }: DmrvRoutesProps): React.ReactElement {
  return (
    <Routes>
      <Route path="/dmrv" element={<Outlet />}>
        <Route index element={<DmrvHubPage onReturn={onReturn} />} />
        <Route
          path=":categorySlug"
          element={<DmrvCategoryGuard onReturn={onReturn} onNavigate={onNavigate} />}
        />
      </Route>
    </Routes>
  );
}
