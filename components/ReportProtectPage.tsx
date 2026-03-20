import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  AlertCircle,
  Database,
  Eye,
  Heart,
  Home,
  Map,
  MapPin,
  Search,
  ShieldCheck,
  User,
} from './icons';
import { loadGoogleMaps } from '../services/googleMapsLoader';

interface ReportProtectPageProps {
  onOpenReportFlow: () => void;
  onOpenMainControlPanel: () => void;
}

const sidebarItems = [
  { label: 'Current Alerts', count: 6, active: true, icon: AlertCircle },
  { label: 'Verify Reports', count: 3, icon: ShieldCheck },
  { label: 'Search Reports', icon: Search },
  { label: 'Lost Pets', icon: Heart },
  { label: 'Lost Persons', icon: User },
  { label: 'Stolen Property', icon: Database },
  { label: 'My Reports', icon: Home },
];

const topFilters = ['Hazard', 'Lost Pet', 'Lost Person', 'Stolen Property'];

const statTiles = [
  { label: 'Active Alerts', value: 4, tone: 'bg-rose-600/20 border-rose-500/40 text-rose-300' },
  { label: 'Pending Verification', value: 3, tone: 'bg-amber-600/20 border-amber-500/40 text-amber-300' },
  { label: 'Open Cases', value: 1, tone: 'bg-blue-600/20 border-blue-500/40 text-blue-300' },
  { label: 'Hours Volunteered', value: 72, tone: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' },
];

const quickActions = ['Verify', 'Open Case'];
const mapLegend = [
  { label: 'Hazard', color: '#f43f5e' },
  { label: 'Lost Pet', color: '#10b981' },
  { label: 'Lost Person', color: '#3b82f6' },
  { label: 'Stolen Property', color: '#f59e0b' },
] as const;

const ReportProtectPage: React.FC<ReportProtectPageProps> = ({ onOpenReportFlow, onOpenMainControlPanel }) => {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'missing_key' | 'error'>('idle');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const incidentPins = useMemo(() => ([
    { title: 'Downed Power Line', lat: 39.3042, lng: -76.6163, color: '#f43f5e' },
    { title: 'Lost Pet - Riley', lat: 39.2952, lng: -76.6224, color: '#10b981' },
    { title: 'Missing Person Alert', lat: 39.2884, lng: -76.6144, color: '#3b82f6' },
    { title: 'Stolen Property Report', lat: 39.2997, lng: -76.6097, color: '#f59e0b' },
  ]), []);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      if (!mapDivRef.current) return;
      setMapStatus('loading');
      setMapError(null);
      try {
        const g = await loadGoogleMaps();
        if (cancelled || !mapDivRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(mapDivRef.current, {
            center: { lat: 39.2904, lng: -76.6122 },
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
          });
        }

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = incidentPins.map((pin) => (
          new g.maps.Marker({
            map: mapRef.current!,
            position: { lat: pin.lat, lng: pin.lng },
            title: pin.title,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: pin.color,
              fillOpacity: 1,
              strokeColor: '#0f172a',
              strokeWeight: 2,
            },
          })
        ));
        setMapStatus('ready');
      } catch (err: any) {
        const message = String(err?.message || '');
        if (message.includes('missing_google_maps_key')) setMapStatus('missing_key');
        else setMapStatus('error');
        setMapError(message || 'Map failed to initialize.');
      }
    };
    void bootstrap();
    return () => { cancelled = true; };
  }, [incidentPins]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(mapType);
  }, [mapType]);

  return (
    <div className="font-sans text-white max-w-[1760px] mx-auto px-3 md:px-6 pb-16 animate-fade-in">
      {/* Layer A: Top global header */}
      <header className="sticky top-2 z-30 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl px-5 md:px-8 py-5 md:py-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-8 h-8 text-cyan-200 flex-shrink-0" />
            <div className="text-4xl font-extrabold tracking-tight">DPAL</div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-base text-slate-200">
            <span className="inline-flex items-center gap-2.5"><Search className="w-4 h-4" />Search</span>
            <span className="inline-flex items-center gap-2.5"><ShieldCheck className="w-4 h-4" />Verify</span>
            <span className="inline-flex items-center gap-2.5"><Database className="w-4 h-4" />Resources</span>
            <span className="inline-flex items-center gap-2.5"><User className="w-4 h-4" />My Reports</span>
            <span className="inline-flex items-center gap-2.5"><Heart className="w-4 h-4" />Community</span>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMainControlPanel}
              className="px-4 py-3 rounded-2xl border border-white/20 bg-slate-900/75 hover:bg-slate-800/90 text-white text-sm font-semibold"
            >
              Main Control Panel
            </button>
            <button className="p-3 rounded-2xl border border-white/15 bg-slate-900/75 hover:bg-slate-800/90 transition-colors">
              <AlertCircle className="w-5 h-5 text-zinc-300" />
            </button>
            <button
              onClick={onOpenReportFlow}
              className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-cyan-900/30"
            >
              Report an Incident
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb bar */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
        <span className="inline-flex items-center gap-2"><Home className="w-4 h-4" />Home</span>
        <span className="mx-2.5 text-slate-500">/</span>
        <span>Reporting Dashboard</span>
      </div>

      {/* Layer B + C: Main body */}
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
        {/* Left sidebar */}
        <aside className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 space-y-5 h-[calc(100vh-180px)] overflow-y-auto shadow-[0_18px_45px_rgba(2,6,23,0.35)]">
          <h2 className="text-2xl font-bold tracking-tight">Reporting Dashboard</h2>

          <div className="space-y-2.5">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                className={`w-full text-left px-4 py-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  item.active
                    ? 'bg-cyan-500/20 border-cyan-300/40 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'bg-slate-900/80 border-white/10 text-slate-200 hover:bg-slate-800/90 hover:border-white/20'
                }`}
              >
                <span className="inline-flex items-center gap-3 text-base font-medium">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.count ? <span className="text-sm font-bold">{item.count}</span> : null}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Map shortcut</p>
            <div className="mt-3 flex items-center justify-between text-base">
              <span className="inline-flex items-center gap-2"><Map className="w-4 h-4 text-cyan-300" />Alerts Map</span>
              <span className="text-emerald-300 text-sm font-semibold">Active</span>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-300/20 bg-rose-900/15 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-rose-200">Live urgent item</p>
            <p className="mt-2 text-base font-semibold">Downed Power Line Across Road</p>
            <p className="text-sm text-slate-300 mt-1">Calvert St & North Ave.</p>
            <p className="text-xs text-slate-400 mt-2">3 observers · urgent</p>
          </div>
        </aside>

        {/* Center column */}
        <section className="space-y-6">
          {/* Search + filters */}
          <div className="rounded-3xl border border-slate-300/45 bg-gradient-to-br from-slate-100/95 to-slate-200/90 p-5 shadow-[0_18px_45px_rgba(2,6,23,0.25)]">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  placeholder="Search DPAL Reports..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 bg-white/95 text-base text-slate-800 placeholder:text-slate-500"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                {topFilters.map((f, idx) => (
                  <button
                    key={f}
                    className={`px-4 py-3 rounded-2xl border text-sm font-semibold ${
                      idx === 0
                        ? 'bg-rose-100 border-rose-300 text-rose-700'
                        : 'bg-white/90 border-slate-300 text-slate-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {statTiles.map((s) => (
              <div key={s.label} className={`rounded-2xl border p-5 shadow-[0_8px_18px_rgba(15,23,42,0.18)] ${s.tone} bg-white/85`}>
                <p className="text-4xl font-bold leading-none">{s.value}</p>
                <p className="text-sm uppercase tracking-wide mt-2">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main map zone */}
          <div
            className="rounded-3xl border border-white/10 overflow-hidden min-h-[620px] relative bg-slate-900 shadow-[0_25px_60px_rgba(2,6,23,0.45)]"
          >
            <div ref={mapDivRef} className="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/15 via-transparent to-slate-950/35 pointer-events-none z-[1]" />
            {mapStatus !== 'ready' && (
              <div className="absolute inset-0 z-20 bg-zinc-950/80 flex items-center justify-center p-6 text-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-200">
                    {mapStatus === 'missing_key' ? 'Map key missing' : mapStatus === 'error' ? 'Map unavailable' : 'Loading live map'}
                  </p>
                  {mapError ? <p className="text-[11px] text-zinc-400 mt-2">{mapError}</p> : null}
                </div>
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <button
                type="button"
                onClick={() => mapRef.current?.setZoom(Math.min((mapRef.current?.getZoom() || 13) + 1, 20))}
                className="w-11 h-11 rounded-xl bg-slate-900/90 border border-white/15 text-base font-bold"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.setZoom(Math.max((mapRef.current?.getZoom() || 13) - 1, 3))}
                className="w-11 h-11 rounded-xl bg-slate-900/90 border border-white/15 text-base font-bold"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setMapType((prev) => (prev === 'roadmap' ? 'satellite' : 'roadmap'))}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-sm font-medium"
              >
                Layers
              </button>
            </div>
            <div className="absolute top-4 right-4 rounded-xl bg-slate-900/90 border border-white/15 p-3 text-sm z-10 space-y-1.5">
              {mapLegend.map((item) => (
                <p key={item.label} className="inline-flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </p>
              ))}
            </div>
            <div className="absolute bottom-4 right-4 rounded-xl bg-slate-900/90 border border-white/15 px-3 py-1.5 text-xs z-10">
              {mapType === 'satellite' ? 'Satellite' : 'Roadmap'}
            </div>
          </div>

          {/* Lower info zone */}
          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_390px] gap-5">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/75 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Current Alerts</h3>
                <div className="text-sm text-slate-400">All · Urgent · Nearby · Unverified</div>
              </div>
              <div className="mt-4 space-y-4">
                {[
                  'Downed Power Line Across Road',
                  'Suspicious Person Seen Lurking',
                  'Lost Pet Alert - Riley',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{item}</p>
                      <p className="text-sm text-slate-400 mt-1">Observers · Urgent · Updated 8m ago</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5 justify-end">
                      {quickActions.map((a, idx) => (
                        <button
                          key={a}
                          className={`px-4 py-2.5 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2 ${
                            idx === 0 ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          {a}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/75 p-6">
              <h3 className="text-2xl font-bold">Selected Case</h3>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                <img
                  src="/report-protect/selected-case-placeholder.png"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                  alt=""
                  className="aspect-video rounded-xl object-cover mb-4 w-full border border-white/10"
                />
                <div className="aspect-video rounded-lg bg-zinc-800 mb-3 hidden items-center justify-center text-zinc-500 text-xs">
                  Sector image placeholder
                </div>
                <p className="text-xl font-semibold">Lost Pet Alert · Riley</p>
                <p className="text-base text-slate-200 mt-1.5">Lost Golden Retriever near Federal Hill Park.</p>
                <p className="text-sm text-slate-400 mt-2.5">Reporter trust score: 88</p>
                <p className="text-sm text-slate-400 mt-1 inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />Last seen: Oak Park</p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button className="px-4 py-3 rounded-xl bg-slate-700 text-sm font-semibold">View Case</button>
                  <button className="px-4 py-3 rounded-xl bg-emerald-600 text-sm font-semibold">Add Sighting</button>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <button className="px-4 py-3 rounded-xl bg-blue-600 text-sm font-semibold inline-flex items-center justify-center gap-1.5"><Eye className="w-4 h-4" />Verify</button>
                  <button className="px-4 py-3 rounded-xl bg-slate-700 text-sm font-semibold">Share</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReportProtectPage;

