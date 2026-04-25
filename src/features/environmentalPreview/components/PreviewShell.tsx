import React from 'react';
import DpalSidebar from './DpalSidebar';
import DpalTopbar from './DpalTopbar';

const previewLinks = [
  { label: 'Command Center', path: '/preview/environmental-command-center' },
  { label: 'Intelligence Hub', path: '/preview/environmental-intelligence-hub' },
  { label: 'Fuel Storage Audit', path: '/preview/fuel-storage-audit' },
  { label: 'Evidence Packet', path: '/preview/evidence-packet' },
  { label: 'Generic Module', path: '/preview/module-preview/fuel-storage-audit' },
];

interface PreviewShellProps {
  title: string;
  subtitle?: string;
  activePath: string;
  onNavigatePath: (path: string) => void;
  children: React.ReactNode;
}

const PreviewShell: React.FC<PreviewShellProps> = ({ title, subtitle, activePath, onNavigatePath, children }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      <DpalSidebar title="Environmental Preview" links={previewLinks} activePath={activePath} onNavigate={onNavigatePath} />
      <main className="flex-1 w-full px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-7 space-y-5">
        <DpalTopbar title={title} subtitle={subtitle} />
        <div className="max-w-[1500px] space-y-5">{children}</div>
      </main>
    </div>
  );
};

export default PreviewShell;
