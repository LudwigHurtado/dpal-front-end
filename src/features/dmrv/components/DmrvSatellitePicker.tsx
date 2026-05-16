import React, { useEffect, useMemo, useState } from 'react';
import {
  collectTechnologiesForIds,
  DMRV_SATELLITE_MISSIONS,
  getMissionsForIds,
  parseSelectedSatelliteIds,
  toggleSatelliteSelection,
} from '../dmrvSatelliteCatalog';
import { getTechnologyEntry, hasTechnologyGlossaryEntry, type DmrvTechnologyEntry } from '../dmrvTechnologyGlossary';

type DmrvSatellitePickerProps = {
  selectedRaw: unknown;
  onChange: (serializedIds: string) => void;
};

function MissionImage({ src, alt, missionId }: { src: string; alt: string; missionId: string }): React.ReactElement {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#e8f0f7] to-slate-100 px-3 text-center">
        <span className="text-[10px] font-black uppercase tracking-wide text-[#1e3a5f]">Image unavailable</span>
        <span className="text-[9px] text-slate-500">{missionId}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="mx-auto h-full max-h-[140px] w-full object-contain object-center p-2"
      onError={() => setFailed(true)}
    />
  );
}

export function DmrvSatellitePicker({ selectedRaw, onChange }: DmrvSatellitePickerProps): React.ReactElement {
  const selectedIds = useMemo(() => parseSelectedSatelliteIds(selectedRaw), [selectedRaw]);
  const technologies = useMemo(() => collectTechnologiesForIds(selectedIds), [selectedIds]);
  const selectedNames = useMemo(
    () => getMissionsForIds(selectedIds).map((m) => m.name).join(', '),
    [selectedIds],
  );
  const [activeTech, setActiveTech] = useState<string | null>(null);

  useEffect(() => {
    if (activeTech && !technologies.includes(activeTech)) {
      setActiveTech(null);
    }
  }, [activeTech, technologies]);

  const activeEntry = activeTech ? getTechnologyEntry(activeTech) : null;

  const handleToggle = (missionId: string, checked: boolean) => {
    const next = toggleSatelliteSelection(selectedIds, missionId, checked);
    onChange(next.join(','));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#1e3a5f]/15 bg-gradient-to-br from-[#e8f0f7] to-white px-4 py-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">Satellite stack</p>
        <p className="mt-1 text-sm text-slate-700">
          Pick one or more missions for this MRV project. Each card shows the spacecraft used for that data source.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {selectedIds.length === 0
            ? 'No satellite selected yet — choose at least one for screening.'
            : `${selectedIds.length} selected: ${selectedNames}`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DMRV_SATELLITE_MISSIONS.map((mission) => {
          const checked = selectedIds.includes(mission.id);
          return (
            <label
              key={mission.id}
              className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                checked
                  ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/25'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="relative border-b border-slate-100 bg-white">
                <div className="flex min-h-[132px] items-center justify-center bg-gradient-to-b from-slate-50 to-white">
                  <MissionImage
                    src={mission.imageUrl}
                    alt={`${mission.name} spacecraft`}
                    missionId={mission.id}
                  />
                </div>
                <div className="absolute right-2 top-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleToggle(mission.id, e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 bg-white text-[#1e3a5f] shadow-md"
                    aria-label={`Select ${mission.name}`}
                  />
                </div>
              </div>

              <div className="border-b border-slate-100 bg-[#1e3a5f] px-3 py-2 text-white">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black leading-tight">{mission.name}</p>
                    <p className="text-[10px] font-medium text-white/85">{mission.tagline}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide">
                    {mission.agency}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="text-xs leading-relaxed text-slate-700">{mission.description}</p>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">Typical MRV uses</p>
                  <ul className="mt-1 space-y-0.5">
                    {mission.mrvUses.slice(0, 3).map((use) => (
                      <li key={use} className="flex items-start gap-1 text-[10px] text-slate-600">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#1e3a5f]" aria-hidden />
                        {use}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-auto text-[10px] text-slate-500">
                  Revisit: {mission.revisit} · Resolution: {mission.resolution}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">
          Technologies in your stack
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Instruments and product families from your selected satellites — click any tag to learn what it does and how
          DPAL uses it in screening and evidence workflows.
        </p>
        {technologies.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
            Select a satellite above to see its sensors and data products here.
          </p>
        ) : (
          <>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Technologies in your stack">
              {technologies.map((tech) => {
                const selected = activeTech === tech;
                const detailId = `dmrv-tech-detail-${tech.replace(/\s+/g, '-')}`;
                return (
                  <li key={tech}>
                    <button
                      type="button"
                      aria-expanded={selected}
                      aria-controls={selected ? detailId : undefined}
                      onClick={() => setActiveTech((prev) => (prev === tech ? null : tech))}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/40 ${
                        selected
                          ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                          : 'border-[#1e3a5f]/20 bg-white text-[#1e3a5f] hover:border-[#1e3a5f]/50 hover:bg-[#e8f0f7]'
                      }`}
                    >
                      {tech}
                    </button>
                  </li>
                );
              })}
            </ul>

            {activeTech && activeEntry ? (
              <TechDetailPanel tech={activeTech} entry={activeEntry} onClose={() => setActiveTech(null)} />
            ) : (
              <p className="mt-3 text-[11px] text-slate-500">
                Tip: select a tag above to open a short guide for that instrument or API.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function TechDetailPanel({
  tech,
  entry,
  onClose,
}: {
  tech: string;
  entry: DmrvTechnologyEntry;
  onClose: () => void;
}): React.ReactElement {
  const hasGlossary = hasTechnologyGlossaryEntry(tech);

  return (
    <div
      className="mt-3 rounded-xl border border-[#1e3a5f]/20 bg-white p-4 shadow-sm"
      id={`dmrv-tech-detail-${tech.replace(/\s+/g, '-')}`}
      role="region"
      aria-labelledby={`dmrv-tech-title-${tech.replace(/\s+/g, '-')}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Technology guide</p>
          <h4 id={`dmrv-tech-title-${tech.replace(/\s+/g, '-')}`} className="text-base font-black text-[#1e3a5f]">
            {tech}
          </h4>
          {!hasGlossary ? (
            <p className="mt-1 text-[11px] text-amber-700">
              General guide — add a dedicated glossary entry for richer copy.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          aria-label="Close technology guide"
        >
          Close
        </button>
      </div>
      <div className="mt-3 space-y-3 text-sm text-slate-700">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">What it is</p>
          <p className="mt-1 leading-relaxed">{entry.summary}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-[#1e3a5f]">How DPAL uses it</p>
          <p className="mt-1 leading-relaxed">{entry.inDpal}</p>
        </div>
      </div>
    </div>
  );
}
