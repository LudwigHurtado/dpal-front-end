/**
 * Shared vocabulary for Environmental Intelligence surfaces.
 * Values are display-only — map from API/provider enums at call sites.
 */
export type EnvironmentalProviderUiState =
  | 'live'
  | 'available'
  | 'configured'
  | 'partial'
  | 'preview'
  | 'not_configured'
  | 'not_enabled'
  | 'needs_credentials'
  | 'ready'
  | 'ready_to_connect'
  | 'provider_api_missing'
  | 'provider_api_ready'
  | 'unavailable'
  | 'auth_error'
  | 'rate_limited'
  | 'failed'
  | 'coming_soon';

export type HubServiceBadge = 'Live' | 'Partial' | 'Preview' | 'Not configured' | 'Coming soon';

export function providerChipClasses(state: EnvironmentalProviderUiState): string {
  const base = 'rounded-md border px-2 py-1 text-[10px] font-semibold tabular-nums whitespace-nowrap';
  switch (state) {
    case 'live':
    case 'available':
    case 'configured':
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-900`;
    case 'partial':
    case 'preview':
      return `${base} border-amber-200 bg-amber-50 text-amber-900`;
    case 'not_configured':
    case 'not_enabled':
    case 'unavailable':
      return `${base} border-slate-200 bg-slate-100 text-slate-700`;
    case 'needs_credentials':
    case 'provider_api_missing':
      return `${base} border-amber-200 bg-amber-50 text-amber-950`;
    case 'ready':
    case 'ready_to_connect':
    case 'provider_api_ready':
      return `${base} border-cyan-200 bg-cyan-50 text-cyan-950`;
    case 'auth_error':
    case 'failed':
      return `${base} border-rose-200 bg-rose-50 text-rose-900`;
    case 'rate_limited':
      return `${base} border-violet-200 bg-violet-50 text-violet-900`;
    case 'coming_soon':
      return `${base} border-slate-300 bg-white text-slate-600`;
    default:
      return `${base} border-slate-200 bg-white text-slate-600`;
  }
}

export function formatProviderStateLabel(state: string): string {
  return state.replace(/_/g, ' ');
}
