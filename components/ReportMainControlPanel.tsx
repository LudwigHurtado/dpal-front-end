import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Database,
  Heart,
  Home,
  Map,
  Search,
  ShieldCheck,
  User,
} from './icons';
import type { ReportProtectPageNavProps } from './ReportProtectPage';

interface ReportMainControlPanelProps extends ReportProtectPageNavProps {
  onOpenReportFlow: () => void;
  onOpenWorkPanel: () => void;
  /** Opens the full Report Center (map + alerts) dashboard */
  onOpenDashboard: () => void;
}

const sidebarItems: { label: string; count?: number; active?: boolean; action: 'alerts' | 'verify' | 'search' | 'lostP' | 'lostPe' | 'stolen' | 'mine' }[] = [
  { label: 'Current Alerts', count: 6, active: true, action: 'alerts' },
  { label: 'Verify Reports', count: 3, action: 'verify' },
  { label: 'Search Reports', action: 'search' },
  { label: 'Lost Pets', action: 'lostP' },
  { label: 'Lost Persons', action: 'lostPe' },
  { label: 'Stolen Property', action: 'stolen' },
  { label: 'My Contributions', action: 'mine' },
];

const topFilters = ['Hazard', 'Lost Pet', 'Lost Person', 'Stolen Property'];

const statTiles = [
  { label: 'Active Alerts', value: 4, tone: 'bg-rose-600/20 border-rose-500/40 text-rose-300' },
  { label: 'Pending Verification', value: 3, tone: 'bg-amber-600/20 border-amber-500/40 text-amber-300' },
  { label: 'Open Cases', value: 1, tone: 'bg-blue-600/20 border-blue-500/40 text-blue-300' },
  { label: 'Hours Volunteered', value: 72, tone: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' },
];

const ReportMainControlPanel: React.FC<ReportMainControlPanelProps> = ({
  onOpenReportFlow,
  onOpenWorkPanel,
  onOpenDashboard,
  onReturnHome,
  onGoBack,
  onGoToHub,
  onGoToTransparency,
  onGoToAcademy,
  onGoToLocator,
}) => {
  const handleSidebar = (action: (typeof sidebarItems)[number]['action']) => {
    switch (action) {
      case 'verify':
        onGoToTransparency();
        break;
      case 'search':
        onGoToHub('work_feed');
        break;
      case 'lostP':
      case 'lostPe':
        onGoToLocator();
        break;
      case 'stolen':
        onOpenReportFlow();
        break;
      case 'mine':
        onGoToHub('my_reports');
        break;
      case 'alerts':
        onOpenDashboard();
        break;
      default:
        break;
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] animate-fade-in px-4 pb-16 font-mono text-white">
      <header className="sticky top-2 z-30 rounded-2xl border border-zinc-700 bg-gradient-to-r from-zinc-900/95 via-slate-900/95 to-zinc-900/95 px-4 py-4 backdrop-blur md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onGoBack}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-cyan-500/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={onReturnHome}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-zinc-800"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 flex-shrink-0 text-cyan-300" />
              <div className="text-2xl font-black tracking-tight md:text-3xl">DPAL</div>
            </div>
          </div>
          <nav className="hidden flex-wrap items-center gap-4 text-sm text-zinc-300 lg:flex">
            <button type="button" onClick={() => onGoToHub('work_feed')} className="inline-flex items-center gap-2 hover:text-cyan-300">
              <Search className="h-4 w-4" />
              Search
            </button>
            <button type="button" onClick={onGoToTransparency} className="inline-flex items-center gap-2 hover:text-cyan-300">
              <ShieldCheck className="h-4 w-4" />
              Verify
            </button>
            <button type="button" onClick={onGoToAcademy} className="inline-flex items-center gap-2 hover:text-cyan-300">
              <Database className="h-4 w-4" />
              Resources
            </button>
            <button type="button" onClick={() => onGoToHub('my_reports')} className="inline-flex items-center gap-2 hover:text-cyan-300">
              <User className="h-4 w-4" />
              My Contributions
            </button>
            <button type="button" onClick={() => onGoToHub('work_feed')} className="inline-flex items-center gap-2 hover:text-cyan-300">
              <Heart className="h-4 w-4" />
              Community
            </button>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/40"
            >
              Report Center
            </button>
            <button
              type="button"
              onClick={onOpenWorkPanel}
              className="rounded-xl border border-cyan-500/40 bg-zinc-900/80 px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-200 hover:bg-zinc-800"
            >
              Work Panel
            </button>
            <button
              type="button"
              onClick={() => onGoToHub('work_feed')}
              className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-2"
              aria-label="Community alerts"
            >
              <AlertCircle className="h-5 w-5 text-zinc-300" />
            </button>
            <button
              type="button"
              onClick={onOpenReportFlow}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-cyan-500"
            >
              Report an Incident
            </button>
          </div>
        </div>
      </header>

      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-xs text-zinc-400">
        <button type="button" onClick={onReturnHome} className="inline-flex items-center gap-2 font-medium text-cyan-400/90 hover:text-cyan-300">
          <Home className="h-4 w-4" />
          Home
        </button>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Main Control Panel</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr_340px]">
        <aside className="h-[calc(100vh-180px)] space-y-4 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="text-lg font-black">Report Center (compact)</h2>
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSidebar(item.action)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${
                  item.active ? 'border-cyan-500/40 bg-cyan-600/20 text-cyan-200' : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <span className="text-sm">{item.label}</span>
                {item.count != null ? <span className="text-xs font-black">{item.count}</span> : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onGoToHub('map')}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left transition hover:border-cyan-500/40"
          >
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Map shortcut</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2">
                <Map className="h-4 w-4 text-cyan-300" />
                Hub map
              </span>
              <span className="text-xs font-black text-emerald-300">Open</span>
            </div>
          </button>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  placeholder="Search DPAL Reports..."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2 pl-10 pr-3 text-sm"
                  readOnly
                  onFocus={() => onGoToHub('work_feed')}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {topFilters.map((f, idx) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => (idx === 0 ? onOpenReportFlow() : onGoToHub('work_feed'))}
                    className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider ${
                      idx === 0 ? 'border-rose-500/50 bg-rose-600/20 text-rose-200' : 'border-zinc-700 bg-zinc-950 text-zinc-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {statTiles.map((s) => (
              <div key={s.label} className={`rounded-xl border p-3 ${s.tone}`}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-[11px] uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="relative min-h-[430px] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-cover bg-center text-left"
            style={{ backgroundImage: "url('/report-protect/report-protect-bg-reference.png')" }}
          >
            <span className="absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              Open full Report Center →
            </span>
          </button>
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <h3 className="text-lg font-black">Current Alerts</h3>
              <div className="mt-3 space-y-3">
                {['Downed Power Line Across Road', 'Suspicious Person Seen Lurking', 'Lost Pet Alert - Riley'].map((item) => (
                  <div key={item} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <div>
                      <p className="font-bold">{item}</p>
                      <p className="mt-1 text-xs text-zinc-400">Observers · Urgent · Updated 8m ago</p>
                    </div>
                    <button
                      type="button"
                      onClick={onGoToTransparency}
                      className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-cyan-500"
                    >
                      Verify
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <h3 className="text-lg font-black">Selected Case</h3>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-500">Preview</div>
                <p className="font-bold">Lost Pet Alert · Riley</p>
                <button
                  type="button"
                  onClick={() => onGoToHub('my_reports')}
                  className="mt-3 w-full rounded-lg bg-slate-700 py-2 text-sm font-semibold hover:bg-slate-600"
                >
                  View in My Contributions
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 xl:block">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300">Quick panels</h3>
          <button
            type="button"
            onClick={onGoToTransparency}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left text-sm hover:border-cyan-500/40"
          >
            Verification queue
          </button>
          <button
            type="button"
            onClick={() => onGoToHub('map')}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left text-sm hover:border-cyan-500/40"
          >
            Nearby on map
          </button>
          <button
            type="button"
            onClick={onGoToAcademy}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left text-sm hover:border-cyan-500/40"
          >
            Learning resources
          </button>
          <button
            type="button"
            onClick={onOpenReportFlow}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left text-sm hover:border-cyan-500/40"
          >
            New incident note
          </button>
        </aside>
      </div>
    </div>
  );
};

export default ReportMainControlPanel;
