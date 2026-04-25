import React from 'react';
import { ArrowRight, Activity, Coins, Package, UserCircle, Shield } from './icons';
import type { View, HeroHubTab, HubTab } from '../App';
import type { Category } from '../types';

interface PrivateHubMenuViewProps {
  onReturn: () => void;
  onNavigate: (view: View, category?: Category, targetTab?: HeroHubTab | HubTab) => void;
}

const PrivateHubCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  tone: 'cyan' | 'emerald' | 'amber' | 'purple' | 'rose';
  bgImageUrl?: string;
  onClick: () => void;
}> = ({ icon, label, subLabel, tone, bgImageUrl, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative flex flex-col items-start p-6 rounded-[1.8rem] dpal-bg-panel border-2 dpal-border-subtle hover:border-[var(--dpal-border-strong)] transition-all group overflow-hidden h-full text-left shadow-xl"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${tone}-500/10 blur-3xl group-hover:bg-${tone}-500/20 transition-colors`} />
    {bgImageUrl ? (
      <img
        src={encodeURI(bgImageUrl)}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain object-center opacity-100 dpal-bg-deep"
      />
    ) : null}

    <div className="relative w-full flex justify-between items-start mb-6">
      <div className={`p-4 rounded-2xl dpal-bg-deep border dpal-border-emphasis group-hover:border-${tone}-500/50 transition-all shadow-lg`}>
        <div className={`text-${tone}-400`}>{icon}</div>
      </div>
      <div className="flex items-center space-x-2 bg-[var(--dpal-overlay-soft)] px-3 py-1 rounded-lg border dpal-border-subtle">
        <div className={`w-1.5 h-1.5 rounded-full bg-${tone}-500 animate-pulse`} />
        <span className={`text-[8px] font-semibold tracking-wide text-${tone}-400`}>Private</span>
      </div>
    </div>

    <h3 className="relative translate-y-2 text-lg font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
      {label}
    </h3>
    <p className="relative mt-4 text-xs leading-relaxed text-slate-200/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
      {subLabel}
    </p>

    <div className="relative mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-500/60 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-black/55">
      Open
      <ArrowRight className="w-3.5 h-3.5" />
    </div>
  </button>
);

const PrivateHubMenuView: React.FC<PrivateHubMenuViewProps> = ({ onReturn, onNavigate }) => {
  return (
    <div className="animate-fade-in max-w-[1400px] mx-auto px-4 pb-24 font-mono">
      <div className="mb-7">
        <button
          type="button"
          onClick={onReturn}
          className="mb-4 rounded-lg border dpal-border-subtle bg-black/20 px-3 py-1.5 text-xs text-slate-200 hover:bg-black/35"
        >
          Back to Home
        </button>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">Private Space</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white">Hero Profile &amp; Vault Menu</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Personal tools only. This page keeps your profile, records, collection, wallet, and vault controls together in one private menu.
        </p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <PrivateHubCard
          icon={<Activity className="w-8 h-8" />}
          label="My Contributions"
          subLabel="Your personal story of care and impact."
          tone="cyan"
          bgImageUrl="/main-screen/my-reports.png"
          onClick={() => onNavigate('hub', undefined, 'my_reports')}
        />
        <PrivateHubCard
          icon={<Package className="w-8 h-8" />}
          label="My Collection"
          subLabel="Evidence, badges, and milestones you earned."
          tone="emerald"
          bgImageUrl="/main-screen/asset-archive.png"
          onClick={() => onNavigate('heroHub', undefined, 'collection')}
        />
        <PrivateHubCard
          icon={<Coins className="w-8 h-8" />}
          label="Wallet & Coins"
          subLabel="Track and manage your personal balance and coin activity."
          tone="amber"
          bgImageUrl="/main-screen/coin-exchange.png"
          onClick={() => onNavigate('heroHub', undefined, 'vault')}
        />
        <PrivateHubCard
          icon={<UserCircle className="w-8 h-8" />}
          label="Hero Profile"
          subLabel="Manage your identity, persona, and profile settings."
          tone="purple"
          onClick={() => onNavigate('heroHub', undefined, 'profile')}
        />
        <PrivateHubCard
          icon={<Shield className="w-8 h-8" />}
          label="Vault"
          subLabel="Open the secure tactical vault space for protected access."
          tone="rose"
          onClick={() => onNavigate('tacticalVault')}
        />
      </section>
    </div>
  );
};

export default PrivateHubMenuView;
