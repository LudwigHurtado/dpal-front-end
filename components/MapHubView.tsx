import React, { useMemo, useState } from 'react';
import { MapPin, ArrowLeft, ShieldCheck, Loader } from './icons';

interface MapHubViewProps {
  onReturnToMainMenu: () => void;
  onOpenFilters?: () => void;
  /** Optional location query for map center (e.g. from filters or "Earth"). */
  mapCenter?: string;
}

const MapHubView: React.FC<MapHubViewProps> = ({ onReturnToMainMenu, onOpenFilters, mapCenter = 'Earth' }) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapUrl = useMemo(() => {
    const query = (mapCenter && mapCenter.trim()) || 'Earth';
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=k&z=12&ie=UTF8&iwloc=&output=embed`;
  }, [mapCenter]);

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

      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden aspect-[4/3] min-h-[280px] flex flex-col">
        {!mapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 z-10">
            <Loader className="w-10 h-10 text-cyan-500 animate-spin mb-3" />
            <MapPin className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Loading Google Maps…</p>
          </div>
        )}
        <iframe
          src={mapUrl}
          className="w-full h-full min-h-[280px] rounded-2xl border-0 transition-opacity duration-300"
          style={{ opacity: mapLoaded ? 1 : 0 }}
          title="Geospatial report map"
          onLoad={() => setMapLoaded(true)}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
};

export default MapHubView;
