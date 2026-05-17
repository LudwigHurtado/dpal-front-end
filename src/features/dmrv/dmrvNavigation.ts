import { getValidatorPortalUrl } from '../../../constants';
import type { DmrvConnectorMeta } from './dmrvRegistry';
import type { DmrvSourceConfiguratorKind } from './dmrvSensorCatalog';

export type DmrvSourceStackKind = Extract<DmrvSourceConfiguratorKind, 'satellite' | 'lidar'>;

export function inputKeyToSourceStackKind(inputKey: string): DmrvSourceStackKind | null {
  if (inputKey === 'satellite-imagery') return 'satellite';
  if (inputKey === 'lidar') return 'lidar';
  return null;
}

export function sourceStackKindToInputKey(kind: DmrvSourceStackKind): string {
  return kind === 'lidar' ? 'lidar' : 'satellite-imagery';
}

/** Satellite mission picker + scene settings (uploaded mission cards). LiDAR uses the source-stack page. */
export function dmrvSourceStackPath(
  projectId: string,
  categorySlug: string,
  sourceKind: DmrvSourceStackKind,
  typeId?: string,
): string {
  if (sourceKind === 'satellite') {
    const base = dmrvInputConfigPath(projectId, categorySlug, 'satellite-imagery', typeId);
    return `${base}#satellite-stack`;
  }
  const base = `/dmrv/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(categorySlug)}/sources/${encodeURIComponent(sourceKind)}`;
  if (!typeId) return base;
  return `${base}?typeId=${encodeURIComponent(typeId)}`;
}

export function dmrvCategoryPath(
  categorySlug: string,
  typeId?: string,
  projectId?: string,
): string {
  const params = new URLSearchParams();
  if (typeId) params.set('typeId', typeId);
  if (projectId) params.set('projectId', projectId);
  const q = params.toString();
  return `/dmrv/${encodeURIComponent(categorySlug)}${q ? `?${q}` : ''}`;
}

export function dmrvNewProjectPath(categorySlug: string, typeId: string): string {
  const params = new URLSearchParams({ categorySlug, typeId });
  return `/dmrv/projects/new?${params.toString()}`;
}

export function dmrvProjectConfigPath(projectId: string): string {
  return `/dmrv/projects/${encodeURIComponent(projectId)}/config`;
}

export function dmrvReportPreviewPath(
  projectId: string,
  categorySlug: string,
  typeId?: string,
  opts?: { print?: boolean },
): string {
  const params = new URLSearchParams();
  if (typeId) params.set('typeId', typeId);
  if (opts?.print) params.set('print', 'true');
  const q = params.toString();
  return `/dmrv/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(categorySlug)}/report${q ? `?${q}` : ''}`;
}

/** Project-scoped input configuration workspace. */
export function dmrvInputConfigPath(
  projectId: string,
  categorySlug: string,
  inputKey: string,
  typeId?: string,
): string {
  const base = `/dmrv/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(categorySlug)}/config/${encodeURIComponent(inputKey)}`;
  if (!typeId) return base;
  return `${base}?typeId=${encodeURIComponent(typeId)}`;
}

/** @deprecated Legacy path — prefer dmrvInputConfigPath with projectId */
export function dmrvLegacyInputConfigPath(
  categorySlug: string,
  inputKey: string,
  typeId?: string,
): string {
  const base = `/dmrv/${encodeURIComponent(categorySlug)}/config/${encodeURIComponent(inputKey)}`;
  if (!typeId) return base;
  return `${base}?typeId=${encodeURIComponent(typeId)}`;
}

export function carbonComplianceInputConfigPath(
  projectId: string,
  categorySlug: string,
  inputKey: string,
  typeId?: string,
): string {
  const base = `/carbon-compliance/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(categorySlug)}/config/${encodeURIComponent(inputKey)}`;
  if (!typeId) return base;
  return `${base}?typeId=${encodeURIComponent(typeId)}`;
}

export function openDmrvConnector(
  connector: DmrvConnectorMeta,
  handlers: {
    onNavigate?: (view: string) => void;
    navigatePath?: (path: string) => void;
  },
): void {
  if (connector.externalKey === 'validator_portal') {
    const url = getValidatorPortalUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
  }
  if (connector.routePath && handlers.navigatePath) {
    handlers.navigatePath(connector.routePath);
    return;
  }
  if (connector.routeView && handlers.onNavigate) {
    handlers.onNavigate(connector.routeView);
  }
}
