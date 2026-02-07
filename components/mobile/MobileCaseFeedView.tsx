import React, { useState, useMemo } from 'react';
import { Report as ReportType, Category } from '../../types';
import { CATEGORIES_WITH_ICONS } from '../../constants';
import { Search, MapPin, Heart, CheckCircle, List, Filter } from '../icons';

const HEADER_BLUE = '#2563eb';

function formatDistance(_report: ReportType): string {
  const d = ['0.8 km', '1.2 km', '3.5 km', '800 m'][Math.abs(_report.id?.length ?? 0) % 4];
  return d;
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

const FEED_TABS = ['All', 'Safety', 'Environment', 'Community'] as const;
const TAB_TO_CATEGORIES: Record<string, Category[]> = {
  All: [],
  Safety: [Category.PublicSafetyAlerts, Category.AccidentsRoadHazards, Category.MedicalEmergencies],
  Environment: [Category.Environment, Category.FireEnvironmentalHazards, Category.WaterViolations],
  Community: [Category.CivicDuty, Category.NonProfit, Category.Education],
};

interface MobileCaseFeedViewProps {
  reports: ReportType[];
  onOpenReport: (report: ReportType) => void;
  onOpenFilters?: () => void;
  onFollow?: (report: ReportType) => void;
  onShare?: (report: ReportType) => void;
  onConfirmWitness?: (report: ReportType) => void;
  filterRadiusKm?: number;
  filterDateRange?: string;
  filterVerifiedOnly?: boolean;
  filterSeverity?: string[];
  filterWithEvidenceOnly?: boolean;
}

const MobileCaseFeedView: React.FC<MobileCaseFeedViewProps> = ({
  reports,
  onOpenReport,
  onOpenFilters,
  onFollow,
  onShare,
  onConfirmWitness,
  filterRadiusKm,
  filterDateRange,
  filterVerifiedOnly,
  filterSeverity,
  filterWithEvidenceOnly,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<(typeof FEED_TABS)[number]>('All');

  const filteredReports = useMemo(() => {
    let list = [...reports];
    const catFilter = TAB_TO_CATEGORIES[activeTab];
    if (catFilter.length > 0) {
      list = list.filter((r) => catFilter.includes(r.category));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }
    if (filterWithEvidenceOnly) {
      list = list.filter((r) => r.imageUrls?.length);
    }
    return list;
  }, [reports, searchQuery, activeTab, filterWithEvidenceOnly]);

  const categoryInfo = (category: Category) =>
    CATEGORIES_WITH_ICONS.find((c) => c.value === category);

  return (
    <div className="min-h-full bg-zinc-950 pb-8">
      {/* Header: Hamburger | DPAL | Search icon */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-800" style={{ backgroundColor: HEADER_BLUE }}>
        <button type="button" className="p-2 rounded-full bg-white/20 text-white touch-manipulation" aria-label="Menu">
          <List className="w-6 h-6" />
        </button>
        <span className="text-lg font-bold text-white tracking-tight">DPAL</span>
        <button type="button" className="p-2 rounded-full bg-white/20 text-white touch-manipulation" aria-label="Search">
          <Search className="w-6 h-6" />
        </button>
      </header>

      {/* Search bar */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="search"
            placeholder="Reports Near You"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 text-base"
          />
        </div>
        {/* Category tabs: All, Safety (green when active), Environment, Community */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {FEED_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold touch-manipulation ${
                activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Map snippet */}
      <div className="mx-4 mt-3 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-[2/1] flex items-center justify-center relative">
        <a
          href="https://www.google.com/maps"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-zinc-500"
        >
          <MapPin className="w-10 h-10 text-zinc-600" />
          <span className="text-xs font-medium">Map</span>
          <span className="text-[10px]">15% nearby</span>
        </a>
      </div>

      {/* Report list - card with image, details, Follow/Confirm/Share */}
      <div className="px-4 py-4 space-y-3">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <p className="font-semibold">No reports match.</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const verified = isVerified(report);
            const imgUrl = report.imageUrls?.[0] || `https://picsum.photos/seed/${report.id}/400/200`;

            return (
              <article
                key={report.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden touch-manipulation active:opacity-90"
                onClick={() => onOpenReport(report)}
              >
                <div className="flex gap-3 p-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800">
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white line-clamp-1">{report.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatDistance(report)} · {formatTime(report.timestamp)}
                    </p>
                    <p className={`text-xs mt-1 font-medium ${verified ? 'text-emerald-400' : 'text-red-400'}`}>
                      {verified ? '✓ Verified' : '✗ Unverified'}
                    </p>
                    <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{report.description}</p>
                  </div>
                </div>
                <div className="flex border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="flex-1 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 touch-manipulation flex items-center justify-center gap-1" onClick={() => onFollow?.(report)}>
                    <Heart className="w-4 h-4" /> Follow
                  </button>
                  <button type="button" className="flex-1 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 touch-manipulation flex items-center justify-center gap-1" onClick={() => onConfirmWitness?.(report)}>
                    <CheckCircle className="w-4 h-4" /> Confirm
                  </button>
                  <button type="button" className="flex-1 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 touch-manipulation flex items-center justify-center gap-1" onClick={() => onShare?.(report)}>
                    ↗ Share
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Filter button - optional, if Filters screen is used */}
      {onOpenFilters && (
        <div className="fixed top-20 right-4 z-20">
          <button
            type="button"
            onClick={onOpenFilters}
            className="p-2 rounded-full bg-zinc-800 border border-zinc-700 text-white shadow-lg touch-manipulation"
            aria-label="Filters"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      )}

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
