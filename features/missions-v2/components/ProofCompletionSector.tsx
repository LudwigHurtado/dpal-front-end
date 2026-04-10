import React from 'react';
import type { ProofRequirement } from '../types';
import SectorCard from './SectorCard';

interface ProofCompletionSectorProps {
  proof: ProofRequirement[];
  onToggleProof: (proofId: string) => void;
}

const ProofCompletionSector: React.FC<ProofCompletionSectorProps> = ({ proof, onToggleProof }) => {
  return (
    <SectorCard title="Proof of Completion Sector" subtitle="Upload, GPS, verification, and beneficiary confirmation">
      <div className="space-y-2">
        {proof.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggleProof(item.id)}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
          >
            <span className="text-zinc-200">{item.label}</span>
            <span className={item.completed ? 'text-emerald-400' : 'text-amber-400'}>
              {item.completed ? 'Complete' : 'Pending'}
            </span>
          </button>
        ))}
      </div>
    </SectorCard>
  );
};

export default ProofCompletionSector;
