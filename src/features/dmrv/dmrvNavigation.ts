import { getValidatorPortalUrl } from '../../../constants';
import type { DmrvConnectorMeta } from './dmrvRegistry';

/** Config workspace path under `/dmrv`. */
export function dmrvInputConfigPath(
  categorySlug: string,
  inputKey: string,
  typeId?: string,
): string {
  const base = `/dmrv/${encodeURIComponent(categorySlug)}/config/${encodeURIComponent(inputKey)}`;
  if (!typeId) return base;
  return `${base}?typeId=${encodeURIComponent(typeId)}`;
}

/** Alias for carbon-compliance deep links (same view id as DMRV hub). */
export function carbonComplianceInputConfigPath(
  categorySlug: string,
  inputKey: string,
  typeId?: string,
): string {
  const base = `/carbon-compliance/${encodeURIComponent(categorySlug)}/config/${encodeURIComponent(inputKey)}`;
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
