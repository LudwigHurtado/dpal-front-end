import React from 'react';
import { PLASTIC_MISSION_TYPES, type PlasticMissionTypeId } from '../data/plasticMissionTypes';

type Props = {
  selectedId: PlasticMissionTypeId;
  onSelect: (id: PlasticMissionTypeId) => void;
};

export function PlasticMissionSelector({ selectedId, onSelect }: Props): React.ReactElement {
  const selected = PLASTIC_MISSION_TYPES.find((m) => m.id === selectedId) ?? PLASTIC_MISSION_TYPES[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">1. Mission type</h2>
      <p className="mt-1 text-[11px] text-slate-600">Choose the plastic investigation profile for this scan.</p>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {PLASTIC_MISSION_TYPES.map((mission) => {
          const active = mission.id === selectedId;
          return (
            <button
              key={mission.id}
              type="button"
              onClick={() => onSelect(mission.id)}
              className={`rounded-lg border px-3 py-2.5 text-left transition ${
                active
                  ? 'border-sky-600 bg-sky-50 ring-1 ring-sky-200'
                  : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40'
              }`}
            >
              <p className="text-xs font-semibold text-slate-900">{mission.title}</p>
              <p className="mt-0.5 text-[10px] text-slate-600">{mission.shortDescription}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-900">Recommended stack</p>
        <ul className="mt-2 space-y-1 text-[10px] leading-snug text-slate-700">
          {selected.recommendedStack.map((line) => (
            <li key={line} className="flex gap-1.5">
              <span className="text-sky-600">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
