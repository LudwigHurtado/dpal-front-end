import React from 'react';

interface SectorCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const SectorCard: React.FC<SectorCardProps> = ({ title, subtitle, children }) => {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:p-5">
      <div className="mb-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
};

export default SectorCard;
