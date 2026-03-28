import React from 'react';
import type { CategoryDefinition } from '../../../types/categoryGateway';
import type { WorkMission } from '../../../types/categoryGateway';

export type WorkMissionBoardViewProps = {
  definition: CategoryDefinition;
  accent: string;
  onOpenMissionIntel: () => void;
};

const SAMPLE: WorkMission[] = [
  {
    id: 'wm-verify-1',
    categoryId: 'sample',
    title: 'Verify a recent report',
    description: 'Cross-check details and confirm location for a peer filing.',
    missionType: 'verify',
    rewardCoins: 25,
    rewardXp: 10,
    difficulty: 2,
    requirements: ['Photo or note', 'Location confirmation'],
    status: 'open',
  },
  {
    id: 'wm-collect-1',
    categoryId: 'sample',
    title: 'Upload missing evidence',
    description: 'Add documentation that strengthens an open case.',
    missionType: 'collect',
    rewardCoins: 40,
    difficulty: 3,
    requirements: ['One attachment', 'Timestamp'],
    status: 'open',
  },
  {
    id: 'wm-classify-1',
    categoryId: 'sample',
    title: 'Classify issue severity',
    description: 'Triage backlog items for routing.',
    missionType: 'classify',
    rewardCoins: 15,
    difficulty: 1,
    requirements: ['Complete rubric'],
    status: 'open',
  },
];

const WorkMissionBoardView: React.FC<WorkMissionBoardViewProps> = ({ definition, accent, onOpenMissionIntel }) => {
  const intro = definition.modes.work?.intro;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Work</h2>
        <p className="mt-2 text-slate-600">{intro}</p>
        <p className="mt-4 text-xs text-slate-500">
          Coins are granted after completion and verification — not on click.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {SAMPLE.map((m) => (
          <article
            key={m.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h3 className="font-bold text-slate-900">{m.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{m.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>Difficulty {m.difficulty}/5</span>
                <span style={{ color: accent }}>+{m.rewardCoins} HC</span>
                <span>{m.missionType}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenMissionIntel}
              className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              Open in mission board
            </button>
          </article>
        ))}
      </div>
    </div>
  );
};

export default WorkMissionBoardView;
