import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Database,
  Heart,
  Home,
  Map,
  MapPin,
  Search,
  ShieldCheck,
  User,
} from './icons';

interface ReportProtectPageProps {
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

const ReportProtectPage: React.FC<ReportProtectPageProps> = ({ onOpenReportFlow }) => {
  return (
    <div className="font-mono text-white max-w-[1500px] mx-auto px-4 pb-16 animate-fade-in">
      {/* Layer A: Top global header */}
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
              <Bell className="w-5 h-5 text-zinc-300" />
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

      {/* Breadcrumb bar */}
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2"><Home className="w-4 h-4" />Home</span>
        <span className="mx-2">/</span>
        <span>Report & Protect</span>
      </div>

      {/* Layer B + C: Main body */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-[300px_1fr_340px] gap-4">
        {/* Left sidebar */}
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

          <div className="rounded-xl border border-rose-500/30 bg-rose-900/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-rose-300">Live urgent item</p>
            <p className="mt-2 text-sm font-bold">Downed Power Line Across Road</p>
            <p className="text-xs text-zinc-400 mt-1">Calvert St & North Ave.</p>
          </div>
        </aside>

        {/* Center column */}
        <section className="space-y-4">
          {/* Search + filters */}
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

          {/* Stat tiles */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {statTiles.map((s) => (
              <div key={s.label} className={`rounded-xl border p-3 ${s.tone}`}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-[11px] uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main map zone */}
          <div
            className="rounded-2xl border border-zinc-800 overflow-hidden bg-cover bg-center min-h-[430px] relative"
            style={{ backgroundImage: "url('/report-protect/report-protect-bg-reference.png')" }}
          >
            <div className="absolute inset-0 bg-zinc-950/35" />
            <div className="absolute top-3 left-3 flex gap-2 z-10">
              <button className="px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs">+</button>
              <button className="px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs">-</button>
              <button className="px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs">Layers</button>
            </div>
            <div className="absolute top-3 right-3 rounded-lg bg-zinc-900/90 border border-zinc-700 p-2 text-xs z-10 space-y-1">
              <p>Hazard · 2</p>
              <p>Lost Pet · 1</p>
              <p>Lost Person · 1</p>
              <p>Stolen Property · 1</p>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-sm font-black tracking-widest text-white/90">
              LIVE MAP ZONE
            </div>
          </div>

          {/* Lower info zone */}
          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_340px] gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black">Current Alerts</h3>
                <div className="text-xs text-zinc-400">All · Urgent · Nearby · Unverified</div>
              </div>
              <div className="mt-3 space-y-3">
                {[
                  'Downed Power Line Across Road',
                  'Suspicious Person Seen Lurking',
                  'Lost Pet Alert - Riley',
                ].map((item) => (
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
                <p className="text-sm text-zinc-300 mt-1">Lost Golden Retriever near Federal Hill Park.</p>
                <p className="text-xs text-zinc-400 mt-2">Reporter trust score: 88</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="px-3 py-2 rounded-lg bg-zinc-800 text-xs font-black uppercase">View Case</button>
                  <button className="px-3 py-2 rounded-lg bg-emerald-600 text-xs font-black uppercase">Add Sighting</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Optional right rail */}
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

export default ReportProtectPage;

