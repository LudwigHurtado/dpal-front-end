import React from 'react';
import type { ProofRequirement } from '../types';
import SectorCard from './SectorCard';

interface ProofCompletionSectorProps {
  proof: ProofRequirement[];
  onToggleProof: (proofId: string) => void;
}

const ProofCompletionSector: React.FC<ProofCompletionSectorProps> = ({ proof, onToggleProof }) => {
  const iconById: Record<string, string> = {
    p1: '📷',
    p2: '📍',
    p3: '✅',
    p4: '👤',
  };

  return (
    <SectorCard title="Proof of Completion">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {proof.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggleProof(item.id)}
            className="rounded-lg border border-teal-900/50 bg-teal-950/50 p-3 text-center transition hover:border-teal-700/60 hover:bg-teal-950/80"
          >
            <span className="block text-2xl">{iconById[item.id] ?? '•'}</span>
            <span className="mt-1 block text-xs text-teal-100/90">{item.label}</span>
            <span className={`mt-1 block text-[11px] ${item.completed ? 'text-emerald-400' : 'text-teal-600'}`}>
              {item.completed ? 'Done' : 'Pending'}
            </span>
          </button>
        ))}
      </div>
    </SectorCard>
  );
};

export default ProofCompletionSector;
