import React from 'react';
import type { EscrowCondition } from '../types';
import SectorCard from './SectorCard';

interface EscrowConditionsSectorProps {
  conditions: EscrowCondition[];
}

const EscrowConditionsSector: React.FC<EscrowConditionsSectorProps> = ({ conditions }) => {
  return (
    <SectorCard title="Escrow Conditions Sector" subtitle="Payout rules and validator release conditions">
      <ul className="space-y-2 text-xs text-zinc-300">
        {conditions.map((item) => (
          <li key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
            <p className="text-zinc-400">{item.label}</p>
            <p className="font-semibold text-zinc-100">{item.value}</p>
          </li>
        ))}
      </ul>
    </SectorCard>
  );
};

export default EscrowConditionsSector;
