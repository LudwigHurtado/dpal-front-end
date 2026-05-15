import React from 'react';
import { Circle, CircleMarker, MapContainer, Polygon, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import {
  buildCarbonPuraContextUrl,
  CARBONPURA_DEFAULT_PROJECT_ID,
  CARBONPURA_MODULE_ROUTES,
} from '../carbonPuraProjectContext';

const DEMO_CENTER = { lat: 33.985, lng: -118.472 };
const DEMO_RADIUS_KM = 8;

const MONITORING_LAYERS = [
  'Water Monitor',
  'AquaScan',
  'PACE Plastic Watch',
  'Carbon / Forest',
  'Air',
  'Hazardous Waste',
] as const;

const EVIDENCE_MARKERS = [
  { id: 'ev-water', label: 'Water project context', lat: 33.992, lng: -118.458, type: 'water' as const },
  { id: 'ev-plastic', label: 'PACE plastic confidence layer', lat: 33.978, lng: -118.485, type: 'plasticWatch' as const },
  { id: 'ev-carbon', label: 'Carbon / forest screening context', lat: 33.981, lng: -118.451, type: 'carbon' as const },
];

/** Demo AOI placeholder — square ring around project center (not a live zonal boundary). */
const AOI_PLACEHOLDER: Array<{ lat: number; lng: number }> = [
  { lat: 34.018, lng: -118.505 },
  { lat: 34.018, lng: -118.439 },
  { lat: 33.952, lng: -118.439 },
  { lat: 33.952, lng: -118.505 },
];

const OSM_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function toPolygonRing(points: Array<{ lat: number; lng: number }>): [number, number][] {
  const ring: [number, number][] = points.map((p) => [p.lat, p.lng]);
  const first = ring[0];
  ring.push([first[0], first[1]]);
  return ring;
}

const WATER_MONITOR_HREF = buildCarbonPuraContextUrl(CARBONPURA_MODULE_ROUTES.waterMonitor);
const AQUASCAN_HREF = buildCarbonPuraContextUrl(CARBONPURA_MODULE_ROUTES.aquaScan, CARBONPURA_DEFAULT_PROJECT_ID, {
  sourceSuite: 'OC_IOP',
});
const PLASTIC_WATCH_HREF = buildCarbonPuraContextUrl(CARBONPURA_MODULE_ROUTES.plasticWatch, CARBONPURA_DEFAULT_PROJECT_ID, {
  sourceSuite: 'OC_AOP',
});

export function CarbonPuraProjectMapPanel() {
  const [tileError, setTileError] = React.useState(false);
  const aoiRing = toPolygonRing(AOI_PLACEHOLDER);

  return (
    <section
      data-testid="carbonpura-project-map"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Project map + AOI overview</h2>
          <p className="mt-1 text-sm text-slate-600">
            CarbonPura Demo Project · Pacific coastal AOI placeholder · evidence-source event pins are illustrative
            project context only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={WATER_MONITOR_HREF}
            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Open Water Monitor
          </Link>
          <Link
            to={AQUASCAN_HREF}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            Open AquaScan
          </Link>
          <Link
            to={PLASTIC_WATCH_HREF}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            Open Plastic Watch
          </Link>
        </div>
      </div>

      <p className="mb-3 rounded-lg border border-teal-100 bg-teal-50/80 px-3 py-2 text-xs leading-relaxed text-teal-950">
        Map shows CarbonPura project context. Live scans run inside the linked DPAL engines.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {MONITORING_LAYERS.map((layer) => (
          <span
            key={layer}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
          >
            {layer}
          </span>
        ))}
      </div>

      {tileError ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Base map tiles failed to load. Markers and AOI placeholder may still render when tiles recover.
        </p>
      ) : null}

      <div
        className="relative h-[min(380px,50vh)] min-h-[260px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
        style={{ minHeight: 260 }}
      >
        <MapContainer
          center={[DEMO_CENTER.lat, DEMO_CENTER.lng]}
          zoom={11}
          scrollWheelZoom
          className="z-0 h-full w-full"
          style={{ height: '100%', minHeight: 260, width: '100%' }}
        >
          <TileLayer
            attribution={OSM_ATTR}
            url={OSM_TILE}
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
          <Circle
            center={[DEMO_CENTER.lat, DEMO_CENTER.lng]}
            radius={DEMO_RADIUS_KM * 1000}
            pathOptions={{ color: '#0f766e', weight: 2, fillColor: '#14b8a6', fillOpacity: 0.08 }}
          />
          <Polygon
            positions={aoiRing}
            pathOptions={{ color: '#0369a1', weight: 2, dashArray: '6 4', fillColor: '#0ea5e9', fillOpacity: 0.1 }}
          />
          <CircleMarker
            center={[DEMO_CENTER.lat, DEMO_CENTER.lng]}
            radius={11}
            pathOptions={{ color: '#047857', weight: 2, fillColor: '#10b981', fillOpacity: 1 }}
          >
            <Popup>
              <span className="text-xs font-semibold">CarbonPura Demo Project</span>
            </Popup>
          </CircleMarker>
          {EVIDENCE_MARKERS.map((m) => (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={7}
              pathOptions={{
                color: m.type === 'plasticWatch' ? '#0e7490' : m.type === 'water' ? '#0369a1' : '#b45309',
                weight: 2,
                fillColor: m.type === 'plasticWatch' ? '#2dd4bf' : m.type === 'water' ? '#7dd3fc' : '#fbbf24',
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div className="max-w-[200px] text-xs">
                  <p className="font-semibold text-slate-800">Evidence-source event</p>
                  <p className="text-slate-700">{m.label}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <dl className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-slate-800">Project location</dt>
          <dd className="mt-0.5 tabular-nums">
            {DEMO_CENTER.lat.toFixed(3)}°, {DEMO_CENTER.lng.toFixed(3)}°
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">AOI placeholder</dt>
          <dd className="mt-0.5">~{DEMO_RADIUS_KM} km screening ring + dashed boundary</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">Evidence pins</dt>
          <dd className="mt-0.5">{EVIDENCE_MARKERS.length} illustrative context markers</dd>
        </div>
      </dl>
    </section>
  );
}
