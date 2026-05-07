import React from 'react';
import FloodGuardDashboard from './components/FloodGuardDashboard';
import type { FloodSituationParticipantRole } from './floodGuardTypes';

interface FloodGuardPageProps {
  onReturn?: () => void;
  actorName?: string;
  actorRole?: FloodSituationParticipantRole;
}

/**
 * Public entry for the DPAL FloodGuard module.
 * Mounted from App.tsx when `currentView === 'floodGuard'`.
 */
const FloodGuardPage: React.FC<FloodGuardPageProps> = ({ onReturn, actorName, actorRole }) => {
  return (
    <div className="min-h-screen px-3 md:px-6 py-4 md:py-6" style={{ background: 'var(--dpal-background)' }}>
      <div className="max-w-7xl mx-auto">
        <FloodGuardDashboard onReturn={onReturn} actorName={actorName} actorRole={actorRole} />
      </div>
    </div>
  );
};

export default FloodGuardPage;
