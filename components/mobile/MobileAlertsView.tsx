import React from 'react';

const MobileAlertsView: React.FC = () => (
  <div className="dpal-mobile-ui min-h-full bg-[#f8fafc] pb-8">
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-[#0f172a]">Alerts</h1>
      <p className="text-[#64748b] text-sm mt-2">Reports and updates you follow will appear here.</p>
      <div className="mt-8 p-6 rounded-2xl border border-[#e2e8f0] bg-white text-center text-[#94a3b8] text-sm">
        No new alerts
      </div>
    </div>
  </div>
);

export default MobileAlertsView;
