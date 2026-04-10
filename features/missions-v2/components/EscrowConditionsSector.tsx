import React from 'react';
import type { EscrowCondition } from '../types';
import SectorCard from './SectorCard';

interface EscrowConditionsSectorProps {
  conditions: EscrowCondition[];
}

const EscrowConditionsSector: React.FC<EscrowConditionsSectorProps> = ({ conditions }) => {
  return (
    <SectorCard title="Escrow Conditions">
      <div className="mb-2 rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-600">
        Release logic and validator checks
      </div>
      <ul className="space-y-2 text-sm text-slate-700">
        {conditions.map((item) => (
          <li key={item.label} className="rounded-md border border-slate-300 bg-white p-2">
            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
            <p className="mt-1">☑ {item.value}</p>
          </li>
        ))}
      </ul>
    </SectorCard>
  );
};

export default EscrowConditionsSector;
