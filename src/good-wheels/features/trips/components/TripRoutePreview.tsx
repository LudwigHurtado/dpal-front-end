import React from 'react';
import type { Trip } from '../tripTypes';

const TripRoutePreview: React.FC<{ trip: Trip }> = ({ trip }) => {
  const steps = trip.routeSummary?.previewSteps ?? [];
  const distanceKm = trip.routeSummary?.distanceKm ?? trip.estimate.distanceKm;
  const durationMinutes = trip.routeSummary?.durationMinutes ?? Math.max(6, trip.estimate.etaMinutes + 5);

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">Route preview</div>
      <div className="text-sm text-slate-700">
        <strong>{distanceKm.toFixed(1)} km</strong> · <strong>{durationMinutes} min</strong>
      </div>
      <div className="gw-map-placeholder" style={{ minHeight: 140 }}>
        Map placeholder (route polyline + markers)
      </div>
      {steps.length > 0 && (
        <ol className="text-sm text-slate-600 space-y-2">
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

