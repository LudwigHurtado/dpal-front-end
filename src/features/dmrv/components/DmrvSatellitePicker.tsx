import React, { useMemo, useState } from 'react';
import {
  collectTechnologiesForIds,
  DMRV_SATELLITE_MISSIONS,
  getMissionsForIds,
  parseSelectedSatelliteIds,
  toggleSatelliteSelection,
} from '../dmrvSatelliteCatalog';

type DmrvSatellitePickerProps = {
  selectedRaw: unknown;
  onChange: (serializedIds: string) => void;
};

function MissionImage({ src, alt }: { src: string; alt: string }): React.ReactElement {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-slate-700 text-[10px] font-bold uppercase tracking-wide text-white/90"
        aria-hidden
      >
        Earth obs
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
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

  const handleToggle = (missionId: string, checked: boolean) => {
    const next = toggleSatelliteSelection(selectedIds, missionId, checked);
    onChange(next.join(','));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#1e3a5f]/15 bg-gradient-to-br from-[#e8f0f7] to-white px-4 py-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">Satellite stack</p>
        <p className="mt-1 text-sm text-slate-700">
          Pick one or more missions for this MRV project. Selections are saved with your configuration and listed in
          evidence packets for reviewers.
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
              <div className="relative h-28 overflow-hidden bg-slate-100">
                <MissionImage src={mission.imageUrl} alt={`${mission.name} spacecraft`} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/20 to-transparent" />
                <div className="absolute left-2 top-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleToggle(mission.id, e.target.checked)}
                    className="h-4 w-4 rounded border-white/80 bg-white/95 text-[#1e3a5f] shadow"
                    aria-label={`Select ${mission.name}`}
                  />
                  <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1e3a5f]">
                    {mission.agency}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-sm font-black text-white drop-shadow">{mission.name}</p>
                  <p className="text-[10px] font-medium text-white/90">{mission.tagline}</p>
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
          Instruments and product families from your selected satellites — use these when documenting adapters and
          validation rules.
        </p>
        {technologies.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
            Select a satellite above to see its sensors and data products here.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {technologies.map((tech) => (
              <li
                key={tech}
                className="rounded-full border border-[#1e3a5f]/20 bg-white px-3 py-1 text-xs font-semibold text-[#1e3a5f] shadow-sm"
              >
                {tech}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
