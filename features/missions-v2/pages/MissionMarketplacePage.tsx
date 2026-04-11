import React, { useMemo, useState } from 'react';
import { MARKETPLACE_SAMPLE_LISTINGS } from '../data/marketplaceListings';
import {
  MARKETPLACE_KIND_LABEL,
  type MarketplaceMissionKind,
  type MarketplaceListing,
} from '../marketplaceTypes';
import { mw } from '../missionWorkspaceTheme';

type FilterKey = 'all' | MarketplaceMissionKind;

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ai_generated', label: 'AI-generated' },
  { id: 'user_created', label: 'Community' },
  { id: 'org_posted', label: 'Organizations' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'local', label: 'Local' },
  { id: 'reward_backed', label: 'Rewards' },
];

function urgencyClass(u: MarketplaceListing['urgency']): string {
  if (u === 'high') return 'border-rose-500/40 bg-rose-950/40 text-rose-200';
  if (u === 'medium') return 'border-amber-500/35 bg-amber-950/30 text-amber-200';
  return 'border-teal-700/40 bg-teal-950/50 text-teal-200';
}

interface MissionMarketplacePageProps {
  onBack: () => void;
  onOpenWorkspace: () => void;
  onCreateMission: () => void;
}

const MissionMarketplacePage: React.FC<MissionMarketplacePageProps> = ({
  onBack,
  onOpenWorkspace,
  onCreateMission,
}) => {
  const [kind, setKind] = useState<FilterKey>('all');
  const [locationQ, setLocationQ] = useState('');

  const filtered = useMemo(() => {
    const q = locationQ.trim().toLowerCase();
    return MARKETPLACE_SAMPLE_LISTINGS.filter((row) => {
      if (kind !== 'all' && !row.kinds.includes(kind)) return false;
      if (q && !row.locationLabel.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [kind, locationQ]);

  return (
    <div className={`${mw.shell} pb-28`}>
      <div className="mx-auto max-w-[1100px] px-4 pt-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className={mw.btnGhost}>
            ← Back
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onOpenWorkspace} className={mw.btnPrimary}>
              Open workspace
            </button>
            <button type="button" onClick={onCreateMission} className={mw.btnGhost}>
              Create mission
            </button>
          </div>
        </div>

        <header className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400/90">DPAL Mission Marketplace</p>
          <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight text-teal-50 sm:text-4xl">
            Discover missions that matter
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-teal-200/80">
            AI-generated routes, community missions, org programs, emergencies, and reward-backed work — filter by
            type and place, then join through the same Mission Assignment V2 workspace.
          </p>
        </header>

        <div className={`${mw.sectorCard} mb-6 space-y-4`}>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const on = kind === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setKind(f.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    on
                      ? 'border-teal-400/50 bg-teal-950/90 text-teal-50 shadow-[0_0_14px_rgba(13,148,136,0.2)]'
                      : 'border-teal-900/55 bg-teal-950/45 text-teal-200/80 hover:border-teal-800'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <label className="block text-xs font-semibold text-teal-200/90">
            Local filter (city, neighborhood, zone)
            <input
              type="search"
              value={locationQ}
              onChange={(e) => setLocationQ(e.target.value)}
              placeholder="e.g. Detroit, Zone 3, Corktown…"
              className={`${mw.field} mt-1 max-w-md`}
            />
          </label>
        </div>

        <p className={`mb-4 text-xs ${mw.textMuted}`}>
          Showing {filtered.length} of {MARKETPLACE_SAMPLE_LISTINGS.length} sample listings (replace with live API).
        </p>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((m) => (
            <li
              key={m.id}
              className={`${mw.sectorCard} flex flex-col border-teal-800/50 transition hover:border-teal-600/40`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${urgencyClass(m.urgency)}`}>
                  {m.urgency} urgency
                </span>
                {m.kinds.map((k) => (
                  <span
                    key={k}
                    className="rounded border border-teal-800/60 bg-teal-950/60 px-2 py-0.5 text-[10px] text-teal-200/90"
                  >
                    {MARKETPLACE_KIND_LABEL[k]}
                  </span>
                ))}
              </div>
              <h2 className="font-mono text-lg font-bold text-teal-50">{m.title}</h2>
              <p className="mt-2 flex-1 text-sm text-teal-100/85">{m.summary}</p>
              <dl className="mt-3 space-y-1 text-xs text-teal-300/90">
                <div className="flex justify-between gap-2">
                  <dt className={mw.textMuted}>Where</dt>
                  <dd className="text-right text-teal-100">{m.locationLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className={mw.textMuted}>Posted by</dt>
                  <dd className="text-right">{m.postedByLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className={mw.textMuted}>Reward</dt>
                  <dd className="text-right">{m.rewardSummary ?? 'Volunteer / stipend TBD'}</dd>
                </div>
                {m.slotsOpen != null ? (
                  <div className="flex justify-between gap-2">
                    <dt className={mw.textMuted}>Open slots</dt>
                    <dd className="text-right">{m.slotsOpen}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-teal-900/40 pt-3">
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className={`${mw.btnPrimary} py-2 text-xs`}
                >
                  Use workspace to join
                </button>
                <span className={`self-center text-[11px] ${mw.textMuted}`}>
                  Full accept/invite flow hooks here later.
                </span>
              </div>
            </li>
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="mt-8 text-center text-sm text-teal-500">No missions match these filters.</p>
        ) : null}
      </div>
    </div>
  );
};

export default MissionMarketplacePage;
