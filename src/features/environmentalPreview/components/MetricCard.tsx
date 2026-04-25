import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, trend }) => {
  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 min-h-[132px]">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      {trend && <p className="text-xs text-slate-600 mt-1 leading-5">{trend}</p>}
    </article>
  );
};

export default MetricCard;
