import React from 'react';
import { type WorkPhase } from '../../types';
import { CheckCircle, Clock, Lock } from '../icons';

interface PhaseStepperProps {
  phases: WorkPhase[];
  currentPhaseIndex: number;
  onPhaseClick?: (phaseIndex: number) => void;
}

const PhaseStepper: React.FC<PhaseStepperProps> = ({ phases, currentPhaseIndex, onPhaseClick }) => {
  const getPhaseIcon = (phase: WorkPhase, index: number) => {
    if (phase.isComplete) {
      return <CheckCircle className="w-6 h-6 text-emerald-500" />;
    }
    if (index === currentPhaseIndex) {
      return <Clock className="w-6 h-6 text-cyan-500 animate-pulse" />;
    }
    if (index > currentPhaseIndex) {
      return <Lock className="w-6 h-6 text-zinc-700" />;
    }
    return <div className="w-6 h-6 rounded-full border-2 border-zinc-700" />;
  };

  const getPhaseColor = (phase: WorkPhase, index: number) => {
    if (phase.isComplete) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (index === currentPhaseIndex) return 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10';
    if (index > currentPhaseIndex) return 'text-zinc-700 border-zinc-800 bg-zinc-950';
    return 'text-zinc-500 border-zinc-800 bg-zinc-950';
  };

  const getPhaseTypeLabel = (phaseType: string) => {
    const labels: Record<string, string> = {
      RECON: 'RECON',
      EXECUTION: 'EXECUTION',
      VERIFICATION: 'VERIFY',
      COMPLETION: 'COMPLETE'
    };
    return labels[phaseType] || phaseType;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Connection lines */}
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-zinc-800 -z-10">
          {phases.map((phase, index) => {
            if (index === phases.length - 1) return null;
            const isComplete = phase.isComplete;
            return (
              <div
                key={`line-${index}`}
                className={`absolute top-0 h-full transition-all duration-500 ${
                  isComplete ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
                style={{
                  left: `${(index * 100) / (phases.length - 1)}%`,
                  width: `${100 / (phases.length - 1)}%`
                }}
              />
            );
          })}
        </div>

        {/* Phase nodes */}
        {phases.map((phase, index) => {
          const isClickable = index <= currentPhaseIndex && onPhaseClick;
          return (
            <div
              key={phase.id}
              className="flex flex-col items-center flex-1 relative z-10"
            >
              <button
                onClick={() => isClickable && onPhaseClick?.(index)}
                disabled={!isClickable}
                className={`flex flex-col items-center space-y-3 p-4 rounded-2xl border-2 transition-all ${
                  getPhaseColor(phase, index)
                } ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}`}
              >
                {getPhaseIcon(phase, index)}
                <div className="text-center">
                  <div className="text-[8px] font-black uppercase tracking-widest mb-1">
                    {getPhaseTypeLabel(phase.phaseType)}
                  </div>
                  <div className="text-[7px] font-bold text-zinc-600 uppercase truncate max-w-[80px]">
                    {phase.name}
                  </div>
                </div>
              </button>
              
              {/* Progress indicator */}
              {index === currentPhaseIndex && (
                <div className="mt-2 w-full max-w-[60px] h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-500"
                    style={{ 
                      width: `${(phase.steps.filter(s => s.isComplete).length / phase.steps.length) * 100}%` 
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhaseStepper;
