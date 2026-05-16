import React from 'react';
import { Navigate, Outlet, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import DmrvCategoryPage from './DmrvCategoryPage';
import DmrvHubPage from './DmrvHubPage';
import DmrvInputConfigPage from './DmrvInputConfigPage';
import DmrvProjectConfigPage from './DmrvProjectConfigPage';
import { getCategoryBySlug } from './dmrvRegistry';
import { resolveDmrvInputDef } from './dmrvInputRegistry';
import { dmrvInputConfigPath } from './dmrvNavigation';
import { defaultDmrvProjectId } from './services/dmrvProjectContextService';

export type DmrvRoutesProps = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

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

function DmrvInputConfigGuard({
  onReturn,
  onNavigate,
}: DmrvRoutesProps): React.ReactElement {
  const { projectId, categorySlug, inputKey } = useParams<{
    projectId: string;
    categorySlug: string;
    inputKey: string;
  }>();
  const [searchParams] = useSearchParams();
  const typeId = searchParams.get('typeId') ?? 'forest-land-use';

  if (!categorySlug || !getCategoryBySlug(categorySlug) || !inputKey || !projectId) {
    return <Navigate to="/dmrv" replace />;
  }
  resolveDmrvInputDef(inputKey);
  return <DmrvInputConfigPage onReturn={onReturn} onNavigate={onNavigate} />;
}

/** Legacy `/dmrv/:category/config/:input` → require project setup first */
function DmrvLegacyInputRedirect(): React.ReactElement {
  const { categorySlug, inputKey } = useParams<{ categorySlug: string; inputKey: string }>();
  const [searchParams] = useSearchParams();
  const typeId = searchParams.get('typeId') ?? 'forest-land-use';
  if (!categorySlug || !inputKey) return <Navigate to="/dmrv" replace />;
  const projectId = defaultDmrvProjectId(categorySlug, typeId);
  return (
    <Navigate
      to={dmrvInputConfigPath(projectId, categorySlug, inputKey, typeId)}
      replace
    />
  );
}

function DmrvProjectConfigGuard(props: DmrvRoutesProps): React.ReactElement {
  return <DmrvProjectConfigPage {...props} />;
}

export default function DmrvRoutes({ onReturn, onNavigate }: DmrvRoutesProps): React.ReactElement {
  return (
    <Routes>
      <Route path="/dmrv" element={<Outlet />}>
        <Route index element={<DmrvHubPage onReturn={onReturn} />} />
        <Route path="projects/new" element={<DmrvProjectConfigGuard onReturn={onReturn} onNavigate={onNavigate} />} />
        <Route
          path="projects/:projectId/config"
          element={<DmrvProjectConfigGuard onReturn={onReturn} onNavigate={onNavigate} />}
        />
        <Route
          path="projects/:projectId/:categorySlug/config/:inputKey"
          element={<DmrvInputConfigGuard onReturn={onReturn} onNavigate={onNavigate} />}
        />
        <Route path=":categorySlug/config/:inputKey" element={<DmrvLegacyInputRedirect />} />
        <Route
          path=":categorySlug"
          element={<DmrvCategoryGuard onReturn={onReturn} onNavigate={onNavigate} />}
        />
      </Route>
    </Routes>
  );
}
