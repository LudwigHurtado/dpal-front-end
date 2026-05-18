import React, { useState } from 'react';
import { LayerToggleChip } from './LayerToggleChip';
import { LiveSignalsRail, type LiveSignalItem } from './LiveSignalsRail';

const DEFAULT_LAYERS = [
  'Methane',
  'Plastic Risk',
  'Water Alerts',
  'Carbon Projects',
  'Fires',
  'Algal Blooms',
  'Industrial Facilities',
] as const;

const DEFAULT_SIGNALS: LiveSignalItem[] = [
  {
    id: 'methane-1',
    title: 'High Methane Detected',
    location: 'Permian Basin, TX, USA',
    level: 'High',
    timeLabel: '10 min ago',
    sourceLabel: 'Preview routing · Global Signals',
  },
  {
    id: 'plastic-1',
    title: 'Plastic Accumulation Hotspot',
    location: 'Gulf of Thailand',
    level: 'Medium',
    timeLabel: '25 min ago',
    sourceLabel: 'Preview routing · Plastic Watch',
  },
  {
    id: 'algal-1',
    title: 'Algal Bloom Detected',
    location: 'Lake Erie, North America',
    level: 'Medium',
    timeLabel: '1 hr ago',
    sourceLabel: 'Preview routing · Water intelligence',
  },
  {
    id: 'flood-1',
    title: 'Flash Flood Warning',
    location: 'Mississippi Basin, USA',
    level: 'High',
    timeLabel: '2 hrs ago',
    sourceLabel: 'Preview routing · Global Signals',
  },
];

export interface GlobalIntelligenceMapPreviewProps {
  /** Called when user wants to open global signals from a preview row. */
  onOpenGlobalSignals?: () => void;
  className?: string;
}

/**
 * Illustrative global map panel — clearly labeled preview; live layers wire through existing DPAL engines.
 */
export function GlobalIntelligenceMapPreview({
  onOpenGlobalSignals,
  className = '',
}: GlobalIntelligenceMapPreviewProps): React.ReactElement {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.05] ${className}`}
      aria-labelledby="global-intel-map-heading"
    >
      <div className="flex flex-col gap-1 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="global-intel-map-heading" className="text-lg font-semibold tracking-tight text-slate-900">
            Global Intelligence Map
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Operational preview — live layers connect through existing DPAL engines when operators enable them. This panel
            does not assert verified detections.
          </p>
        </div>
      </div>

      <div className="relative min-h-[320px] lg:min-h-[420px]">
        <div
          className="absolute inset-0 bg-[length:120%] bg-center"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 55% at 50% 45%, rgba(15,118,110,0.35) 0%, transparent 55%),
              linear-gradient(180deg, #0f172a 0%, #1e3a5f 45%, #0c4a6e 100%),
              url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Cpath fill='%23ffffff08' d='M0 100h400M200 0v200'/%3E%3C/svg%3E")
            `,
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/25 to-transparent" aria-hidden />

        <div className="relative z-[1] flex h-full min-h-[320px] flex-col gap-4 p-5 lg:min-h-[420px] lg:flex-row lg:items-stretch lg:gap-6 lg:p-8">
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/90">World overview</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DEFAULT_LAYERS.map((layer) => (
                <LayerToggleChip
                  key={layer}
                  label={layer}
                  active={activeLayer === layer}
                  onClick={() => setActiveLayer((prev) => (prev === layer ? null : layer))}
                />
              ))}
            </div>
            <div className="mt-auto rounded-xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-100 backdrop-blur-sm">
              <p className="font-semibold text-white">AOI &amp; layer context</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Illustrative grid — project AOIs, evidence pins, and module overlays render inside each live engine (Water
                Monitor, AquaScan, Plastic Watch, Carbon DMRV, Forest Integrity, Air, Hazardous Waste).
              </p>
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-[min(100%,320px)]">
            <LiveSignalsRail
              signals={DEFAULT_SIGNALS}
              onViewSignal={() => {
                onOpenGlobalSignals?.();
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
