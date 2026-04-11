import React from 'react';
import { mw } from '../missionWorkspaceTheme';

interface SectorCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

const SectorCard: React.FC<SectorCardProps> = ({ title, subtitle, children, className }) => {
  return (
    <section className={`${mw.sectorCard} ${className ?? ''}`}>
      <div className="mb-2 flex items-center gap-2">
        <h3 className={mw.sectorTitle}>{title}</h3>
        <div className={mw.sectorDivider} />
      </div>
      {subtitle ? <p className={mw.sectorSubtitle}>{subtitle}</p> : null}
      {children}
    </section>
  );
};

export default SectorCard;
