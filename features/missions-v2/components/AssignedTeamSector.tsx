import React from 'react';
import type { TeamMemberAssignment } from '../types';
import SectorCard from './SectorCard';

interface AssignedTeamSectorProps {
  team: TeamMemberAssignment[];
}

const AssignedTeamSector: React.FC<AssignedTeamSectorProps> = ({ team }) => {
  return (
    <SectorCard title="Assigned Team Sector" subtitle="Role assignment and permissions map">
      <ul className="space-y-2">
        {team.map((member) => (
          <li key={`${member.role}-${member.name}`} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-300">
            <p className="font-semibold text-zinc-100">{member.role}: {member.name}</p>
            <p className="mt-1 text-zinc-400">Permissions: {member.permissions.join(', ')}</p>
          </li>
        ))}
      </ul>
    </SectorCard>
  );
};

export default AssignedTeamSector;
