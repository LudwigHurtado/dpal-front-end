import React from 'react';
import { ArrowLeft, Shield } from './icons';

interface DpalLiftsViewProps {
  onReturn: () => void;
  /** Prefer this over window events so navigation always uses App’s router. */
  onOpenGoodWheels?: () => void;
}

/** Placeholder for Decentralized Public Assistance Lifts — full flows wired later. */
const DpalLiftsView: React.FC<DpalLiftsViewProps> = ({ onReturn, onOpenGoodWheels }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <button
        type="button"
        onClick={onReturn}
        className="inline-flex items-center gap-2 mb-8 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <div className="dpal-bg-panel border dpal-border-subtle rounded-[1.75rem] p-8 md:p-10 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 rounded-2xl dpal-bg-deep border dpal-border-emphasis">
            <Shield className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--dpal-text-primary)] tracking-tight">DPAL Lifts</h1>
            <p className="text-sm text-[var(--dpal-text-secondary)] mt-1">Decentralized Public Assistance Lifts</p>
          </div>
        </div>
        <p className="text-[var(--dpal-text-secondary)] leading-relaxed">
          Ride coordination, donation credits, and community impact tools will connect here. You can wire missions and flows next — this screen is ready for navigation.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (onOpenGoodWheels) {
                onOpenGoodWheels();
                return;
              }
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('dpal-navigate', { detail: { view: 'goodWheels' } }));
              }
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black px-6 py-4 text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Open DPAL Good Wheels
          </button>
        </div>
      </div>
    </div>
  );
};

export default DpalLiftsView;
