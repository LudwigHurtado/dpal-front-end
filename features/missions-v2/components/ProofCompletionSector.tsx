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
            className="rounded-md border border-slate-300 bg-white p-3 text-center"
          >
            <span className="block text-2xl">{iconById[item.id] ?? '•'}</span>
            <span className="mt-1 block text-xs text-slate-700">{item.label}</span>
            <span className={`mt-1 block text-[11px] ${item.completed ? 'text-emerald-600' : 'text-slate-500'}`}>
              {item.completed ? 'Done' : 'Pending'}
            </span>
          </button>
        ))}
      </div>
    </SectorCard>
  );
};

export default ProofCompletionSector;
