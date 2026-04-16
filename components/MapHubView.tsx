/**
 * MapHubView — DPAL Community Report World Map (Google Maps)
 *
 * Uses the existing VITE_GOOGLE_MAPS_API_KEY via loadGoogleMaps().
 * Geocodes report location strings (with localStorage cache).
 * Colour-codes pins by category; size scales with severity.
 * Falls back to CartoDB/Leaflet if the key is missing.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Category } from '../types';
import type { Report } from '../types';
import { loadGoogleMaps } from '../services/googleMapsLoader';
import { Loader } from './icons';

// ── Category → hex colour ──────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  [Category.PoliceMisconduct]:           '#ef4444',
  [Category.FireEnvironmentalHazards]:   '#f97316',
  [Category.PublicSafetyAlerts]:         '#f59e0b',
  [Category.AccidentsRoadHazards]:       '#fb923c',
  [Category.Environment]:                '#22c55e',
  [Category.WaterViolations]:            '#3b82f6',
  [Category.Infrastructure]:             '#64748b',
  [Category.HousingIssues]:              '#a78bfa',
  [Category.WorkplaceIssues]:            '#06b6d4',
  [Category.CivicDuty]:                  '#8b5cf6',
  [Category.ConsumerScams]:              '#eab308',
  [Category.MedicalNegligence]:          '#f43f5e',
  [Category.Education]:                  '#6366f1',
  [Category.StolenPropertyRegistry]:     '#94a3b8',
  [Category.InsuranceFraud]:             '#f472b6',
  [Category.ElderlyCare]:                '#34d399',
  [Category.VeteransServices]:           '#60a5fa',
  [Category.GoodDeeds]:                  '#4ade80',
  [Category.Other]:                      '#64748b',
};

function catColor(cat: string) { return CATEGORY_COLOR[cat] ?? '#64748b'; }

function pinRadius(severity: string): number {
  if (severity === 'Catastrophic') return 12;
  if (severity === 'Critical')     return 9;
  if (severity === 'Standard')     return 7;
  return 6;
}

// ── Google Maps dark style ─────────────────────────────────────────────────────

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',       stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'landscape',      stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi',            stylers: [{ visibility: 'off' }] },
  { featureType: 'road',           elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road',           elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'road',           elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'road.highway',   elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'transit',        stylers: [{ visibility: 'off' }] },
  { featureType: 'water',          elementType: 'geometry', stylers: [{ color: '#020817' }] },
  { featureType: 'water',          elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
];

// ── Demo global pins ───────────────────────────────────────────────────────────

const DEMO_PINS = [
  { id: 'd1',  title: 'Industrial discharge into river',         category: Category.WaterViolations,          location: 'São Paulo, Brazil',        lat: -23.55, lng: -46.63 },
  { id: 'd2',  title: 'Police use-of-force complaint',           category: Category.PoliceMisconduct,         location: 'Chicago, USA',             lat: 41.85,  lng: -87.65 },
  { id: 'd3',  title: 'Wildfire air quality — PM2.5 critical',   category: Category.FireEnvironmentalHazards, location: 'Los Angeles, USA',         lat: 34.05,  lng: -118.25},
  { id: 'd4',  title: 'Unsafe school building — cracked walls',  category: Category.Education,               location: 'Lagos, Nigeria',           lat: 6.52,   lng: 3.38  },
  { id: 'd5',  title: 'Bridge closure — structural failure',     category: Category.Infrastructure,           location: 'Mumbai, India',            lat: 19.08,  lng: 72.88 },
  { id: 'd6',  title: 'Landlord habitability violations',        category: Category.HousingIssues,            location: 'London, UK',               lat: 51.50,  lng: -0.12 },
  { id: 'd7',  title: 'Wage theft — 40 workers unpaid',          category: Category.WorkplaceIssues,          location: 'Mexico City, Mexico',      lat: 19.43,  lng: -99.13},
  { id: 'd8',  title: 'Unlicensed medical clinic operating',     category: Category.MedicalNegligence,        location: 'Cairo, Egypt',             lat: 30.04,  lng: 31.24 },
  { id: 'd9',  title: 'Investment scam targeting retirees',      category: Category.ConsumerScams,            location: 'Sydney, Australia',        lat: -33.87, lng: 151.21},
  { id: 'd10', title: 'Deforestation in protected reserve',      category: Category.Environment,              location: 'Manaus, Brazil',           lat: -3.12,  lng: -60.02},
  { id: 'd11', title: 'Hit-and-run — pedestrian struck',         category: Category.AccidentsRoadHazards,     location: 'Paris, France',            lat: 48.87,  lng: 2.33  },
  { id: 'd12', title: 'Veterans benefits wrongfully denied',     category: Category.VeteransServices,         location: 'Houston, USA',             lat: 29.76,  lng: -95.37},
  { id: 'd13', title: 'Election fraud allegation filed',         category: Category.CivicDuty,               location: 'Nairobi, Kenya',           lat: -1.29,  lng: 36.82 },
  { id: 'd14', title: 'Community clean-up — 500 trees planted',  category: Category.GoodDeeds,               location: 'Bogotá, Colombia',         lat: 4.71,   lng: -74.07},
  { id: 'd15', title: 'Elderly care facility neglect',           category: Category.ElderlyCare,              location: 'Tokyo, Japan',             lat: 35.69,  lng: 139.69},
  { id: 'd16', title: 'Insurance fraud — staged accident ring',  category: Category.InsuranceFraud,           location: 'Toronto, Canada',          lat: 43.65,  lng: -79.38},
  { id: 'd17', title: 'Stolen vehicle ring — 12 cars recovered', category: Category.StolenPropertyRegistry,   location: 'Berlin, Germany',          lat: 52.52,  lng: 13.40 },
  { id: 'd18', title: 'Protest safety alert — crowd crush risk', category: Category.PublicSafetyAlerts,       location: 'Bangkok, Thailand',        lat: 13.76,  lng: 100.50},
  { id: 'd19', title: 'Water contamination — E.coli detected',   category: Category.WaterViolations,          location: 'Flint, USA',               lat: 43.01,  lng: -83.69},
  { id: 'd20', title: 'Illegal dumping of toxic waste',          category: Category.Environment,              location: 'Manila, Philippines',      lat: 14.60,  lng: 121.00},
  { id: 'd21', title: 'Gas explosion — 3 residential blocks',    category: Category.FireEnvironmentalHazards, location: 'Karachi, Pakistan',        lat: 24.86,  lng: 67.01 },
  { id: 'd22', title: 'Crowdfund scam — $200k raised, fled',     category: Category.ConsumerScams,            location: 'Singapore',                lat: 1.35,   lng: 103.82},
  { id: 'd23', title: 'Police station oversight report',         category: Category.PoliceMisconduct,         location: 'Johannesburg, SA',         lat: -26.20, lng: 28.04 },
  { id: 'd24', title: 'Flood damage — blocked drainage culprits',category: Category.Infrastructure,           location: 'Jakarta, Indonesia',       lat: -6.21,  lng: 106.85},
  { id: 'd25', title: 'Teacher abuse at state school',           category: Category.Education,               location: 'Buenos Aires, Argentina',  lat: -34.60, lng: -58.38},
];

// ── Geocoding cache (localStorage) ────────────────────────────────────────────

const GEO_CACHE_KEY = 'dpal_geo_cache_v1';

function readCache(): Record<string, { lat: number; lng: number }> {
  try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) ?? '{}'); } catch { return {}; }
}
function writeCache(cache: Record<string, { lat: number; lng: number }>) {
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (!location?.trim()) return null;
  const cache = readCache();
  const key = location.trim().toLowerCase();
  if (cache[key]) return cache[key];

  return new Promise((resolve) => {
    const g = (window as any).google as typeof google | undefined;
    if (!g?.maps?.Geocoder) { resolve(null); return; }
    new g.maps.Geocoder().geocode({ address: location }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        cache[key] = coords;
        writeCache(cache);
        resolve(coords);
      } else {
        resolve(null);
      }
    });
  });
}

// SVG circle marker icon
function circleIcon(color: string, radius: number, opacity = 1.0) {
  const size = radius * 2 + 4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="${color}" fill-opacity="${opacity}" stroke="white" stroke-opacity="0.7" stroke-width="1.5"/>
  </svg>`;
  const g = (window as any).google as typeof google;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new g.maps.Size(size, size),
    anchor: new g.maps.Point(size / 2, size / 2),
  };
}

// ── Legend ─────────────────────────────────────────────────────────────────────

const LEGEND_ENTRIES = [
  { color: '#ef4444', label: 'Police Misconduct',    cat: Category.PoliceMisconduct },
  { color: '#f97316', label: 'Fire / Env Hazards',   cat: Category.FireEnvironmentalHazards },
  { color: '#f59e0b', label: 'Public Safety',        cat: Category.PublicSafetyAlerts },
  { color: '#fb923c', label: 'Road Hazards',         cat: Category.AccidentsRoadHazards },
  { color: '#22c55e', label: 'Environment',          cat: Category.Environment },
  { color: '#3b82f6', label: 'Water Violations',     cat: Category.WaterViolations },
  { color: '#a78bfa', label: 'Housing',              cat: Category.HousingIssues },
  { color: '#06b6d4', label: 'Workplace',            cat: Category.WorkplaceIssues },
  { color: '#8b5cf6', label: 'Civic Duty',           cat: Category.CivicDuty },
  { color: '#eab308', label: 'Consumer Scams',       cat: Category.ConsumerScams },
  { color: '#f43f5e', label: 'Medical',              cat: Category.MedicalNegligence },
  { color: '#6366f1', label: 'Education',            cat: Category.Education },
  { color: '#64748b', label: 'Other',                cat: Category.Other },
];

// ── Main component ─────────────────────────────────────────────────────────────

interface MapHubViewProps {
  onReturnToMainMenu: () => void;
  onOpenFilters?: () => void;
  mapCenter?: string;
  reports?: Report[];
  filteredReports?: Report[];
}

const MapHubView: React.FC<MapHubViewProps> = ({ filteredReports = [], reports = [] }) => {
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoRef    = useRef<google.maps.InfoWindow | null>(null);

  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showDemo, setShowDemo] = useState(true);

  const displayReports = filteredReports.length > 0 ? filteredReports : reports;

  // Build combined pin list (demo + real reports)
  const allPins = useMemo(() => {
    const demos = showDemo ? DEMO_PINS.map(p => ({ ...p, severity: 'Standard', status: 'Showcase', isDemo: true })) : [];
    const live  = displayReports.map(r => ({ id: r.id, title: r.title, category: r.category, location: r.location, severity: r.severity, status: r.status, isDemo: false, lat: 0, lng: 0 }));
    return [...demos, ...live];
  }, [displayReports, showDemo]);

  const filteredPins = useMemo(() =>
    categoryFilter === 'all' ? allPins : allPins.filter(p => p.category === categoryFilter),
    [allPins, categoryFilter]
  );

  // Active categories for filter chips
  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    displayReports.forEach(r => cats.add(r.category));
    if (showDemo) DEMO_PINS.forEach(p => cats.add(p.category));
    return Array.from(cats).sort();
  }, [displayReports, showDemo]);

  // ── Initialise map ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!mapDivRef.current) return;
      setMapStatus('loading');
      try {
        await loadGoogleMaps();
        if (cancelled || !mapDivRef.current) return;
        const g = (window as any).google as typeof google;
        const map = new g.maps.Map(mapDivRef.current, {
          center: { lat: 20, lng: 10 },
          zoom: 2,
          minZoom: 1,
          maxZoom: 18,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: DARK_STYLE,
        });
        mapRef.current = map;
        infoRef.current = new g.maps.InfoWindow();
        setMapStatus('ready');
      } catch {
        if (!cancelled) setMapStatus('error');
      }
    };
    void init();
    return () => { cancelled = true; };
  }, []);

  // ── Place / refresh markers when map ready or filters change ───────────────
  const placeMarkers = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const g = (window as any).google as typeof google;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    for (const pin of filteredPins) {
      let lat = (pin as any).lat as number;
      let lng = (pin as any).lng as number;

      // Real reports: geocode if no coords
      if (!pin.isDemo || lat === 0) {
        if (lat === 0 || lng === 0) {
          const coords = await geocodeLocation(pin.location);
          if (!coords) continue;
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      const color  = catColor(pin.category);
      const radius = pinRadius(pin.severity);
      const marker = new g.maps.Marker({
        position: { lat, lng },
        map,
        icon: circleIcon(color, radius, pin.isDemo ? 0.55 : 0.9),
        title: pin.title,
        zIndex: pin.isDemo ? 1 : 10,
      });

      const infoContent = `
        <div style="background:#0f172a;border-radius:10px;padding:12px 14px;min-width:210px;font-family:ui-monospace,monospace;color:#e2e8f0;">
          ${pin.isDemo ? '<p style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:.12em;margin-bottom:4px">Global Showcase</p>' : ''}
          <p style="font-size:12px;font-weight:700;margin:0 0 6px;line-height:1.4;color:#f1f5f9">${pin.title}</p>
          <span style="display:inline-block;font-size:9px;font-weight:700;padding:2px 8px;border-radius:999px;background:${color}20;color:${color};border:1px solid ${color}60;margin-bottom:6px">${pin.category}</span>
          <p style="font-size:10px;color:#64748b;margin:0">📍 ${pin.location}</p>
          ${!pin.isDemo ? `<p style="font-size:9px;color:#475569;margin:4px 0 0">Severity: ${pin.severity} · ${pin.status}</p>` : ''}
        </div>`;

      marker.addListener('click', () => {
        infoRef.current?.setContent(infoContent);
        infoRef.current?.open(map, marker);
      });

      markersRef.current.push(marker);
    }
  }, [filteredPins]);

  useEffect(() => {
    if (mapStatus === 'ready') void placeMarkers();
  }, [mapStatus, placeMarkers]);

  // Cleanup markers on unmount
  useEffect(() => () => { markersRef.current.forEach(m => m.setMap(null)); }, []);

  const liveCount = displayReports.length;
  const demoCount = showDemo ? DEMO_PINS.length : 0;

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Community Report Map</h2>
          <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full text-slate-400">
            {(filteredPins).length} pin{filteredPins.length !== 1 ? 's' : ''}
            {liveCount > 0 && <span className="text-teal-400 ml-1">· {liveCount} live</span>}
          </span>
          <span className="text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Google Maps</span>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" checked={showDemo} onChange={e => setShowDemo(e.target.checked)} className="accent-teal-500 w-3 h-3" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Global showcase</span>
        </label>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
            categoryFilter === 'all' ? 'bg-slate-200 text-slate-900 border-slate-200' : 'text-slate-500 border-slate-700 hover:border-slate-500'
          }`}
        >All</button>
        {activeCategories.slice(0, 12).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
            className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all"
            style={{
              background: categoryFilter === cat ? catColor(cat) + '30' : 'transparent',
              color: categoryFilter === cat ? catColor(cat) : '#64748b',
              borderColor: categoryFilter === cat ? catColor(cat) + '80' : '#334155',
            }}
          >
            {cat.length > 22 ? cat.slice(0, 20) + '…' : cat}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-slate-700/60" style={{ height: '480px' }}>

        {/* Loading / error states */}
        {mapStatus === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950">
            <div className="text-center">
              <Loader className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Loading Google Maps…</p>
            </div>
          </div>
        )}
        {mapStatus === 'error' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950">
            <div className="text-center max-w-xs px-6">
              <p className="text-2xl mb-2">🗺️</p>
              <p className="text-sm font-bold text-slate-300 mb-1">Google Maps unavailable</p>
              <p className="text-xs text-slate-500">Check that <code className="text-slate-400">VITE_GOOGLE_MAPS_API_KEY</code> is set and the Maps JavaScript API + Geocoding API are enabled in GCP.</p>
            </div>
          </div>
        )}

        <div ref={mapDivRef} className="w-full h-full" />

        {/* Legend overlay */}
        {mapStatus === 'ready' && (
          <div className="absolute bottom-8 left-3 z-[5] bg-slate-900/92 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-2 max-h-[220px] overflow-y-auto">
            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Categories</p>
            <div className="space-y-1">
              {LEGEND_ENTRIES.map(({ color, label, cat }) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity w-full"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className={`text-[9px] font-bold uppercase tracking-wide text-left ${categoryFilter === cat ? 'text-white' : 'text-slate-400'}`}>{label}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-700/60 mt-2 pt-1.5">
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mb-1">Size = Severity</p>
              {[{ r: 12, label: 'Catastrophic' }, { r: 9, label: 'Critical' }, { r: 7, label: 'Standard' }].map(({ r, label }) => (
                <div key={label} className="flex items-center gap-2 mb-0.5">
                  <svg width={r * 2 + 4} height={r * 2 + 4} viewBox={`0 0 ${r*2+4} ${r*2+4}`}>
                    <circle cx={r + 2} cy={r + 2} r={r} fill="#94a3b8" fillOpacity="0.6" />
                  </svg>
                  <span className="text-[9px] text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Live reports',       value: liveCount, color: 'text-teal-400' },
          { label: 'Showcase pins',      value: demoCount, color: 'text-slate-400' },
          { label: 'Categories active',  value: activeCategories.length, color: 'text-indigo-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapHubView;
