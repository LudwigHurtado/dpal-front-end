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

const quickActions = ['Verify Report', 'Check Video', 'More Info'];
const mapLegend = [
  { label: 'Hazard', color: '#f43f5e' },
  { label: 'Lost Pet', color: '#10b981' },
  { label: 'Lost Person', color: '#3b82f6' },
  { label: 'Stolen Property', color: '#f59e0b' },
] as const;

const ReportProtectPage: React.FC<ReportProtectPageProps> = ({ onOpenReportFlow }) => {
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

      {/* Breadcrumb bar */}
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2"><Home className="w-4 h-4" />Home</span>
        <span className="mx-2">/</span>
        <span>Reporting Dashboard</span>
      </div>

      {/* Layer B + C: Main body */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4">
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
            <p className="text-[10px] text-zinc-500 mt-2">3 observers · urgent</p>
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
            className="rounded-2xl border border-zinc-800 overflow-hidden min-h-[500px] relative bg-zinc-900"
          >
            <div ref={mapDivRef} className="absolute inset-0" />
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
            <div className="absolute top-3 left-3 flex gap-2 z-10">
              <button
                type="button"
                onClick={() => mapRef.current?.setZoom(Math.min((mapRef.current?.getZoom() || 13) + 1, 20))}
                className="px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.setZoom(Math.max((mapRef.current?.getZoom() || 13) - 1, 3))}
                className="px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setMapType((prev) => (prev === 'roadmap' ? 'satellite' : 'roadmap'))}
                className="px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs"
              >
                Layers
              </button>
            </div>
            <div className="absolute top-3 right-3 rounded-lg bg-zinc-900/90 border border-zinc-700 p-2 text-xs z-10 space-y-1">
              {mapLegend.map((item) => (
                <p key={item.label} className="inline-flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </p>
              ))}
            </div>
            <div className="absolute bottom-3 right-3 rounded-lg bg-zinc-900/90 border border-zinc-700 px-2 py-1 text-[10px] z-10">
              {mapType === 'satellite' ? 'Satellite' : 'Roadmap'}
            </div>
          </div>

          {/* Lower info zone */}
          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_360px] gap-4">
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
                    <div className="flex flex-wrap gap-2 justify-end">
                      {quickActions.map((a, idx) => (
                        <button
                          key={a}
                          className={`px-3 py-2 rounded-lg text-white text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${
                            idx === 0 ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-zinc-800 hover:bg-zinc-700'
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

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <h3 className="text-lg font-black">Selected Case</h3>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <img
                  src="/report-protect/selected-case-placeholder.png"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                  alt=""
                  className="aspect-video rounded-lg object-cover mb-3 w-full border border-zinc-800"
                />
                <div className="aspect-video rounded-lg bg-zinc-800 mb-3 hidden items-center justify-center text-zinc-500 text-xs">
                  Sector image placeholder
                </div>
                <p className="font-bold">Lost Pet Alert · Riley</p>
                <p className="text-sm text-zinc-300 mt-1">Lost Golden Retriever near Federal Hill Park.</p>
                <p className="text-xs text-zinc-400 mt-2">Reporter trust score: 88</p>
                <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />Last seen: Oak Park</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="px-3 py-2 rounded-lg bg-zinc-800 text-xs font-black uppercase">View Case</button>
                  <button className="px-3 py-2 rounded-lg bg-emerald-600 text-xs font-black uppercase">Add Sighting</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="px-3 py-2 rounded-lg bg-blue-600 text-xs font-black uppercase inline-flex items-center justify-center gap-1"><Eye className="w-3 h-3" />Verify</button>
                  <button className="px-3 py-2 rounded-lg bg-zinc-700 text-xs font-black uppercase">Share</button>
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

