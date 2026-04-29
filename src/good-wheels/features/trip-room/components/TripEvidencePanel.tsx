import React, { useEffect, useState } from 'react';
import type { TripEvidence } from '../../../types/rideConnection';
import { goodWheelsEvidenceService } from '../../../services/goodWheelsEvidenceService';

const TripEvidencePanel: React.FC<{ rideId: string }> = ({ rideId }) => {
  const [evidence, setEvidence] = useState<TripEvidence[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const items = await goodWheelsEvidenceService.listEvidence(rideId);
      if (mounted) setEvidence(items);
    };
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [rideId]);

  return (
    <div className="gw-card p-4 space-y-2">
      <div className="gw-card-title">Trip evidence panel</div>
      <div className="space-y-2 max-h-52 overflow-auto">
        {evidence.length === 0 ? (
          <div className="text-sm text-slate-500">No evidence yet.</div>
        ) : (
          evidence.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="text-xs font-semibold text-slate-500">{item.type}</div>
              <div className="text-sm font-semibold text-slate-800">{item.label}</div>
              <div className="text-xs text-slate-600">{item.value}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TripEvidencePanel;

