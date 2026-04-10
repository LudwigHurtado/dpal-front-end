import React from 'react';

interface SectorCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

const SectorCard: React.FC<SectorCardProps> = ({ title, subtitle, children, className }) => {
  return (
    <section className={`rounded-xl border border-slate-300 bg-slate-100 p-3 md:p-4 ${className ?? ''}`}>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h3>
        <div className="h-px flex-1 bg-slate-300" />
      </div>
      {subtitle ? <p className="mb-3 text-[11px] text-slate-500">{subtitle}</p> : null}
      {children}
    </section>
  );
};

export default SectorCard;
