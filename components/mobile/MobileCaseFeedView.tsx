import React, { useState, useMemo } from 'react';
import { Report as ReportType, Category } from '../../types';
import { CATEGORIES_WITH_ICONS } from '../../constants';
import { Search, ChevronRight, MapPin, Heart, MessageSquare, CheckCircle } from '../icons';

const severityColor: Record<string, string> = {
  Informational: '#a1a1aa',
  Standard: '#22d3ee',
  Critical: '#f59e0b',
  Catastrophic: '#ef4444',
};

function formatDistance(_report: ReportType): string {
  return '0.5 km';
}

function formatTime(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function isVerified(report: ReportType): boolean {
  return (report.trustScore ?? 0) >= 70;
}

interface MobileCaseFeedViewProps {
  reports: ReportType[];
  onOpenReport: (report: ReportType) => void;
  onFollow?: (report: ReportType) => void;
  onShare?: (report: ReportType) => void;
  onConfirmWitness?: (report: ReportType) => void;
  onComment?: (report: ReportType) => void;
}

const MobileCaseFeedView: React.FC<MobileCaseFeedViewProps> = ({
  reports,
  onOpenReport,
  onFollow,
  onShare,
  onConfirmWitness,
  onComment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  const filteredReports = useMemo(() => {
    let list = [...reports];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }
    if (selectedCategories.length > 0) {
      list = list.filter((r) => selectedCategories.includes(r.category));
    }
    return list;
  }, [reports, searchQuery, selectedCategories]);

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const categoryInfo = (category: Category) =>
    CATEGORIES_WITH_ICONS.find((c) => c.value === category);

  return (
    <div className="dpal-mobile-ui min-h-full bg-zinc-950 pb-8">
      <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold text-white uppercase tracking-tight">Reports Near You</h1>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="search"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 text-base"
          />
        </div>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES_WITH_ICONS.slice(0, 8).map((c) => {
            const selected = selectedCategories.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleCategory(c.value)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider touch-manipulation transition-colors ${
                  selected ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {c.icon} {c.value}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p className="font-bold uppercase tracking-wider">No reports match your filters.</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const catInfo = categoryInfo(report.category);
            const severity = report.severity || 'Standard';
            const dotColor = severityColor[severity] || severityColor.Standard;
            const verified = isVerified(report);

            return (
              <article
                key={report.id}
                className="dpal-card p-4 flex flex-col gap-0 touch-manipulation active:opacity-90 border-zinc-800"
                onClick={() => onOpenReport(report)}
              >
                <div className="flex gap-3">
                  {/* Left: category icon + severity dot */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <span className="text-2xl">{catInfo?.icon || '📋'}</span>
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                  </div>

                  {/* Center: title + summary + bottom row */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white line-clamp-1">{report.title}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-2 mt-0.5">{report.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-zinc-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {formatDistance(report)}
                      </span>
                      <span className="text-xs text-zinc-500">{formatTime(report.timestamp)}</span>
                      {verified && (
                        <span className="dpal-chip-verified text-[10px] font-semibold">Verified</span>
                      )}
                      {!verified && (
                        <span className="dpal-chip-warning text-[10px] font-semibold">Needs review</span>
                      )}
                    </div>
                  </div>

                  {/* Right: chevron */}
                  <div className="flex-shrink-0 flex items-center">
                    <ChevronRight className="w-5 h-5 text-cyan-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 touch-manipulation text-xs font-bold uppercase" onClick={(e) => { e.preventDefault(); onFollow?.(report); }}><Heart className="w-4 h-4" /> Follow</button>
                  <button type="button" className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 touch-manipulation text-xs font-bold uppercase" onClick={(e) => { e.preventDefault(); onShare?.(report); }}><span>↗</span> Share</button>
                  <button type="button" className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 touch-manipulation text-xs font-bold uppercase" onClick={(e) => { e.preventDefault(); onConfirmWitness?.(report); }}><CheckCircle className="w-4 h-4" /> Witness</button>
                  <button type="button" className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 touch-manipulation text-xs font-bold uppercase" onClick={(e) => { e.preventDefault(); onComment?.(report); }}><MessageSquare className="w-4 h-4" /> Comment</button>
                </div>
            </article>
            );
          })
        )}
      </div>

      {/* Card actions (when a card is opened, these could be in a sheet; for list we keep Open via tap) */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default MobileCaseFeedView;
