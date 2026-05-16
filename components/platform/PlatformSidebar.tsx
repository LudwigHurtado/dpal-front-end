import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getValidatorPortalUrl } from '../../constants';
import { DPAL_OFFICIAL_FAVICON } from '../../src/constants/brandAssets';
import { PLANETARY_INTELLIGENCE_CATEGORIES } from '../../src/data/planetaryIntelligenceCategories';
import { DeepOwlCategoryIcon } from '../../src/components/deepOwl/DeepOwlCategoryIcon';

export type PlatformSidebarProps = {
  currentPath: string;
  /** Maps to App.tsx view ids */
  onSelectView: (view: string) => void;
  /** Navigate to a pathname (Deep Owl category → workspace in main panel). */
  onSelectPath: (path: string) => void;
  /** Tailwind sticky offset; empty string disables sticky (e.g. mobile drawer). */
  stickyTop?: string;
  className?: string;
};

type NavLeaf = { label: string; view: string; paths: string[] };

function normalizePath(p: string): string {
  return p.replace(/\/$/, '') || '/';
}

function pathMatches(current: string, paths: string[]): boolean {
  const n = normalizePath(current);
  for (const pre of paths) {
    const p = normalizePath(pre);
    if (p === '/' && n === '/') return true;
    if (p !== '/' && (n === p || n.startsWith(`${p}/`))) return true;
  }
  return false;
}

/** Exact path match — avoids one `/water` parent highlighting every water sub-route. */
function pathMatchesExact(current: string, paths: string[]): boolean {
  const n = normalizePath(current);
  return paths.some((pre) => normalizePath(pre) === n);
}

const WORKSPACE_CHILDREN: NavLeaf[] = [
  {
    label: 'Carbon & MRV',
    view: 'carbonComplianceWorkspace',
    paths: [
      '/carbon-compliance',
      '/cad-trust',
      '/partners/carbonpura',
      '/carbonpura',
      '/carbon-pura',
      '/partner/carbonpura',
      '/carbonpura-command-center',
      '/carbon-hub',
      '/afolu',
    ],
  },
  {
    label: 'Ocean & Plastic',
    view: 'hyperspectralPlasticWatch',
    paths: ['/ocean-plastic', '/hyperspectral-plastic-watch', '/plastic-watch'],
  },
  { label: 'Water Intelligence', view: 'waterMonitor', paths: ['/water'] },
  { label: 'AquaScan MRV', view: 'aquaScanWater', paths: ['/water/aquascan'] },
  { label: 'Water Operations Engine', view: 'waterOperationsEngine', paths: ['/water/monitor'] },
  { label: 'Aqualand Well', view: 'aqualandWell', paths: ['/water/aqualand'] },
  { label: 'Emissions & Industrial', view: 'carbEmissionsAudit', paths: ['/emissions-industrial', '/carb-emissions-audit'] },
  {
    label: 'Biosphere & Land',
    view: 'earthObservation',
    paths: ['/biosphere-land', '/earth-observation', '/ecology'],
  },
  { label: 'Evidence & Blockchain', view: 'previewEvidencePacket', paths: ['/evidence', '/preview/evidence-packet', '/transparency-db'] },
  { label: 'Disaster & Risk', view: 'globalSignals', paths: ['/disaster-risk', '/global-signals'] },
  { label: 'Environmental Hub', view: 'environmentalIntelligenceHub', paths: ['/environmental-intelligence'] },
  { label: 'Field OS', view: 'fieldOS', paths: ['/field-os'] },
  { label: 'FloodGuard', view: 'floodGuard', paths: ['/floodguard'] },
  { label: 'Emissions Integrity (EIAS)', view: 'emissionsIntegrityAudit', paths: ['/emissions-integrity-audit'] },
  { label: 'Carbon MRV Engine', view: 'carbonMRV', paths: ['/carbon-mrv', '/carbon'] },
  { label: 'DMRV', view: 'dmrvSelector', paths: ['/dmrv'] },
  { label: 'Offsets Marketplace', view: 'offsetMarketplace', paths: ['/offsets'] },
  { label: 'Hazardous Waste Audit', view: 'hazardousWasteAudit', paths: ['/hazardous-waste-audit'] },
  { label: 'Air Quality Monitor', view: 'airQualityMonitor', paths: ['/air'] },
  { label: 'Forest Integrity', view: 'forestIntegrity', paths: ['/forest-integrity'] },
];

const HOME_PATHS = ['/', '/planetary-intelligence', '/workspaces'];
const GLOBAL_INTELLIGENCE_MAP_PATHS = ['/global-intelligence-map'];
const DEEP_OWL_SERVICE_LINES_PATHS = ['/deep-owl/service-lines', '/deep-owl'];

function isDeepOwlCategoryPath(pathname: string): boolean {
  return PLANETARY_INTELLIGENCE_CATEGORIES.some((c) => pathMatchesExact(pathname, [c.href]));
}

