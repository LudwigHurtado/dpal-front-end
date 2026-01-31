import React from 'react';
import { MapPin, ArrowLeft, ShieldCheck } from './icons';

interface MapHubViewProps {
  onReturnToMainMenu: () => void;
  onOpenFilters?: () => void;
}

const MapHubView: React.FC<MapHubViewProps> = ({ onReturnToMainMenu, onOpenFilters }) => {
  return (
    <div className="space-y-6 font-mono animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={onReturnToMainMenu}
          className="inline-flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-cyan-400 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span>TERMINAL_EXIT</span>
        </button>
        {onOpenFilters && (
          <button
            onClick={onOpenFilters}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Filters</span>
          </button>
        )}
      </div>

      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden aspect-[4/3] flex flex-col items-center justify-center min-h-[280px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.08),transparent_60%)] pointer-events-none" />
        <MapPin className="w-16 h-16 text-zinc-600 mb-4" />
        <h2 className="text-lg font-black uppercase tracking-widest text-zinc-500 mb-2">Map View</h2>
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider text-center max-w-[280px]">
          Geospatial report map — coming soon. Use Filters to set location.
        </p>
      </div>
    </div>
  );
};

export default MapHubView;
