import React from 'react';
import PreviewShell from './components/PreviewShell';
import ModuleCard from './components/ModuleCard';
import { hubSections } from './mockData';

interface EnvironmentalIntelligenceHubProps {
  activePath: string;
  onNavigatePath: (path: string) => void;
}

const EnvironmentalIntelligenceHub: React.FC<EnvironmentalIntelligenceHubProps> = ({ activePath, onNavigatePath }) => {
  return (
    <PreviewShell
      title="Environmental Intelligence Hub"
      subtitle="Monitor conditions, verify claims, run audits, and generate evidence-backed environmental reports."
      activePath={activePath}
      onNavigatePath={onNavigatePath}
    >
      {hubSections.map((section) => (
        <section key={section.title} className="space-y-3 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 md:p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            <p className="text-sm text-slate-600 max-w-4xl">{section.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 items-stretch">
            {section.cards.map((card) => (
              <ModuleCard
                key={card.title}
                title={card.title}
                badge={card.badge}
                description={card.description}
                status={card.status}
                cta={card.cta}
                onClick={() => onNavigatePath('/preview/module-preview/fuel-storage-audit')}
              >
                {card.title === 'Emissions Audit' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs">
                      General
                    </button>
                    <button type="button" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs">
                      CARB California
                    </button>
                  </div>
                )}
              </ModuleCard>
            ))}
          </div>
        </section>
      ))}
    </PreviewShell>
  );
};

export default EnvironmentalIntelligenceHub;
