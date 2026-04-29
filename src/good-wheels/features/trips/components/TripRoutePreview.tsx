import React from 'react';
import type { Trip } from '../tripTypes';
import TripRouteSummaryCard from './TripRouteSummaryCard';

const TripRoutePreview: React.FC<{ trip: Trip }> = ({ trip }) => {
  const steps = trip.routeSummary?.previewSteps ?? [];

  return (
    <div className="gw-card p-5 space-y-3">
      <TripRouteSummaryCard trip={trip} />
      {steps.length > 0 && (
        <ol className="text-sm text-slate-600 space-y-2 pt-1">
          {steps.slice(0, 4).map((s, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-slate-400 font-bold">{idx + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default TripRoutePreview;
