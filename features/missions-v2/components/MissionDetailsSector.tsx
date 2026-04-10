import React from 'react';
import type { MissionDetails } from '../types';
import SectorCard from './SectorCard';

interface MissionDetailsSectorProps {
  details: MissionDetails;
}

const MissionDetailsSector: React.FC<MissionDetailsSectorProps> = ({ details }) => {
  return (
    <SectorCard title="Mission Details Sector" subtitle="Mission objective, deadline, reward, and rule set">
      <div className="space-y-2 text-xs text-zinc-300">
        <p><span className="text-zinc-500">Objective:</span> {details.objective}</p>
        <p><span className="text-zinc-500">Deadline:</span> {details.deadline}</p>
        <p><span className="text-zinc-500">Reward:</span> {details.rewardLabel}</p>
        <p><span className="text-zinc-500">Escrow:</span> {details.escrowLabel}</p>
        <ul className="list-disc space-y-1 pl-4 pt-1">
          {details.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </SectorCard>
  );
};

export default MissionDetailsSector;
