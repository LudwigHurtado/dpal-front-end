import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MissionMarketplaceBrowse from '../components/MissionMarketplaceBrowse';
import MissionLocalMap from '../../../components/missions/MissionLocalMap';
import { MARKETPLACE_SAMPLE_LISTINGS } from '../data/marketplaceListings';
import { mw } from '../missionWorkspaceTheme';
import {
  DEFAULT_MISSIONS_HUB_SECTION,
  MISSIONS_HUB_SECTIONS,
  type MissionsHubSection,
  parseMissionsHubSection,
} from './missionsHubSections';

const SECTION_PARAM = 'section';

interface MissionsHubPageProps {
  onBack: () => void;
  onOpenWorkspace: () => void;
  onCreateMission: () => void;
  onOpenListing: (listingId: string) => void;
  heroLocation?: string;
}

const MissionsHubPage: React.FC<MissionsHubPageProps> = ({
  onBack,
  onOpenWorkspace,
  onCreateMission,
  onOpenListing,
  heroLocation,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const section = useMemo(
    () => parseMissionsHubSection(searchParams.get(SECTION_PARAM)),
    [searchParams],
  );

  const setSection = useCallback(
    (next: MissionsHubSection) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === DEFAULT_MISSIONS_HUB_SECTION) p.delete(SECTION_PARAM);
          else p.set(SECTION_PARAM, next);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <div className={`${mw.shell} min-h-full pb-28`}>
      <div className="mx-auto max-w-[1220px] px-4 pt-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-teal-900/40 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400/90">DPAL Missions Hub</p>
            <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight text-teal-50 sm:text-3xl">
              Mission operating center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-teal-200/75">
              Discovery, creation, and dashboards live here. Assignment, routing, and validators stay in{' '}
              <span className="font-semibold text-teal-100">Mission Assignment V2</span> — open the workspace when you
              are ready to execute.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBack} className={mw.btnGhost}>
              ← Back
            </button>
            <button type="button" onClick={onOpenWorkspace} className={mw.btnPrimary}>
              Open workspace (V2)
            </button>
            <button type="button" onClick={onCreateMission} className={mw.btnGhost}>
              Create mission
            </button>
          </div>
        </div>

        <nav
          className="mb-6 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Missions Hub sections"
        >
          {MISSIONS_HUB_SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`flex shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-teal-400/45 bg-teal-900/40 text-teal-50 shadow-[0_0_12px_rgba(13,148,136,0.15)]'
                    : 'border-teal-900/55 bg-teal-950/50 text-teal-300/90 hover:border-teal-800/70 hover:text-teal-100'
                }`}
                title={s.stub ? `${s.label} (shell — API next)` : s.label}
              >
                <span className="whitespace-nowrap">{s.short}</span>
                {s.stub ? (
                  <span className="ml-1 rounded bg-teal-950/80 px-1 text-[9px] font-normal text-teal-500">soon</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="min-h-[320px]">
          {section === 'home' ? (
            <HubHomePanel
              onGoMarketplace={() => setSection('marketplace')}
              onGoEmergency={() => setSection('emergency')}
              onGoMyMissions={() => setSection('myMissions')}
              onGoRewards={() => setSection('rewards')}
              onGoLocal={() => setSection('local')}
              onOpenWorkspace={onOpenWorkspace}
              onCreateMission={onCreateMission}
            />
          ) : null}

          {section === 'marketplace' ? (
            <MissionMarketplaceBrowse
              embedded
              onOpenWorkspace={onOpenWorkspace}
              onCreateMission={onCreateMission}
              onOpenListing={onOpenListing}
            />
          ) : null}

          {section === 'emergency' ? (
            <HubStubPanel
              title="Emergency mission board"
              body="Urgent deliveries, hazard verification, medicine drops, and same-day response — surfaced here with stricter trust controls. Wire to API + V2 routing when backend is ready."
            />
          ) : null}

          {section === 'myMissions' ? (
            <HubStubPanel
              title="My missions"
              body="Joined, created, saved, proof pending, streaks, and deadlines — your personal mission center. Connects to Hero progress and rewards when data is available."
            />
          ) : null}

          {section === 'rewards' ? (
            <HubStubPanel
              title="Mission rewards center"
              body="Credits, hero points, badges, sponsor rewards, and future token eligibility — one place to see mission-linked payouts."
            />
          ) : null}

          {section === 'local' ? (
            <LocalMapPanel
              onOpenListing={onOpenListing}
              heroLocation={heroLocation}
            />
          ) : null}

          {section === 'org' ? (
            <HubStubPanel
              title="Organization missions"
              body="Schools, nonprofits, HOAs, clinics — official postings, team caps, and funded rewards. Requires org dashboard + auth."
            />
          ) : null}

          {section === 'validator' ? (
            <HubStubPanel
              title="Validator mission review"
              body="Approve flagged missions, review proof, merge duplicates, convert reports to missions — validator queue hooks to V2 handoff."
            />
          ) : null}

          {section === 'analytics' ? (
            <HubStubPanel
              title="Mission analytics"
              body="Completion rates, emergency response time, hot zones, proof approval — org and admin visibility."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

const HubHomePanel: React.FC<{
  onGoMarketplace: () => void;
  onGoEmergency: () => void;
  onGoMyMissions: () => void;
  onGoRewards: () => void;
  onGoLocal: () => void;
  onOpenWorkspace: () => void;
  onCreateMission: () => void;
}> = ({
  onGoMarketplace,
  onGoEmergency,
  onGoMyMissions,
  onGoRewards,
  onGoLocal,
  onOpenWorkspace,
  onCreateMission,
}) => (
  <div className="space-y-6">
    <div className={`${mw.sectorCard} grid gap-4 p-4 md:grid-cols-3`}>
      <QuickCard
        title="Browse marketplace"
        hint="Filter by source, place, urgency"
        onClick={onGoMarketplace}
      />
      <QuickCard title="Emergency board" hint="Urgent & high-trust" onClick={onGoEmergency} />
      <QuickCard title="My missions" hint="Joined & created" onClick={onGoMyMissions} />
      <QuickCard title="Rewards" hint="Hero & sponsor payouts" onClick={onGoRewards} />
      <QuickCard title="Local map" hint="Near me & zones" onClick={onGoLocal} />
      <QuickCard title="Open workspace" hint="Mission Assignment V2 engine" onClick={onOpenWorkspace} accent />
    </div>
    <div className={`${mw.innerWell} p-4 text-sm text-teal-200/85`}>
      <p className="font-semibold text-teal-100">How this fits together</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
        <li>
          <strong className="text-teal-100">Missions Hub</strong> is the front door: discovery, creation entry points,
          dashboards, and future org/validator tools.
        </li>
        <li>
          <strong className="text-teal-100">Mission Assignment V2</strong> stays the engine for assignment, workflow, and
          report linkage — open it from “Open workspace” or after you create a mission.
        </li>
      </ul>
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={mw.btnPrimary} onClick={onCreateMission}>
        Start Create Your Own Mission
      </button>
      <button type="button" className={mw.btnGhost} onClick={onGoMarketplace}>
        Jump to browse
      </button>
    </div>
  </div>
);

const QuickCard: React.FC<{
  title: string;
  hint: string;
  onClick: () => void;
  accent?: boolean;
}> = ({ title, hint, onClick, accent }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-xl border p-4 text-left transition ${
      accent
        ? 'border-teal-500/40 bg-teal-900/30 hover:border-teal-400/50'
        : 'border-teal-800/50 bg-teal-950/50 hover:border-teal-600/40'
    }`}
  >
    <p className="font-mono text-sm font-bold text-teal-50">{title}</p>
    <p className={`mt-1 text-xs ${mw.textMuted}`}>{hint}</p>
  </button>
);

const LocalMapPanel: React.FC<{
  onOpenListing: (id: string) => void;
  heroLocation?: string;
}> = ({ onOpenListing, heroLocation }) => {
  const [locationInput, setLocationInput] = useState(heroLocation || '');
  const [activeCity, setActiveCity] = useState(heroLocation || '');
  const [kindFilter, setKindFilter] = useState<'all' | 'local' | 'emergency'>('all');

  const filtered = MARKETPLACE_SAMPLE_LISTINGS.filter((l) => {
    if (kindFilter === 'local') return l.kinds.includes('local');
    if (kindFilter === 'emergency') return l.kinds.includes('emergency');
    return true;
  });

  return (
    <div className="space-y-5">
      <div className={`${mw.sectorCard} space-y-4 p-4`}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-400/90">
            Local Missions Map
          </p>
          <p className="mt-1 text-sm text-teal-200/75">
            Missions near you — powered by OpenStreetMap. Enter your city or neighborhood to center the map.
          </p>
        </div>

        {/* City input + filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-teal-200/80 mb-1">
              Your city or neighborhood
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setActiveCity(locationInput)}
                placeholder="e.g. Los Angeles, CA"
                className={`${mw.field} flex-1`}
              />
              <button
                type="button"
                onClick={() => setActiveCity(locationInput)}
                className={mw.btnPrimary}
              >
                Go
              </button>
            </div>
          </div>

          <div className="flex gap-1.5">
            {(['all', 'local', 'emergency'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  kindFilter === k
                    ? 'border-teal-400/50 bg-teal-900/60 text-teal-50'
                    : 'border-teal-900/55 bg-teal-950/45 text-teal-300/80 hover:border-teal-700'
                }`}
              >
                {k === 'all' ? 'All' : k === 'local' ? 'Local' : 'Emergency'}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-teal-300/70">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-rose-500" /> High urgency
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-500" /> Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-teal-500" /> Low
          </span>
        </div>
      </div>

      {/* The map */}
      <MissionLocalMap
        listings={filtered}
        cityQuery={activeCity}
        height="h-[480px]"
        onSelectListing={onOpenListing}
      />
    </div>
  );
};

const HubStubPanel: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className={`${mw.sectorCard} max-w-3xl space-y-3`}>
    <h2 className="font-mono text-lg font-bold text-teal-50">{title}</h2>
    <p className="text-sm leading-relaxed text-teal-200/85">{body}</p>
    <p className={`text-xs ${mw.textMuted}`}>
      This panel is a shell for layout and navigation. Hook APIs, permissions, and V2 handoff in phased builds without
      changing the assignment engine.
    </p>
  </div>
);

export default MissionsHubPage;
