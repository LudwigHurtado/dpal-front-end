import { getValidatorPortalUrl } from '../../../constants';
import type { DmrvConnectorMeta } from './dmrvRegistry';

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
