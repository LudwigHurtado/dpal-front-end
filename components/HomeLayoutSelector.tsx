import React from 'react';
import { List, Map, Tag } from './icons';
import type { HomeLayout } from '../constants';

interface HomeLayoutSelectorProps {
  value: HomeLayout;
  onChange: (layout: HomeLayout) => void;
  className?: string;
}

const OPTIONS: { id: HomeLayout; label: string; icon: React.ElementType }[] = [
  { id: 'feed', label: 'Feed', icon: List },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'categories', label: 'Categories', icon: Tag },
];

const HomeLayoutSelector: React.FC<HomeLayoutSelectorProps> = ({ value, onChange, className = '' }) => {
  return (
    <div
      className={`inline-flex rounded-xl bg-zinc-900 border border-zinc-800 p-1 shadow-inner ${className}`}
      role="tablist"
      aria-label="Home layout"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={`flex items-center justify-center gap-2 min-w-[80px] sm:min-w-[96px] py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              isActive
                ? 'bg-cyan-600 text-white border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default HomeLayoutSelector;
