import React from 'react';

const TripQRCodePanel: React.FC<{ qrCodeValue: string }> = ({ qrCodeValue }) => (
  <div className="gw-card p-4 space-y-2">
    <div className="gw-card-title">Trip QR proof</div>
    <div className="rounded-xl border border-dashed border-slate-300 p-4 bg-slate-50">
      <div className="text-xs text-slate-500">Passenger-driver verification code</div>
      <div className="text-sm font-bold text-slate-800 mt-1">{qrCodeValue}</div>
    </div>
  </div>
);

export default TripQRCodePanel;

