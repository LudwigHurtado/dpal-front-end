import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  AlertCircle,
  ArrowLeft,
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

/** Matches `HubTab` in App — duplicated here to avoid circular imports */
export type ReportDashboardHubTab = 'my_reports' | 'community' | 'work_feed' | 'map';

export interface ReportProtectPageNavProps {
  /** Main menu */
  onReturnHome: () => void;
  /** Previous screen (stack) */
  onGoBack: () => void;
  /** Hub tabs: stories, contributions, timeline, map */
  onGoToHub: (tab: ReportDashboardHubTab) => void;
  onGoToTransparency: () => void;
  onGoToAcademy: () => void;
  onGoToLocator: () => void;
}

interface ReportProtectPageProps extends ReportProtectPageNavProps {
  onOpenReportFlow: () => void;
  onOpenMainControlPanel: () => void;
}

type DashboardFilter = 'all' | 'hazard' | 'lost-pet' | 'lost-person' | 'stolen-property';

const sidebarNav = [
  { id: 'current-alerts', label: 'Current Alerts', count: 6, icon: AlertCircle },
  { id: 'verify-reports', label: 'Verify Reports', count: 3, icon: ShieldCheck },
  { id: 'search-reports', label: 'Search Reports', icon: Search },
  { id: 'lost-pets', label: 'Lost Pets', icon: Heart },
  { id: 'lost-persons', label: 'Lost Persons', icon: User },
  { id: 'stolen-property', label: 'Stolen Property', icon: Database },
  { id: 'my-reports', label: 'My Contributions', icon: Home },
] as const;

const filterTabs: { id: DashboardFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'hazard', label: 'Hazard' },
  { id: 'lost-pet', label: 'Lost Pet' },
  { id: 'lost-person', label: 'Lost Person' },
  { id: 'stolen-property', label: 'Stolen Property' },
];

/** Sample feed rows — replace with API data when wired (see expert reference: search + filter state). */
const dashboardFeedItems: {
  id: string;
  type: string;
  title: string;
  meta: string;
  filter: Exclude<DashboardFilter, 'all'>;
}[] = [
  {
    id: 'f1',
    type: 'Hazard',
    title: 'Downed Power Line Across Road',
    meta: 'Observers · Urgent · Updated 8m ago',
    filter: 'hazard',
  },
  {
    id: 'f2',
    type: 'Safety',
    title: 'Suspicious Person Seen Lurking',
    meta: 'Observers · Urgent · Updated 23m ago',
    filter: 'hazard',
  },
  {
    id: 'f3',
    type: 'Lost Pet',
    title: 'Lost Pet Alert - Riley',
    meta: 'Observers · Open · Updated 30m ago',
    filter: 'lost-pet',
  },
  {
    id: 'f4',
    type: 'Lost Person',
    title: 'Wellness check requested — elderly walker',
    meta: 'Community · Updated 1h ago',
    filter: 'lost-person',
  },
  {
    id: 'f5',
    type: 'Stolen Property',
    title: 'Bicycle taken from rack — serial on file',
    meta: 'Filed · Updated 2h ago',
    filter: 'stolen-property',
  },
];

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
const markerKinds = [
  { id: 'hazard', label: 'Hazard', glyph: '⚠️' },
  { id: 'car', label: 'Car', glyph: '🚗' },
  { id: 'deer', label: 'Deer', glyph: '🦌' },
  { id: 'tree', label: 'Tree', glyph: '🌲' },
  { id: 'health', label: 'Health', glyph: '🏥' },
  { id: 'mountain', label: 'Mountain', glyph: '⛰️' },
] as const;
type MarkerKindId = typeof markerKinds[number]['id'];

