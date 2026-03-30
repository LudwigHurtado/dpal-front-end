import React from 'react';

const TripMetaRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-slate-500 font-bold">{label}</div>
      <div className="text-sm font-extrabold text-slate-800 text-right">{value}</div>
    </div>
  );
};

export default TripMetaRow;

