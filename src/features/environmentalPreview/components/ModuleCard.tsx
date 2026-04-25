import React from 'react';

interface ModuleCardProps {
  title: string;
  badge: string;
  description: string;
  status: string;
  cta: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ title, badge, description, status, cta, onClick, children }) => {
  const badgeTone =
    badge === 'Audit'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : badge === 'Monitoring'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : badge === 'Impact'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : badge === 'Signals'
      ? 'bg-violet-100 text-violet-800 border-violet-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  const statusTone =
    status.toLowerCase().includes('review') || status.toLowerCase().includes('pilot')
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-emerald-700 bg-emerald-50 border-emerald-200';

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col min-h-[230px]">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-base font-semibold text-slate-900 leading-snug">{title}</h4>
        <span className={`text-xs rounded-full px-2.5 py-1 border ${badgeTone}`}>{badge}</span>
      </div>
      <p className="text-sm text-slate-600 mt-2 leading-6 flex-1">{description}</p>
      <p className={`text-xs mt-3 inline-flex w-fit rounded-full px-2.5 py-1 border ${statusTone}`}>Status: {status}</p>
      <div className="mt-3">{children}</div>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 rounded-lg bg-slate-900 text-white text-sm px-3 py-2 hover:bg-slate-800"
      >
        {cta}
      </button>
    </article>
  );
};

export default ModuleCard;