const ReportProtectPage: React.FC<ReportProtectPageProps> = ({
  onOpenReportFlow,
  onOpenMainControlPanel,
  onReturnHome,
  onGoBack,
  onGoToHub,
  onGoToTransparency,
  onGoToAcademy,
  onGoToLocator,
}) => {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkersRef = useRef<google.maps.Marker[]>([]);
  const markerKindRef = useRef<MarkerKindId>('hazard');
  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'missing_key' | 'error'>('idle');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [markerKind, setMarkerKind] = useState<MarkerKindId>('hazard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<DashboardFilter>('all');
  const [selectedSidebarId, setSelectedSidebarId] = useState<string>('current-alerts');
  const alertsAnchorRef = useRef<HTMLDivElement | null>(null);

  const handleSidebarSelect = (id: (typeof sidebarNav)[number]['id']) => {
    setSelectedSidebarId(id);
    switch (id) {
      case 'current-alerts':
        queueMicrotask(() => alertsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        break;
      case 'verify-reports':
        onGoToTransparency();
        break;
      case 'search-reports':
        onGoToHub('community');
        break;
      case 'lost-pets':
      case 'lost-persons':
        onGoToLocator();
        break;
      case 'stolen-property':
        onOpenReportFlow();
        break;
      case 'my-reports':
        onGoToHub('my_reports');
        break;
      default:
        break;
    }
  };

  const shareCaseLink = () => {
    try {
      void navigator.clipboard?.writeText(window.location.href);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    markerKindRef.current = markerKind;
  }, [markerKind]);

  const incidentPins = useMemo(
    () =>
      [
        { title: 'Downed Power Line', lat: 39.3042, lng: -76.6163, color: '#f43f5e', filterKey: 'hazard' as const },
        { title: 'Lost Pet - Riley', lat: 39.2952, lng: -76.6224, color: '#10b981', filterKey: 'lost-pet' as const },
        { title: 'Missing Person Alert', lat: 39.2884, lng: -76.6144, color: '#3b82f6', filterKey: 'lost-person' as const },
        { title: 'Stolen Property Report', lat: 39.2997, lng: -76.6097, color: '#f59e0b', filterKey: 'stolen-property' as const },
      ] as const,
    []
  );

  const visiblePins = useMemo(() => {
    if (selectedFilter === 'all') return [...incidentPins];
    return incidentPins.filter((p) => p.filterKey === selectedFilter);
  }, [incidentPins, selectedFilter]);

  const visibleFeedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dashboardFeedItems.filter((item) => {
      const matchesQuery =
        !q ||
        [item.type, item.title, item.meta].join(' ').toLowerCase().includes(q);
      const matchesFilter = selectedFilter === 'all' || item.filter === selectedFilter;
      return matchesQuery && matchesFilter;
    });
  }, [searchQuery, selectedFilter]);

  const markerIconUrl = (kind: MarkerKindId): string => {
    const glyph = markerKinds.find((m) => m.id === kind)?.glyph || '📍';
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="22" fill="#0b1220" stroke="#22d3ee" stroke-width="3"/>
  <text x="32" y="39" text-anchor="middle" font-size="22" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji">${glyph}</text>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      if (!mapDivRef.current) return;
      const isFirstMapInit = !mapRef.current;
      if (isFirstMapInit) {
        setMapStatus('loading');
        setMapError(null);
      }
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

          mapRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (!event.latLng || !mapRef.current) return;
            const marker = new g.maps.Marker({
              map: mapRef.current,
              position: event.latLng,
              draggable: true,
              icon: {
                url: markerIconUrl(markerKindRef.current),
                scaledSize: new g.maps.Size(42, 42),
                anchor: new g.maps.Point(21, 21),
              },
            });
            userMarkersRef.current.push(marker);
          });
        }

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = visiblePins.map((pin) => (
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
  }, [visiblePins]);

  useEffect(() => {
    if (!mapRef.current) return;
    userMarkersRef.current.forEach((m) => {
      m.setIcon({
        url: markerIconUrl(markerKind),
        scaledSize: new google.maps.Size(42, 42),
        anchor: new google.maps.Point(21, 21),
      } as any);
    });
  }, [markerKind]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(mapType);
  }, [mapType]);

  return (
    <div className="font-sans text-white max-w-[1760px] mx-auto px-3 md:px-6 pb-16 animate-fade-in">
      {/* Layer A: Top global header */}
      <header className="sticky top-2 z-30 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl px-5 md:px-8 py-5 md:py-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onGoBack}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={onReturnHome}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-900/50"
                aria-label="Home"
              >
                <Home className="h-4 w-4" />
                Home
              </button>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 flex-shrink-0 text-cyan-200" />
              <div className="text-2xl font-extrabold tracking-tight sm:text-4xl">DPAL</div>
            </div>
          </div>

          <nav className="hidden flex-wrap items-center gap-x-6 gap-y-2 text-base text-slate-200 xl:flex">
            <button
              type="button"
              onClick={() => onGoToHub('community')}
              className="inline-flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:text-cyan-200"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
            <button
              type="button"
              onClick={onGoToTransparency}
              className="inline-flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:text-cyan-200"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify
            </button>
            <button
              type="button"
              onClick={onGoToAcademy}
              className="inline-flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:text-cyan-200"
            >
              <Database className="h-4 w-4" />
              Resources
            </button>
            <button
              type="button"
              onClick={() => onGoToHub('my_reports')}
              className="inline-flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:text-cyan-200"
            >
              <User className="h-4 w-4" />
              My Contributions
            </button>
            <button
              type="button"
              onClick={() => onGoToHub('community')}
              className="inline-flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:text-cyan-200"
            >
              <Heart className="h-4 w-4" />
              Community
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMainControlPanel}
              className="px-4 py-3 rounded-2xl border border-white/20 bg-slate-900/75 hover:bg-slate-800/90 text-white text-sm font-semibold"
            >
              Main Control Panel
            </button>
            <button
              type="button"
              onClick={() => onGoToHub('community')}
              className="rounded-2xl border border-white/15 bg-slate-900/75 p-3 transition-colors hover:bg-slate-800/90"
              aria-label="Community alerts"
              title="Open community feed"
            >
              <AlertCircle className="h-5 w-5 text-zinc-300" />
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

      {/* Compact nav when top bar links are hidden on smaller screens */}
      <nav
        className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-200 xl:hidden"
        aria-label="Quick dashboard links"
      >
        <button type="button" onClick={() => onGoToHub('community')} className="rounded-lg px-2 py-1 hover:bg-white/10">
          Search
        </button>
        <span className="text-slate-600">·</span>
        <button type="button" onClick={onGoToTransparency} className="rounded-lg px-2 py-1 hover:bg-white/10">
          Verify
        </button>
        <span className="text-slate-600">·</span>
        <button type="button" onClick={onGoToAcademy} className="rounded-lg px-2 py-1 hover:bg-white/10">
          Resources
        </button>
        <span className="text-slate-600">·</span>
        <button type="button" onClick={() => onGoToHub('my_reports')} className="rounded-lg px-2 py-1 hover:bg-white/10">
          My contributions
        </button>
        <span className="text-slate-600">·</span>
        <button type="button" onClick={() => onGoToHub('community')} className="rounded-lg px-2 py-1 hover:bg-white/10">
          Community
        </button>
      </nav>

      {/* Breadcrumb bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
        <button
          type="button"
          onClick={onReturnHome}
          className="inline-flex items-center gap-2 rounded-lg px-1 font-medium text-cyan-200/90 transition hover:text-white"
        >
          <Home className="h-4 w-4" />
          Home
        </button>
        <span className="text-slate-500">/</span>
        <span className="text-slate-200">Report Center</span>
      </div>

      {/* Layer B + C: Main body */}
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
        {/* Left sidebar */}
        <aside className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 space-y-5 h-[calc(100vh-180px)] overflow-y-auto shadow-[0_18px_45px_rgba(2,6,23,0.35)]">
          <h2 className="text-2xl font-bold tracking-tight">Report Center</h2>

          <div className="space-y-2.5">
            {sidebarNav.map((item) => {
              const active = selectedSidebarId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSidebarSelect(item.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-300/40 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                      : 'bg-slate-900/80 border-white/10 text-slate-200 hover:bg-slate-800/90 hover:border-white/20'
                  }`}
                >
                  <span className="inline-flex items-center gap-3 text-base font-medium">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {item.count != null ? <span className="text-sm font-bold">{item.count}</span> : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onGoToHub('map')}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/75 p-4 text-left transition hover:border-cyan-400/35 hover:bg-slate-800/80"
          >
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Map shortcut</p>
            <div className="mt-3 flex items-center justify-between text-base">
              <span className="inline-flex items-center gap-2">
                <Map className="h-4 w-4 text-cyan-300" />
                Hub map
              </span>
              <span className="text-sm font-semibold text-emerald-300">Open</span>
            </div>
          </button>

          <div className="rounded-2xl border border-rose-300/20 bg-rose-900/15 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-rose-200">Live urgent item</p>
            <p className="mt-2 text-base font-semibold">Downed Power Line Across Road</p>
            <p className="text-sm text-slate-300 mt-1">Calvert St & North Ave.</p>
            <p className="text-xs text-slate-400 mt-2">3 observers · urgent</p>
          </div>
        </aside>

        {/* Center column */}
        <section className="space-y-3">
          {/* Search + filters */}
          <div className="rounded-2xl border border-slate-300/45 bg-gradient-to-br from-slate-100/95 to-slate-200/90 p-4 shadow-[0_18px_45px_rgba(2,6,23,0.25)]">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search DPAL Reports..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 bg-white/95 text-base text-slate-800 placeholder:text-slate-500"
                  aria-label="Search reports"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                {filterTabs.map((tab) => {
                  const active = selectedFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedFilter(tab.id)}
                      className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition ${
                        active
                          ? 'bg-rose-100 border-rose-300 text-rose-700 shadow-sm'
                          : 'bg-white/90 border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {statTiles.map((s) => (
              <div key={s.label} className={`rounded-xl border p-4 shadow-[0_8px_18px_rgba(15,23,42,0.18)] ${s.tone} bg-white/85`}>
                <p className="text-4xl font-bold leading-none">{s.value}</p>
                <p className="text-sm uppercase tracking-wide mt-2">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main map zone */}
          <div
            className="rounded-xl border border-white/10 overflow-hidden min-h-[540px] relative bg-slate-900 shadow-[0_25px_60px_rgba(2,6,23,0.45)]"
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
            <div className="absolute top-4 left-4 flex gap-2 z-10 flex-wrap max-w-[70%]">
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
                onClick={() => setMapType((prev) => (prev === 'roadmap' ? 'satellite' : prev === 'satellite' ? 'hybrid' : 'roadmap'))}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-sm font-medium"
              >
                Layers
              </button>
              <button
                type="button"
                onClick={() => {
                  userMarkersRef.current.forEach((m) => m.setMap(null));
                  userMarkersRef.current = [];
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 text-sm font-medium"
              >
                Clear Markers
              </button>
            </div>
            <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 max-w-[70%]">
              {markerKinds.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  onClick={() => setMarkerKind(kind.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                    markerKind === kind.id
                      ? 'bg-cyan-600 border-cyan-300 text-white'
                      : 'bg-slate-900/90 border-white/20 text-slate-100'
                  }`}
                >
                  <span className="mr-1">{kind.glyph}</span>
                  {kind.label}
                </button>
              ))}
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
          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_390px] gap-0">
            <div ref={alertsAnchorRef} className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/75 p-6 scroll-mt-28">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Current Alerts</h3>
                <div className="text-sm text-slate-400">All · Urgent · Nearby · Unverified</div>
              </div>
              <div className="mt-4 space-y-4">
                {visibleFeedItems.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4">No reports match your search or filter.</p>
                ) : (
                  visibleFeedItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-sky-300/90">{item.type}</p>
                        <p className="text-lg font-semibold mt-0.5">{item.title}</p>
                        <p className="text-sm text-slate-400 mt-1">{item.meta}</p>
                      </div>
                      <div className="flex flex-wrap gap-2.5 justify-end">
                        {quickActions.map((a, idx) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => (idx === 0 ? onGoToTransparency() : onGoToHub('my_reports'))}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
                              idx === 0 ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'
                            }`}
                          >
                            {a}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/75 p-6">
              <h3 className="text-2xl font-bold">Selected Case</h3>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                <img
                  src="/report-protect/main-panel-series-05-report-protect-mobile.png"
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
                  <button
                    type="button"
                    onClick={() => onGoToHub('my_reports')}
                    className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold transition hover:bg-slate-600"
                  >
                    View case
                  </button>
                  <button
                    type="button"
                    onClick={onGoToLocator}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold transition hover:bg-emerald-500"
                  >
                    Add sighting
                  </button>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={onGoToTransparency}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500"
                  >
                    <Eye className="h-4 w-4" />
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={shareCaseLink}
                    className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold transition hover:bg-slate-600"
                  >
                    Share link
                  </button>
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

