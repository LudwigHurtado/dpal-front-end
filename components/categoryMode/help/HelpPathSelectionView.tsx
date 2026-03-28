import React, { useState } from 'react';
import type { CategoryDefinition } from '../../../types/categoryGateway';
import { useDPALFlow } from '../../../context/DPALFlowContext';

export type HelpPathSelectionViewProps = {
  definition: CategoryDefinition;
  accent: string;
  onRequestHelpContinue: () => void;
  onOfferHelpContinue: () => void;
};

const HelpPathSelectionView: React.FC<HelpPathSelectionViewProps> = ({
  definition,
  accent,
  onRequestHelpContinue,
  onOfferHelpContinue,
}) => {
  const { actions } = useDPALFlow();
  const [path, setPath] = useState<'request' | 'offer' | null>(null);
  const intro = definition.modes.help?.intro;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-orange-50/50 p-8 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">Help</h2>
        <p className="mt-2 text-slate-700 leading-relaxed">{intro}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => {
            setPath('request');
            actions.startHelpDraft?.({ helpDirection: 'request', categoryId: definition.id });
          }}
          className={`rounded-3xl border-2 p-8 text-left transition hover:shadow-md ${
            path === 'request' ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200 bg-white'
          }`}
        >
          <h3 className="text-lg font-black text-slate-900">I need help</h3>
          <p className="mt-2 text-sm text-slate-600">Request supplies, tutoring, safety support, or guidance.</p>
        </button>
        <button
          type="button"
          onClick={() => {
            setPath('offer');
            actions.startHelpDraft?.({ helpDirection: 'offer', categoryId: definition.id });
          }}
          className={`rounded-3xl border-2 p-8 text-left transition hover:shadow-md ${
            path === 'offer' ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-white'
          }`}
        >
          <h3 className="text-lg font-black text-slate-900">I want to help</h3>
          <p className="mt-2 text-sm text-slate-600">Offer mentoring, resources, or volunteer time.</p>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled={!path}
          onClick={() => (path === 'offer' ? onOfferHelpContinue() : onRequestHelpContinue())}
          className="rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-md disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default HelpPathSelectionView;