export function PlatformSidebar({
  currentPath,
  onSelectView,
  onSelectPath,
  stickyTop = 'top-0',
  className = '',
}: PlatformSidebarProps): React.ReactElement {
  const [workspaceOpen, setWorkspaceOpen] = useState(() =>
    WORKSPACE_CHILDREN.some((ch) => ch.paths.some((p) => pathMatchesExact(currentPath, [p]))),
  );
  const [deepOwlSectorOpen, setDeepOwlSectorOpen] = useState(
    () =>
      pathMatchesExact(currentPath, GLOBAL_INTELLIGENCE_MAP_PATHS) ||
      pathMatchesExact(currentPath, DEEP_OWL_SERVICE_LINES_PATHS) ||
      isDeepOwlCategoryPath(currentPath),
  );

  useEffect(() => {
    if (WORKSPACE_CHILDREN.some((ch) => ch.paths.some((p) => pathMatchesExact(currentPath, [p])))) {
      setWorkspaceOpen(true);
    }
  }, [currentPath]);

  useEffect(() => {
    if (
      pathMatchesExact(currentPath, GLOBAL_INTELLIGENCE_MAP_PATHS) ||
      pathMatchesExact(currentPath, DEEP_OWL_SERVICE_LINES_PATHS) ||
      isDeepOwlCategoryPath(currentPath)
    ) {
      setDeepOwlSectorOpen(true);
    }
  }, [currentPath]);

  const openValidators = () => {
    const url = getValidatorPortalUrl();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else onSelectView('missionMarketplace');
  };

  const homeActive = pathMatches(currentPath, HOME_PATHS);
  const globalMapActive = pathMatchesExact(currentPath, GLOBAL_INTELLIGENCE_MAP_PATHS);
  const deepOwlCategoryActive = isDeepOwlCategoryPath(currentPath);
  const deepOwlSectorActive = globalMapActive || deepOwlCategoryActive;

  const moreActive = pathMatches(currentPath, [
    '/additional-modules',
    '/modules',
    '/more-tools',
    '/more-dpal-modules',
    '/classic-home',
  ]);

  const stickyCls = stickyTop.trim() ? `sticky ${stickyTop.trim()}` : '';

  return (
    <aside
      className={`${stickyCls} z-[95] flex min-h-[100dvh] w-[280px] shrink-0 flex-col border-r border-slate-950/90 bg-gradient-to-b from-[#030712] via-[#0b1224] to-[#020617] ${className}`}
      aria-label="DPAL platform navigation"
    >
      <div className="shrink-0 border-b border-slate-800/90 px-5 py-6">
        <div className="flex items-start gap-3">
          <Link
            to="/"
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-emerald-500/35 shadow-lg shadow-emerald-950/40"
            aria-label="DPAL Home — Deep Owl ECO SYSTEM"
          >
            <img
              src={DPAL_OFFICIAL_FAVICON}
              alt=""
              className="h-full w-full object-cover"
              width={48}
              height={48}
            />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight text-white">DPAL</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/90">Deep Owl ECO SYSTEM</p>
            <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400">
              Planetary Intelligence &amp; Public Accountability
            </p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavButton label="Home" active={homeActive} onClick={() => onSelectView('mainMenu')} icon={<HomeIcon />} accentActive />

        <div>
          <button
            type="button"
            onClick={() => setDeepOwlSectorOpen(!deepOwlSectorOpen)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
              deepOwlSectorOpen || deepOwlSectorActive
                ? 'bg-slate-800/80 text-white'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
            aria-expanded={deepOwlSectorOpen}
          >
            <span className="flex items-center gap-2">
              <DeepOwlNavIcon className={deepOwlSectorActive ? 'text-emerald-400' : 'text-slate-400'} />
              Deep Owl Intelligence
            </span>
            <span className="text-xs text-slate-500">{deepOwlSectorOpen ? '▾' : '▸'}</span>
          </button>

          {deepOwlSectorOpen ? (
            <div className="ml-2 mt-1 max-h-[min(52vh,480px)] space-y-0.5 overflow-y-auto border-l border-slate-700 py-1 pl-2 [scrollbar-width:thin]">
              <SectorChildNav
                label="Global Intelligence Map"
                active={globalMapActive}
                onClick={() => onSelectView('globalIntelligenceMap')}
                icon={<GlobeMapNavIcon />}
              />
              <p className="px-2 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Service lines</p>
              {PLANETARY_INTELLIGENCE_CATEGORIES.map((category, index) => (
                <SectorChildNav
                  key={category.id}
                  label={category.title}
                  title={category.title}
                  active={pathMatchesExact(currentPath, [category.href])}
                  onClick={() => onSelectPath(category.href)}
                  icon={<DeepOwlCategoryIcon icon={category.icon} size={14} variant="nav" />}
                  index={index + 1}
                />
              ))}
            </div>
          ) : null}
        </div>

        <FlatNav
          label="CarbonPura Command"
          paths={['/partners/carbonpura', '/carbonpura', '/carbon-pura', '/partner/carbonpura', '/carbonpura-command-center']}
          currentPath={currentPath}
          onClick={() => onSelectView('carbonPuraWorkspace')}
        />

        <div>
          <button
            type="button"
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
              workspaceOpen ? 'bg-slate-800/80 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
            aria-expanded={workspaceOpen}
          >
            <span className="flex items-center gap-2">
              <GridIcon className="text-slate-400" />
              Workspaces
            </span>
            <span className="text-xs text-slate-500">{workspaceOpen ? '▾' : '▸'}</span>
          </button>

          {workspaceOpen ? (
            <div className="ml-2 mt-1 space-y-0.5 border-l border-slate-700 py-1 pl-2">
              {WORKSPACE_CHILDREN.map((item) => {
                const active = item.paths.some((p) => pathMatchesExact(currentPath, [p]));
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => onSelectView(item.view)}
                    className={`flex w-full rounded-lg px-2 py-2 text-left text-[13px] transition ${
                      active ? 'bg-emerald-500/15 font-semibold text-emerald-300' : 'font-medium text-slate-400 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={openValidators}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-800/50 hover:text-white"
        >
          <ShieldIcon className="text-slate-500" />
          Validator Portal
        </button>

        <FlatNav label="Reports & Signals" paths={['/hub']} currentPath={currentPath} onClick={() => onSelectView('hub')} />

        <FlatNav
          label="Alerts"
          paths={['/global-signals', '/disaster-risk', '/floodguard']}
          currentPath={currentPath}
          onClick={() => onSelectView('globalSignals')}
        />

        <FlatNav label="Settings" paths={['/private-hub']} currentPath={currentPath} onClick={() => onSelectView('privateHubMenu')} />

        <div className="pt-3">
          <button
            type="button"
            onClick={() => onSelectView('additionalModules')}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
              moreActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            }`}
          >
            <LayersIcon />
            More DPAL Modules
          </button>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-slate-500">Good Wheels, escrow, civic tools &amp; legacy demos stay here.</p>
        </div>
      </nav>

      <div className="mt-auto shrink-0 space-y-3 border-t border-slate-800/90 bg-slate-950/40 px-4 py-5">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800/70 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-100">DP</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">DPAL Operator</p>
            <p className="truncate text-[10px] text-slate-400">Administrator</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-55" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Node Status · Online
        </div>
        <button
          type="button"
          onClick={() => onSelectView('helpCenter')}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 text-[12px] font-semibold text-slate-100 transition hover:bg-slate-800"
        >
          Help &amp; Support
        </button>
        <Link to="/account" className="block text-center text-[11px] font-medium text-slate-500 underline-offset-4 hover:text-slate-300">
          Web account
        </Link>
      </div>
    </aside>
  );
}

function NavButton({
  label,
  active,
  onClick,
  icon,
  accentActive,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  accentActive?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
        active && accentActive
          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/25'
          : active
            ? 'bg-white/10 text-white'
            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
      }`}
    >
      <span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span>
      {label}
    </button>
  );
}

function FlatNav({
  label,
  paths,
  currentPath,
  onClick,
}: {
  label: string;
  paths: string[];
  currentPath: string;
  onClick: () => void;
}): React.ReactElement {
  const active = pathMatches(currentPath, paths);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
        active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function HomeIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 10.5L12 3l9 7.5" strokeLinecap="round" />
      <path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ShieldIcon({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3l9 4v7c0 5-4 9-9 11-5-2-9-6-9-11V7l9-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LayersIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polygon points="12 3 22 9 12 15 2 9 12 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 13l10 6 10-6M2 17l10 6 10-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectorChildNav({
  label,
  title,
  active,
  onClick,
  icon,
  index,
}: {
  label: string;
  title?: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  index?: number;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition ${
        active ? 'bg-emerald-500/15 font-semibold text-emerald-300' : 'font-medium text-slate-400 hover:bg-slate-800/70 hover:text-white'
      }`}
    >
      {index != null ? (
        <span className="mt-0.5 w-4 shrink-0 text-right text-[9px] font-semibold tabular-nums text-slate-600">{index}</span>
      ) : null}
      <span className={`mt-0.5 shrink-0 ${active ? 'text-emerald-400' : 'text-slate-500'}`}>{icon}</span>
      <span className="min-w-0 flex-1 text-[11px] leading-snug">{label}</span>
    </button>
  );
}

function GlobeMapNavIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" strokeLinecap="round" />
    </svg>
  );
}

function DeepOwlNavIcon({ className = 'text-slate-400' }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <path d="M8 15c1.2 1.5 2.6 2 4 2s2.8-.5 4-2" strokeLinecap="round" />
      <path d="M12 3v2M4 8l1.5 1M20 8l-1.5 1" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
