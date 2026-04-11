import React from 'react';
import type { EscrowCondition } from '../types';
import SectorCard from './SectorCard';

interface EscrowConditionsSectorProps {
  conditions: EscrowCondition[];
}

const EscrowConditionsSector: React.FC<EscrowConditionsSectorProps> = ({ conditions }) => {
  const hasRows = Array.isArray(conditions) && conditions.length > 0;

  return (
    <SectorCard title="Escrow" subtitle="Validator release rules (optional)">
      {!hasRows ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-700">Escrow is not set up for this mission.</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            When your deployment connects validator escrow on the API, release triggers and dispute windows will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
            Preview copy only — not wired to a live escrow contract until the backend exposes real release rules.
          </div>
          <div className="mb-2 rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-600">
            Release logic and validator checks (placeholders)
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            {conditions.map((item) => (
              <li key={item.label} className="rounded-md border border-slate-300 bg-white p-2">
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                <p className="mt-1">☑ {item.value}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectorCard>
  );
};

export default EscrowConditionsSector;
