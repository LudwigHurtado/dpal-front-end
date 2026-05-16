import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getValidatorPortalUrl } from '../../constants';

export type PlatformSidebarProps = {
  currentPath: string;
  /** Maps to App.tsx view ids */
  onSelectView: (view: string) => void;
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

const WORKSPACE_CHILDREN: NavLeaf[] = [
  {
    label: 'Carbon & MRV',
    view: 'carbonComplianceWorkspace',
    paths: ['/carbon-compliance', '/cad-trust', '/partners/carbonpura', '/carbonpura', '/carbon', '/offsets', '/carbon-hub', '/afolu'],
  },
  {
    label: 'Ocean & Plastic',
    view: 'hyperspectralPlasticWatch',
    paths: ['/ocean-plastic', '/hyperspectral-plastic-watch', '/plastic-watch'],
  },
  { label: 'Water Intelligence', view: 'waterMonitor', paths: ['/water', '/water/aquascan', '/water/monitor', '/water/aqualand'] },
  { label: 'Emissions & Industrial', view: 'carbEmissionsAudit', paths: ['/emissions-industrial', '/carb-emissions-audit', '/emissions-integrity-audit'] },
  {
    label: 'Biosphere & Land',
    view: 'earthObservation',
    paths: ['/biosphere-land', '/earth-observation', '/ecology', '/forest-integrity'],
  },
  { label: 'Evidence & Blockchain', view: 'previewEvidencePacket', paths: ['/evidence', '/preview/evidence-packet', '/transparency-db'] },
  { label: 'Disaster & Risk', view: 'globalSignals', paths: ['/disaster-risk', '/global-signals'] },
];

const HOME_PATHS = ['/', '/planetary-intelligence', '/workspaces'];

export function PlatformSidebar({
  currentPath,
  onSelectView,
  stickyTop = 'top-0',
  className = '',
}: PlatformSidebarProps): React.ReactElement {
  const [workspaceOpen, setWorkspaceOpen] = useState(() =>
    WORKSPACE_CHILDREN.some((ch) => pathMatches(currentPath, ch.paths)),
  );

  useEffect(() => {
    if (WORKSPACE_CHILDREN.some((ch) => pathMatches(currentPath, ch.paths))) setWorkspaceOpen(true);
  }, [currentPath]);

  const openValidators = () => {
    const url = getValidatorPortalUrl();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else onSelectView('missionMarketplace');
  };

  const homeActive = pathMatches(currentPath, HOME_PATHS);

  const moreActive = pathMatches(currentPath, ['/additional-modules', '/modules', '/more-tools', '/classic-home']);

  const stickyCls = stickyTop.trim() ? `sticky ${stickyTop.trim()}` : '';

  return (
    <aside
      className={`${stickyCls} z-[95] flex w-[276px] shrink-0 flex-col overflow-y-auto border-r border-slate-800/80 bg-[#0f172a] ${
        stickyCls ? 'max-h-[100dvh] self-start' : 'min-h-[100dvh]'
      } ${className}`}
      aria-label="DPAL platform navigation"
    >
      <div className="border-b border-slate-800/90 px-5 py-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-600 text-sm font-black text-white shadow-lg shadow-emerald-900/30">
            D
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight text-white">DPAL</p>
            <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400">
              Planetary Intelligence &amp; Public Accountability
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavButton label="Home" active={homeActive} onClick={() => onSelectView('mainMenu')} icon={<HomeIcon />} accentActive />

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
                const active = pathMatches(currentPath, item.paths);
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

      <div className="space-y-3 border-t border-slate-800/90 px-4 py-5">
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
