import React from 'react';

const MobileAlertsView: React.FC = () => (
  <div className="dpal-mobile-ui min-h-full bg-zinc-950 pb-8">
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-white uppercase tracking-tight">Alerts</h1>
      <p className="text-zinc-500 text-sm mt-2 font-mono">Reports and updates you follow will appear here.</p>
      <div className="mt-8 p-6 rounded-2xl border border-zinc-800 bg-zinc-900 text-center text-zinc-500 text-sm font-bold uppercase">
        No new alerts
      </div>
    </div>
  </div>
);

export default MobileAlertsView;
