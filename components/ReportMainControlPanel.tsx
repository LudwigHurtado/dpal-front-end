import React from 'react';
import {
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

interface ReportMainControlPanelProps {
  onOpenReportFlow: () => void;
}

const sidebarItems = [
  { label: 'Current Alerts', count: 6, active: true },
  { label: 'Verify Reports', count: 3 },
  { label: 'Search Reports' },
  { label: 'Lost Pets' },
  { label: 'Lost Persons' },
  { label: 'Stolen Property' },
  { label: 'My Reports' },
];

const topFilters = ['Hazard', 'Lost Pet', 'Lost Person', 'Stolen Property'];

const statTiles = [
  { label: 'Active Alerts', value: 4, tone: 'bg-rose-600/20 border-rose-500/40 text-rose-300' },
  { label: 'Pending Verification', value: 3, tone: 'bg-amber-600/20 border-amber-500/40 text-amber-300' },
  { label: 'Open Cases', value: 1, tone: 'bg-blue-600/20 border-blue-500/40 text-blue-300' },
  { label: 'Hours Volunteered', value: 72, tone: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' },
];

const ReportMainControlPanel: React.FC<ReportMainControlPanelProps> = ({ onOpenReportFlow }) => {
  return (
    <div className="font-mono text-white max-w-[1500px] mx-auto px-4 pb-16 animate-fade-in">
      <header className="sticky top-2 z-30 rounded-2xl border border-zinc-700 bg-gradient-to-r from-zinc-900/95 via-slate-900/95 to-zinc-900/95 backdrop-blur px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-7 h-7 text-cyan-300 flex-shrink-0" />
            <div className="text-3xl font-black tracking-tight">DPAL</div>
          </div>
          <nav className="hidden lg:flex items-center gap-6 text-sm text-zinc-300">
            <span className="inline-flex items-center gap-2"><Search className="w-4 h-4" />Search</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Verify</span>
            <span className="inline-flex items-center gap-2"><Database className="w-4 h-4" />Resources</span>
            <span className="inline-flex items-center gap-2"><User className="w-4 h-4" />My Reports</span>
            <span className="inline-flex items-center gap-2"><Heart className="w-4 h-4" />Community</span>
          </nav>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl border border-zinc-700 bg-zinc-900/80">
              <AlertCircle className="w-5 h-5 text-zinc-300" />
            </button>
            <button
              onClick={onOpenReportFlow}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest"
            >
              Report an Incident
            </button>
          </div>
        </div>
      </header>

      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2"><Home className="w-4 h-4" />Home</span>
        <span className="mx-2">/</span>
        <span>Main Control Panel</span>
      </div>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-[300px_1fr_340px] gap-4">
        <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4 h-[calc(100vh-180px)] overflow-y-auto">
          <h2 className="text-lg font-black">Reporting Dashboard</h2>
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                className={`w-full text-left px-3 py-2 rounded-xl border flex items-center justify-between ${
                  item.active
                    ? 'bg-cyan-600/20 border-cyan-500/40 text-cyan-200'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <span className="text-sm">{item.label}</span>
                {item.count ? <span className="text-xs font-black">{item.count}</span> : null}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Map shortcut</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2"><Map className="w-4 h-4 text-cyan-300" />Alerts Map</span>
              <span className="text-emerald-300 text-xs font-black">Active</span>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  placeholder="Search DPAL Reports..."
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {topFilters.map((f, idx) => (
                  <button
                    key={f}
                    className={`px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider ${
                      idx === 0
                        ? 'bg-rose-600/20 border-rose-500/50 text-rose-200'
                        : 'bg-zinc-950 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {statTiles.map((s) => (
              <div key={s.label} className={`rounded-xl border p-3 ${s.tone}`}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-[11px] uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
          <div
            className="rounded-2xl border border-zinc-800 overflow-hidden bg-cover bg-center min-h-[430px] relative"
            style={{ backgroundImage: "url('/report-protect/report-protect-bg-reference.png')" }}
          />
          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_340px] gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <h3 className="text-lg font-black">Current Alerts</h3>
              <div className="mt-3 space-y-3">
                {['Downed Power Line Across Road', 'Suspicious Person Seen Lurking', 'Lost Pet Alert - Riley'].map((item) => (
                  <div key={item} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold">{item}</p>
                      <p className="text-xs text-zinc-400 mt-1">Observers · Urgent · Updated 8m ago</p>
                    </div>
                    <button className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2">
                      Verify
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <h3 className="text-lg font-black">Selected Case</h3>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="aspect-video rounded-lg bg-zinc-800 mb-3 flex items-center justify-center text-zinc-500 text-xs">
                  Sector image placeholder
                </div>
                <p className="font-bold">Lost Pet Alert · Riley</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden xl:block rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300">Quick panels</h3>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">Verification queue</div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">Nearby responders</div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">Resource shortcuts</div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">Incident notes</div>
        </aside>
      </div>
    </div>
  );
};

export default ReportMainControlPanel;
