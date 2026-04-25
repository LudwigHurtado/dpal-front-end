import React from 'react';

interface MapPlaceholderProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ title = 'Global Environmental Map', subtitle = 'Mock map canvas for preview only', className = '' }) => {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">{subtitle}</span>
      </div>
      <div className="mt-3 h-64 md:h-72 rounded-xl border border-dashed border-slate-300 relative overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200">
        <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.35) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs text-slate-500">
          <span>Layers: Facilities | Alerts | Risk Zones</span>
          <span>Mock Preview</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg bg-white/85 border border-slate-200 px-4 py-2 text-sm text-slate-600 shadow-sm">
            Geospatial canvas placeholder
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapPlaceholder;
