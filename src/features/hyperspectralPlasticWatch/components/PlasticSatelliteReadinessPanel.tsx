import React from 'react';
import type { HyperspectralPlasticProviderStatusResponse, HyperspectralPlasticScanResponse } from '../types';
import { getPlasticMissionType, type PlasticMissionTypeId } from '../data/plasticMissionTypes';

type ReadinessTone = 'pending' | 'ready' | 'unavailable' | 'needs_provider';

type Card = { label: string; value: string; tone: ReadinessTone };

function toneClass(tone: ReadinessTone): string {
  if (tone === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (tone === 'unavailable') return 'border-slate-200 bg-slate-50 text-slate-600';
  if (tone === 'needs_provider') return 'border-amber-200 bg-amber-50 text-amber-950';
  return 'border-sky-200 bg-sky-50 text-sky-900';
}

type Props = {
  missionTypeId: PlasticMissionTypeId;
  canRunScan: boolean;
  hasSavedPolygon: boolean;
  baselineDay: string;
  currentDay: string;
  providerStatus: HyperspectralPlasticProviderStatusResponse | null;
  providerStatusError: string | null;
  lastScan: HyperspectralPlasticScanResponse | null;
};

export function PlasticSatelliteReadinessPanel({
  missionTypeId,
  canRunScan,
  hasSavedPolygon,
  baselineDay,
  currentDay,
  providerStatus,
  providerStatusError,
  lastScan,
}: Props): React.ReactElement {
  const mission = getPlasticMissionType(missionTypeId);

  const cards: Card[] = [
    {
      label: 'AOI',
      value: hasSavedPolygon
        ? 'Polygon saved'
        : canRunScan
          ? 'Circle AOI — ready'
          : 'Set map center or polygon',
      tone: canRunScan ? 'ready' : 'needs_provider',
    },
    {
      label: 'Satellite Coverage',
      value: lastScan
        ? `PACE ${lastScan.providers.pace.status} · EMIT ${lastScan.providers.emit.status}`
        : providerStatusError
          ? 'Unavailable'
          : providerStatus
            ? 'Pending scan'
            : 'Loading…',
      tone: lastScan?.providers.pace.status === 'available' || lastScan?.providers.emit.status === 'available'
        ? 'ready'
        : providerStatusError
          ? 'unavailable'
          : 'pending',
    },
    {
      label: 'Cloud / Glare Screening',
      value: lastScan
        ? String(lastScan.spectralSignals.waterConfounders.cloudsGlint)
        : 'Pending / Needs provider',
      tone: lastScan ? 'ready' : 'needs_provider',
    },
    {
      label: 'Water Surface Conditions',
      value: lastScan
        ? `turbidity ${lastScan.spectralSignals.waterConfounders.turbidity} · algae ${lastScan.spectralSignals.waterConfounders.algae}`
        : 'Pending',
      tone: lastScan ? 'ready' : 'pending',
    },
    {
      label: 'Date Range',
      value: baselineDay && currentDay ? `${baselineDay} → ${currentDay}` : 'Required',
      tone: baselineDay && currentDay ? 'ready' : 'needs_provider',
    },
    {
      label: 'Scan Quality',
      value: lastScan
        ? lastScan.plasticRisk.score != null
          ? lastScan.plasticRisk.score >= 70
            ? 'High candidate confidence'
            : lastScan.plasticRisk.score >= 40
              ? 'Medium confidence'
              : 'Low confidence'
          : 'Pending index extraction'
        : 'Pending',
      tone: lastScan ? (lastScan.plasticRisk.score == null ? 'needs_provider' : 'ready') : 'pending',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">3. Satellite readiness</h2>
      <p className="mt-1 text-[11px] text-slate-600">
        Review coverage and quality before running the plastic intelligence scan.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <ReadinessCard key={card.label} card={card} />
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
        <p className="text-[10px] font-semibold text-sky-900">Selected sources for {mission.title}</p>
        <ul className="mt-1.5 space-y-0.5 text-[10px] text-slate-700">
          {mission.recommendedStack.map((line) => (
            <li key={line}>• {line}</li>
          ))}
          <li>• Field validation (required before final claims)</li>
        </ul>
      </div>
    </div>
  );
}

function ReadinessCard({ card }: { card: Card }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass(card.tone)}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
      <p className="mt-0.5 text-xs font-medium">{card.value}</p>
    </div>
  );
}
