import React from 'react';
import { ArrowLeft } from '../../../components/icons';
import { DmrvCategoryGallery } from './components/DmrvCategoryGallery';
import { DmrvCategorySelectorDial } from './components/DmrvCategorySelectorDial';
import { DMRV_HUB_SUBTITLE } from './dmrvRegistry';

export type DmrvHubPageProps = {
  onReturn?: () => void;
};

export default function DmrvHubPage({ onReturn }: DmrvHubPageProps): React.ReactElement {
  return (
    <div className="min-h-full bg-[#f4f6f9] text-slate-900">
      <div className="mx-auto w-full max-w-[min(100%,1280px)] px-4 py-6 sm:px-6 lg:px-8">
        {onReturn ? (
          <button
            type="button"
            onClick={onReturn}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </button>
        ) : null}

        <header className="mb-8 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-800">DPAL Platform</p>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-[#1e3a5f] md:text-3xl">
            DPAL Adaptive DMRV Engine
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 md:text-base">
            {DMRV_HUB_SUBTITLE}
          </p>
        </header>

        <DmrvCategoryGallery
          title="All MRV domains"
          subtitle="Select a category to open its DMRV types, evidence inputs, and configuration workflow."
        />

        <div className="mx-auto mt-10 max-w-md">
          <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Quick selector
          </p>
          <DmrvCategorySelectorDial />
        </div>

        <footer className="mt-10 rounded-xl border border-slate-200 bg-white px-5 py-4 text-center text-[11px] text-slate-600">
          Images are visual entry points only — all labels and actions are live HTML controls. Turn the dial or pick a
          legend item to open a full DMRV category workspace. Configuration does not imply certified credits, automatic
          verification, or regulatory approval.
        </footer>
      </div>
    </div>
  );
}
