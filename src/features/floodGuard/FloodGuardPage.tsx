import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FloodGuardDashboard from './components/FloodGuardDashboard';
import type { FloodSituationParticipantRole } from './floodGuardTypes';
import WaterIntelligenceLauncher from '../waterIntelligence/WaterIntelligenceLauncher';
import ColoradoRiverExchangePilotView from '../waterIntelligence/ColoradoRiverExchangePilotView';
import RussWaterMarketAssistant from '../waterIntelligence/RussWaterMarketAssistant';

interface FloodGuardPageProps {
  onReturn?: () => void;
  actorName?: string;
  actorRole?: FloodSituationParticipantRole;
}

function parseWiProject(search: string): string | null {
  return new URLSearchParams(search).get('p');
}

const CreateWaterProjectPlaceholder: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="space-y-4">
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold dpal-text-muted hover:opacity-80"
      style={{ background: 'var(--dpal-surface-alt)', border: '1px solid var(--dpal-border)' }}
    >
      ← Water Intelligence home
    </button>
    <div className="rounded-2xl p-6 border dpal-border-subtle space-y-3" style={{ background: 'var(--dpal-card)' }}>
      <h1 className="text-xl font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
        Create New Water Project
      </h1>
      <p className="text-sm dpal-text-secondary leading-relaxed">
        Project creation for cities, basins, irrigation districts, and conservation programs is planned as the next
        phase. This placeholder keeps navigation safe without implying a live provisioning API.
      </p>
      <ul className="text-xs dpal-text-secondary list-disc pl-5 space-y-1">
        <li>Use the Colorado River pilot for basin-scale demo workflow.</li>
        <li>Use the Santa Cruz FloodGuard demo for city-scale flood intelligence.</li>
        <li>Use AquaScan (`/water`) when you need location-first satellite and Copernicus comparisons.</li>
      </ul>
      <span
        className="inline-flex text-[10px] font-bold uppercase px-2 py-1 rounded"
        style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.4)' }}
      >
        Demo placeholder — not persisted
      </span>
    </div>
  </div>
);

/**
 * DPAL Water Intelligence entry — launcher first; Colorado basin pilot and FloodGuard city demos via `?p=`.
 * Mounted from App.tsx when `currentView === 'floodGuard'` (`/floodguard`).
 */
const FloodGuardPage: React.FC<FloodGuardPageProps> = ({ onReturn, actorName, actorRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const p = parseWiProject(location.search);

  const goLauncher = () => navigate('/water-intelligence', { replace: true });

  if (!p) {
    return (
      <div className="min-h-screen px-3 md:px-6 py-4 md:py-6" style={{ background: 'var(--dpal-background)' }}>
        <div className="max-w-7xl mx-auto space-y-4">
          <WaterIntelligenceLauncher onReturn={onReturn} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2" />
            <RussWaterMarketAssistant context={{ screen: 'launcher' }} />
          </div>
        </div>
      </div>
    );
  }

  if (p === 'colorado' || p === 'colorado-river') {
    return (
      <div className="min-h-screen px-3 md:px-6 py-4 md:py-6" style={{ background: 'var(--dpal-background)' }}>
        <div className="max-w-7xl mx-auto">
          <ColoradoRiverExchangePilotView />
        </div>
      </div>
    );
  }

  if (p === 'create') {
    return (
      <div className="min-h-screen px-3 md:px-6 py-4 md:py-6" style={{ background: 'var(--dpal-background)' }}>
        <div className="max-w-7xl mx-auto">
          <CreateWaterProjectPlaceholder onBack={goLauncher} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-3 md:px-6 py-4 md:py-6" style={{ background: 'var(--dpal-background)' }}>
      <div className="max-w-7xl mx-auto">
        <FloodGuardDashboard
          onReturn={onReturn}
          actorName={actorName}
          actorRole={actorRole}
          waterIntelligenceHome={goLauncher}
          investorDemoMode={p === 'investor'}
        />
      </div>
    </div>
  );
};

export default FloodGuardPage;
