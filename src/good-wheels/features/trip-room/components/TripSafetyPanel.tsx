import React from 'react';

const TripSafetyPanel: React.FC = () => (
  <div className="gw-card p-4 space-y-2">
    <div className="gw-card-title">Safety actions</div>
    <div className="text-sm text-slate-600">Good Wheels is not a substitute for emergency services.</div>
    <div className="text-sm text-slate-600">For emergencies, contact local emergency authorities immediately.</div>
    <div className="text-xs text-slate-500">Driver and passenger verification should be completed before live public launch.</div>
    <div className="text-xs text-slate-500">Location and trip logs should only be shared according to user consent and applicable law.</div>
    <div className="flex gap-2">
      <button type="button" className="gw-button gw-button-secondary">Contact support</button>
      <button type="button" className="gw-button gw-button-secondary">Safe call placeholder</button>
    </div>
  </div>
);

export default TripSafetyPanel;

