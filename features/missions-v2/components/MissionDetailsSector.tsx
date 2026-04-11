import React, { useState } from 'react';
import type { MissionDetails } from '../types';
import { mw } from '../missionWorkspaceTheme';
import SectorCard from './SectorCard';

interface MissionDetailsSectorProps {
  missionType: string;
  details: MissionDetails;
  onToggleObjectiveItem: (phaseId: string, itemId: string) => void;
  onAddObjectiveItemImage: (phaseId: string, itemId: string, imageDataUrl: string) => void;
  onRewardSelection: (rewardType: 'Coins' | 'Tokens' | 'HC' | 'None', rewardAmount: number) => void;
}

const MissionDetailsSector: React.FC<MissionDetailsSectorProps> = ({
  missionType,
  details,
  onToggleObjectiveItem,
  onAddObjectiveItemImage,
  onRewardSelection,
}) => {
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const rowClass = 'grid grid-cols-[110px_1fr] items-center gap-3';
  const valueClass = `rounded-md border border-teal-900/50 bg-slate-950/70 px-3 py-2 text-sm text-teal-100/90`;
  const rewardOptions: Array<'Coins' | 'Tokens' | 'HC' | 'None'> = ['Coins', 'Tokens', 'HC', 'None'];

  const onAttachImage = async (phaseId: string, itemId: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) onAddObjectiveItemImage(phaseId, itemId, result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <SectorCard title="Mission Details">
      <div className="space-y-2 text-sm">
        <div className={rowClass}>
          <p className={mw.textLabel}>Mission Type</p>
          <div className={valueClass}>{details.missionType || missionType}</div>
        </div>
        <div className={rowClass}>
          <p className={mw.textLabel}>Objective</p>
          <div className={valueClass}>{details.objective}</div>
        </div>
        <div className={rowClass}>
          <p className={mw.textLabel}>Deadline</p>
          <div className={valueClass}>{details.deadline}</div>
        </div>
        <div className={rowClass}>
          <p className={mw.textLabel}>Rewards</p>
          <div className={`${valueClass} space-y-2`}>
            <p>{details.rewardLabel}</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={details.rewardType}
                onChange={(e) =>
                  onRewardSelection(e.target.value as 'Coins' | 'Tokens' | 'HC' | 'None', details.rewardAmount)
                }
                className="rounded border border-teal-900/55 bg-slate-950/90 px-2 py-1 text-xs text-teal-100"
              >
                {rewardOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {details.rewardType !== 'None' ? (
                <input
                  type="number"
                  min={1}
                  value={details.rewardAmount}
                  onChange={(e) => onRewardSelection(details.rewardType, Math.max(1, Number(e.target.value || 1)))}
                  className="w-28 rounded border border-teal-900/55 bg-slate-950/90 px-2 py-1 text-xs text-teal-100"
                />
              ) : (
                <span className={`text-xs ${mw.textMuted}`}>—</span>
              )}
            </div>
          </div>
        </div>

        <div className={`${mw.innerWell} p-3`}>
          <p className={`mb-2 text-xs font-semibold text-teal-200`}>Mission Type Phases (collapsible)</p>
          <div className="space-y-2">
            {details.objectivePhases.map((phase) => {
              const isOpen = openPhases[phase.id] ?? true;
              return (
                <div key={phase.id} className="rounded border border-teal-900/45 bg-teal-950/50">
                  <button
                    type="button"
                    onClick={() => setOpenPhases((prev) => ({ ...prev, [phase.id]: !isOpen }))}
                    className="flex w-full items-center justify-between px-2 py-2 text-left text-xs font-semibold text-teal-100"
                  >
                    <span>{phase.title}</span>
                    <span>{isOpen ? 'Hide' : 'Show'}</span>
                  </button>
                  {isOpen ? (
                    <div className="space-y-2 border-t border-teal-900/40 px-2 py-2">
                      {phase.items.map((item) => (
                        <div key={item.id} className="rounded border border-teal-900/40 bg-slate-950/50 p-2">
                          <label className="flex items-start gap-2 text-xs text-teal-100/90">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => onToggleObjectiveItem(phase.id, item.id)}
                              className="mt-0.5 rounded border-teal-800 bg-teal-950 text-teal-500"
                            />
                            <span>{item.label}</span>
                          </label>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => onAttachImage(phase.id, item.id, e.target.files?.[0] ?? null)}
                              className="text-[11px] text-teal-200 file:mr-2 file:rounded file:border-0 file:bg-teal-800 file:px-2 file:py-1 file:text-teal-50"
                            />
                            <span className={`text-[11px] ${mw.textMuted}`}>{item.images.length} photo(s)</span>
                          </div>
                          {item.images.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.images.slice(-3).map((img, idx) => (
                                <img
                                  key={`${item.id}-${idx}`}
                                  src={img}
                                  alt="phase proof"
                                  className="h-10 w-10 rounded border border-teal-900/50 object-cover"
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SectorCard>
  );
};

export default MissionDetailsSector;
