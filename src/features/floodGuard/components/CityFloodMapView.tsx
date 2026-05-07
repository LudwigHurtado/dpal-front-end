import React, { useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  FloodAlert,
  FloodCity,
  FloodPublicMarker,
  FloodRiskScore,
  FloodZone,
} from '../floodGuardTypes';
import { ALERT_LEVEL_COLORS, RISK_CATEGORY_COLORS } from './floodGuardUi';

interface CityFloodMapViewProps {
  city: FloodCity;
  zones: FloodZone[];
  alerts: FloodAlert[];
  scoresByZone: Record<string, FloodRiskScore>;
  publicMarkers?: FloodPublicMarker[];
  selectedZoneId?: string | null;
  onSelectZone?: (zoneId: string) => void;
  height?: number;
  showPublicMarkers?: boolean;
}

const PUBLIC_MARKER_STYLES: Record<string, { color: string; emoji: string }> = {
  shelter: { color: '#10b981', emoji: 'S' },
  blocked_road: { color: '#ef4444', emoji: 'X' },
  safe_route: { color: '#22d3ee', emoji: '>' },
  help_point: { color: '#a855f7', emoji: 'H' },
  citizen_report: { color: '#facc15', emoji: '!' },
  danger_zone: { color: '#fb923c', emoji: '!' },
};

function buildPublicMarkerIcon(kind: string): L.DivIcon {
  const style = PUBLIC_MARKER_STYLES[kind] ?? PUBLIC_MARKER_STYLES.citizen_report;
  return L.divIcon({
    className: 'flood-public-marker',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${style.color};color:#0b1019;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #0b1019;box-shadow:0 0 0 1px ${style.color};">${style.emoji}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const CityFloodMapView: React.FC<CityFloodMapViewProps> = ({
  city,
  zones,
  alerts,
  scoresByZone,
  publicMarkers = [],
  selectedZoneId,
  onSelectZone,
  height = 480,
  showPublicMarkers = false,
}) => {
  const center = useMemo<[number, number]>(() => [city.centerLat, city.centerLng], [city]);

  const alertsByZone = useMemo(() => {
    const map: Record<string, FloodAlert | undefined> = {};
    for (const alert of alerts) map[alert.zoneId] = alert;
    return map;
  }, [alerts]);

  return (
    <div
      className="rounded-2xl overflow-hidden border dpal-border-subtle relative"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={city.defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="Tiles &copy; Esri — Source: Esri, USGS, NOAA"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          opacity={0.85}
        />

        {zones.map((zone) => {
          const score = scoresByZone[zone.zoneId];
          const alert = alertsByZone[zone.zoneId];
          const palette = alert
            ? ALERT_LEVEL_COLORS[alert.level]
            : { fg: RISK_CATEGORY_COLORS[zone.riskCategory], bg: 'rgba(255,255,255,0.05)', border: RISK_CATEGORY_COLORS[zone.riskCategory], label: zone.riskCategory };
          const isSelected = selectedZoneId === zone.zoneId;

          return (
            <React.Fragment key={zone.zoneId}>
              <Polygon
                positions={zone.polygon.map(([lng, lat]) => [lat, lng] as [number, number])}
                pathOptions={{
                  color: palette.fg,
                  fillColor: palette.fg,
                  fillOpacity: isSelected ? 0.35 : 0.18,
                  weight: isSelected ? 3 : 1.5,
                  opacity: 0.85,
                }}
                eventHandlers={{
                  click: () => onSelectZone?.(zone.zoneId),
                }}
              >
                <Popup>
                  <div style={{ minWidth: 220, color: '#0b1019' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{zone.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{zone.zoneId}</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      Risk category: <strong>{zone.riskCategory}</strong>
                    </div>
                    {score && (
                      <div style={{ fontSize: 12 }}>
                        Live score: <strong>{score.score}</strong> · {score.alertLabel}
                      </div>
                    )}
                    {alert && (
                      <div style={{ fontSize: 12, marginTop: 4, color: palette.fg, fontWeight: 600 }}>
                        Active alert ({alert.lifecycle.replace(/_/g, ' ')})
                      </div>
                    )}
                  </div>
                </Popup>
              </Polygon>

              <CircleMarker
                center={[zone.center.lat, zone.center.lng]}
                radius={isSelected ? 10 : 7}
                pathOptions={{
                  color: palette.fg,
                  fillColor: palette.fg,
                  fillOpacity: 0.95,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => onSelectZone?.(zone.zoneId),
                }}
              />
            </React.Fragment>
          );
        })}

        {showPublicMarkers && publicMarkers.map((marker) => (
          <Marker
            key={marker.markerId}
            position={[marker.location.lat, marker.location.lng]}
            icon={buildPublicMarkerIcon(marker.kind)}
          >
            <Popup>
              <div style={{ minWidth: 220, color: '#0b1019' }}>
                <div style={{ fontWeight: 700 }}>{marker.label}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{marker.description}</div>
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6 }}>
                  Kind: {marker.kind.replace(/_/g, ' ')}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default CityFloodMapView;
