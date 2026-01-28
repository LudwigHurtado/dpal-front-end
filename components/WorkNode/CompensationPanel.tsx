import React, { useMemo } from 'react';
import { type WorkPhase, type AiDirective } from '../../types';
import { Coins, Award, Sparkles, CheckCircle } from '../icons';

interface CompensationPanelProps {
  directive: AiDirective;
  phases: WorkPhase[];
}

const CompensationPanel: React.FC<CompensationPanelProps> = ({ directive, phases }) => {
  const compensationData = useMemo(() => {
    const totalHc = phases.reduce((sum, phase) => sum + phase.compensation.hc, 0);
    const totalXp = phases.reduce((sum, phase) => sum + phase.compensation.xp, 0);
    const earnedHc = phases
      .filter((p) => p.isComplete)
      .reduce((sum, phase) => sum + phase.compensation.hc, 0);
    const earnedXp = phases
      .filter((p) => p.isComplete)
      .reduce((sum, phase) => sum + phase.compensation.xp, 0);
    const pendingHc = totalHc - earnedHc;
    const pendingXp = totalXp - earnedXp;
    const completionPercent =
      phases.length > 0
        ? (phases.filter((p) => p.isComplete).length / phases.length) * 100
        : 0;

    return {
      totalHc,
      totalXp,
      earnedHc,
      earnedXp,
      pendingHc,
      pendingXp,
      completionPercent,
    };
  }, [phases]);

  const getPhaseTypeColor = (phaseType: string) => {
    const colors: Record<string, string> = {
      RECON: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      EXECUTION: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      VERIFICATION: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      COMPLETION: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    };
    return colors[phaseType] || 'text-zinc-400 border-zinc-800 bg-zinc-950';
  };

  return (
    <div className="space-y-6">
      {/* Total Compensation Summary */}
      <div className="bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Total Compensation</span>
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[8px] font-black text-emerald-500 uppercase">
              {Math.round(compensationData.completionPercent)}% Complete
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/60 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-[8px] font-black text-zinc-600 uppercase">Hero Credits</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-white leading-none">
                {compensationData.totalHc}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-black">
                  +{compensationData.earnedHc}
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-600">{compensationData.pendingHc} pending</span>
              </div>
            </div>
          </div>

          <div className="bg-black/60 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-cyan-500" />
              <span className="text-[8px] font-black text-zinc-600 uppercase">Experience</span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-white leading-none">
                {compensationData.totalXp}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-black">
                  +{compensationData.earnedXp}
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-600">{compensationData.pendingXp} pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[8px] font-black text-zinc-600 uppercase">
            <span>Progress</span>
            <span>{Math.round(compensationData.completionPercent)}%</span>
          </div>
          <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${compensationData.completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Per-Phase Breakdown */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest">
          Phase Breakdown
        </h3>
        <div className="space-y-2">
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className={`p-4 rounded-xl border-2 transition-all ${getPhaseTypeColor(
                phase.phaseType
              )}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {phase.phaseType}
                    </span>
                    {phase.isComplete && (
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                    )}
                  </div>
                  <h4 className="text-xs font-black text-white uppercase truncate">
                    {phase.name}
                  </h4>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Coins className="w-3 h-3" />
                    <span className="text-sm font-black">{phase.compensation.hc}</span>
                  </div>
                  <div className="flex items-center gap-1 text-cyan-500 mt-1">
                    <Award className="w-3 h-3" />
                    <span className="text-xs font-black">{phase.compensation.xp}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[8px] text-zinc-600">
                <span>
                  {phase.steps.filter((s) => s.isComplete).length} / {phase.steps.length} steps
                </span>
                <span>{phase.estimatedDuration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bonus Information */}
      {directive.difficulty === 'Elite' && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-[9px] font-black text-amber-400 uppercase">
              Elite Difficulty Bonus
            </span>
          </div>
          <p className="text-[8px] text-zinc-400 font-bold">
            Completing all phases may unlock additional rewards and recognition.
          </p>
        </div>
      )}
    </div>
  );
};

export default CompensationPanel;
