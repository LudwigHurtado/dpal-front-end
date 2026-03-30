import React from 'react';

/**
 * Pricing is product-dependent; this isolates the UI surface.
 * Today it can display credits, vouchers, or “no charge” programs later.
 */
const TripFareEstimate: React.FC<{ label?: string; value?: string; helper?: string }> = ({
  label = 'Estimated cost',
  value = '—',
  helper = 'Pricing will be configured when the backend is connected.',
}) => {
  return (
    <div className="gw-card p-5 space-y-2">
      <div className="gw-card-title">{label}</div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{helper}</div>
    </div>
  );
};

export default TripFareEstimate;

