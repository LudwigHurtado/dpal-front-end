import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Root chrome for Environmental Intelligence module pages (Forest Integrity, Plastic Watch, etc.).
 */
const EnvironmentalDashboardShell: React.FC<Props> = ({ children, className }) => (
  <div className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col ${className ?? ''}`}>{children}</div>
);

export default EnvironmentalDashboardShell;
