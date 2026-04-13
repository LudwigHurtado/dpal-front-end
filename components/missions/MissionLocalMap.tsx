/**
 * MissionLocalMap — reusable Leaflet/OpenStreetMap map for mission pins.
 * Free, no API key. Uses CartoDB dark tiles + Nominatim geocoding.
 */
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MarketplaceListing } from '../../features/missions-v2/marketplaceTypes';

// ── Custom dot pins (no image assets needed) ────────────────────────────────

const makePin = (urgency: 'low' | 'medium' | 'high', selected = false) => {
  const color =
    urgency === 'high' ? '#f43f5e' : urgency === 'medium' ? '#f59e0b' : '#14b8a6';
  const size = selected ? 22 : 16;
  const ring = selected ? `box-shadow:0 0 0 4px ${color}55;` : '';
  return L.divIcon({
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.7);${ring}transition:all .2s;"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)],
    className: '',
  });
};

// ── Fly to center when it changes ────────────────────────────────────────────

const MapFlyTo: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.4 });
  }, [center, zoom, map]);
  return null;
};

// ── Nominatim geocoding (free, no key) ───────────────────────────────────────

const geocodeCache = new Map<string, [number, number]>();

export async function geocodeCity(city: string): Promise<[number, number] | null> {
  const key = city.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'DPAL-App/1.0' } },
    );
    const data = await res.json();
    if (data?.[0]) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodeCache.set(key, coords);
      return coords;
    }
  } catch {}
  return null;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface MissionPinListing extends MarketplaceListing {
  coords?: [number, number];
}

export interface MissionLocalMapProps {
  /** Missions to pin — only those with coords will appear on the map */
  listings: MissionPinListing[];
  /** Hero's city string — geocoded to center the map */
  cityQuery?: string;
  /** Tailwind height class, default h-[420px] */
  height?: string;
  /** Called when user clicks "View mission →" in a pin popup */
  onSelectListing?: (id: string) => void;
  /** Starting zoom level, default 11 */
  zoom?: number;
}

const DEFAULT_CENTER: [number, number] = [34.0522, -118.2437]; // Los Angeles fallback

// ── Component ────────────────────────────────────────────────────────────────

const MissionLocalMap: React.FC<MissionLocalMapProps> = ({
  listings,
  cityQuery,
  height = 'h-[420px]',
  onSelectListing,
  zoom = 11,
}) => {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!cityQuery?.trim()) return;
    setGeocoding(true);
    geocodeCity(cityQuery).then((coords) => {
      if (coords) setCenter(coords);
      setGeocoding(false);
    });
  }, [cityQuery]);

  const pinned = listings.filter((l) => l.coords);
  const unpinned = listings.filter((l) => !l.coords);

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-teal-300/80">
        <span>
          {geocoding ? (
            <span className="animate-pulse">Locating {cityQuery}…</span>
          ) : (
            <>
              <span className="font-semibold text-teal-100">{pinned.length}</span> missions on map
              {unpinned.length > 0 && (
                <span className="text-teal-500/70"> · {unpinned.length} remote/no location</span>
              )}
            </>
          )}
        </span>
        <span className="text-teal-600/60">© OpenStreetMap · CartoDB</span>
      </div>

      {/* Map */}
      <div
        className={`${height} w-full overflow-hidden rounded-2xl border border-teal-900/40 shadow-[0_4px_32px_rgba(0,0,0,0.5)]`}
      >
        <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
          {/* CartoDB Dark Matter — free, no API key */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapFlyTo center={center} zoom={zoom} />

          {pinned.map((m) => (
            <Marker
              key={m.id}
              position={m.coords!}
              icon={makePin(m.urgency, selectedId === m.id)}
              eventHandlers={{ click: () => setSelectedId(m.id) }}
            >
              <Popup className="mission-popup">
                <div className="min-w-[210px] space-y-1.5 font-sans">
                  {/* Urgency badge */}
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      m.urgency === 'high'
                        ? 'bg-rose-100 text-rose-700'
                        : m.urgency === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    {m.urgency} urgency
                  </span>
                  <p className="font-bold text-sm leading-tight text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{m.locationLabel}</p>
                  {m.rewardSummary && (
                    <p className="text-xs font-semibold text-teal-700">
                      Reward: {m.rewardSummary}
                    </p>
                  )}
                  {m.slotsOpen != null && (
                    <p className="text-xs text-gray-500">{m.slotsOpen} slots open</p>
                  )}
                  {onSelectListing && (
                    <button
                      onClick={() => onSelectListing(m.id)}
                      className="mt-1 block w-full rounded bg-teal-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-teal-700 transition-colors"
                    >
                      View mission →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Remote / no-coords missions list below the map */}
      {unpinned.length > 0 && (
        <div className="rounded-xl border border-teal-900/40 bg-teal-950/30 p-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-500">
            Remote / no pin location
          </p>
          {unpinned.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 text-sm text-teal-200/80"
            >
              <span className="truncate">{m.title}</span>
              {onSelectListing && (
                <button
                  onClick={() => onSelectListing(m.id)}
                  className="shrink-0 text-xs text-teal-400 hover:text-teal-200 transition-colors"
                >
                  View →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MissionLocalMap;
