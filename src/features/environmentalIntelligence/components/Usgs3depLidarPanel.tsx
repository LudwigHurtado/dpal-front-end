import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Globe, Loader, MapPin } from '../../../../components/icons';
import {
  elevationToTerrainEvidence,
  getUsgs3depLidarContext,
  getUsgs3depStatus,
  type Usgs3depLidarContext,
  type Usgs3depProviderStatus,
  type Usgs3depTerrainEvidence,
} from '../services/usgs3depApi';

export type Usgs3depLidarPanelProps = {
  lat?: number | string;
  lng?: number | string;
  radiusKm?: number;
  aoiGeoJson?: unknown | null;
  compact?: boolean;
  onTerrainEvidence?: (evidence: Usgs3depTerrainEvidence | null) => void;
  className?: string;
};

function parseCoord(value: number | string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

type PanelStatus = 'loading' | 'connected' | 'not_configured' | 'unavailable';

function ResultCard({
  label,
  value,
  highlight,
  className = '',
}: {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${highlight ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'} ${className}`}
    >
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function Usgs3depLidarPanel({
  lat: latProp,
  lng: lngProp,
  radiusKm = 5,
  aoiGeoJson = null,
  compact = false,
  onTerrainEvidence,
  className = '',
}: Usgs3depLidarPanelProps): React.ReactElement {
  const [providerStatus, setProviderStatus] = useState<Usgs3depProviderStatus | null>(null);
  const [panelStatus, setPanelStatus] = useState<PanelStatus>('loading');
  const [latInput, setLatInput] = useState(String(latProp ?? ''));
  const [lngInput, setLngInput] = useState(String(lngProp ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<Usgs3depLidarContext | null>(null);

  useEffect(() => {
    setLatInput(String(latProp ?? ''));
    setLngInput(String(lngProp ?? ''));
  }, [latProp, lngProp]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = await getUsgs3depStatus();
      if (cancelled) return;
      setProviderStatus(status);
      if (!status) {
        setPanelStatus('unavailable');
        return;
      }
      if (!status.enabled) {
        setPanelStatus('not_configured');
        return;
      }
      setPanelStatus('connected');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel = useMemo(() => {
    switch (panelStatus) {
      case 'connected':
        return 'Connected';
      case 'not_configured':
        return 'Not configured';
      case 'unavailable':
        return 'Unavailable';
      default:
        return 'Checking…';
    }
  }, [panelStatus]);

  const statusClass = useMemo(() => {
    switch (panelStatus) {
      case 'connected':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'not_configured':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }, [panelStatus]);

  const runCheck = useCallback(async () => {
    setError(null);
    setBusy(true);
    const lat = parseCoord(latInput);
    const lng = parseCoord(lngInput);
    if (lat === null || lng === null) {
      setError('Enter valid latitude and longitude, or set project coordinates first.');
      setBusy(false);
      onTerrainEvidence?.(null);
      return;
    }

    const result = await getUsgs3depLidarContext({
      centerLat: lat,
      centerLng: lng,
      radiusKm,
      aoiGeoJson,
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setContext(null);
      onTerrainEvidence?.(null);
      return;
    }

    setContext(result);
    if (result.elevation.ok) {
      onTerrainEvidence?.(elevationToTerrainEvidence(result.elevation));
    } else {
      onTerrainEvidence?.(null);
      setError(result.elevation.message);
    }
  }, [aoiGeoJson, latInput, lngInput, onTerrainEvidence, radiusKm]);

  const elevationOk = context?.elevation.ok === true ? context.elevation : null;

  return (
    <div className={className}>
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm">
        <div className="flex items-start justify-between gap-3 p-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f]">
                <Globe className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">USGS 3DEP / Airborne LiDAR</h3>
                {!compact ? (
                  <p className="text-[11px] text-slate-500">The National Map · terrain & elevation</p>
                ) : null}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>

          {!compact ? (
            <p className="px-4 pb-2 text-xs leading-relaxed text-slate-600">
              Click the map or draw an AOI, and DPAL will attach terrain evidence to your project. No API key
              required — USGS 3DEP provides public elevation and LiDAR reference data.
            </p>
          ) : null}

          <div className={`px-4 ${compact ? 'pb-3' : 'pb-4'}`}>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">Latitude</span>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="34.0522"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">Longitude</span>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="-118.2437"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy || panelStatus === 'loading'}
              onClick={() => void runCheck()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? <Loader className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {busy ? 'Checking terrain…' : 'Check Terrain / LiDAR Context'}
            </button>
          </div>

          {error ? (
            <p className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {error}
            </p>
          ) : null}

          {context ? (
            <div className="mx-4 mb-4 space-y-2">
              {elevationOk ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <ResultCard
                    label="Elevation"
                    value={`${elevationOk.elevation.toFixed(1)} ${elevationOk.elevationUnit}`}
                  />
                  <ResultCard label="Units" value={elevationOk.units} />
                  <ResultCard
                    label="Terrain context"
                    value={elevationOk.resolutionNote}
                    className="col-span-2 sm:col-span-1"
                  />
                  <ResultCard label="LiDAR source" value="USGS 3DEP / National Map" />
                  <ResultCard label="Evidence readiness" value="Terrain context ready" highlight />
                </div>
              ) : null}

              <p className="text-[11px] leading-relaxed text-slate-500">{context.note}</p>

              <div className="flex flex-wrap gap-2">
                <a
                  href={context.lidarExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
                >
                  Open USGS Lidar Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={context.eptIndexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
                >
                  View EPT Source
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <p className="text-[10px] leading-relaxed text-slate-500">
                USGS 3DEP supports terrain and elevation context only — not a standalone legal conclusion.
                Point-cloud analysis is a second-stage workflow.
              </p>
            </div>
          ) : null}

          {providerStatus ? (
            <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
              Capabilities: {providerStatus.capabilities.slice(0, 3).join(', ')}…
            </p>
          ) : null}
      </div>
    </div>
  );
}
