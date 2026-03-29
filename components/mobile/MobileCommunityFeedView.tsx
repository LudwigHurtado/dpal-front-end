import React, { useMemo, useState } from 'react';
import type { Report } from '../../types';
import {
  Home,
  Megaphone,
  List,
  Database,
  MapPin,
  Clock,
  MoreVertical,
  Heart,
  MessageSquare,
  Link,
  Send,
  Camera,
  Mic,
  Crosshair,
  Search,
  UserCircle,
  Map as MapIcon,
  PlusCircle,
} from '../icons';
import type { View } from '../../App';

type FeedUrgency = 'any' | 'urgent';
type FeedCategory = 'any' | 'safety' | 'environment' | 'community';

interface MobileCommunityFeedViewProps {
  reports: Report[];
  onNavigate: (view: View) => void;
  onOpenIncidentRoom: (report: Report) => void;
  onCreatePost: () => void;
}

const clampLinesStyles = `
.dpal-line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.dpal-line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.dpal-line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
`;

function formatTime(dateInput: unknown): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput as any);
  if (Number.isNaN(d.getTime())) return 'recent';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${Math.max(0, diffMins)}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatDistance(report: Report): string {
  const d = ['0.8 km', '1.2 km', '3.5 km', '800 m'][Math.abs((report?.id || '').length ?? 0) % 4];
  return d;
}

function isUrgent(report: Report): boolean {
  return report.severity === 'Critical' || report.severity === 'Catastrophic';
}

function categoryGroup(report: Report): FeedCategory {
  const c = report.category;
  if (
    c === 'Public Safety Alerts' ||
    c === 'Accidents & Road Hazards' ||
    c === 'Medical Emergencies' ||
    c === 'Police Misconduct'
  ) {
    return 'safety';
  }
  if (c === 'Environment' || c === 'Fire & Environmental Hazards' || c === 'Water Related Violations') {
    return 'environment';
  }
  // Default to "community" for civic duty and everything else.
  return 'community';
}

function badgeBg(sev: Report['severity']): string {
  if (sev === 'Catastrophic') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  if (sev === 'Critical') return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
  return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30';
}

const MobileCommunityFeedView: React.FC<MobileCommunityFeedViewProps> = ({
  reports,
  onNavigate,
  onOpenIncidentRoom,
  onCreatePost,
}) => {
  const [feedCategory, setFeedCategory] = useState<FeedCategory>('any');
  const [urgency, setUrgency] = useState<FeedUrgency>('any');
  const [layoutMode, setLayoutMode] = useState<'list' | 'map'>('list');
  const [sortMode, setSortMode] = useState<'hot' | 'near'>('hot');

  const filtered = useMemo(() => {
    let list = [...reports].sort((a, b) => {
      const at = new Date(a.timestamp as any).getTime();
      const bt = new Date(b.timestamp as any).getTime();
      if (Number.isNaN(at) || Number.isNaN(bt)) return 0;
      return bt - at;
    });

    if (sortMode === 'near') {
      // Client-only: rotate ordering to feel like "nearby" without geo computations.
      list = list.reverse();
    }

    if (feedCategory !== 'any') {
      list = list.filter((r) => categoryGroup(r) === feedCategory);
    }

    if (urgency === 'urgent') {
      list = list.filter((r) => isUrgent(r));
    }

    return list;
  }, [reports, feedCategory, urgency, sortMode]);

  const chipStyle =
    'h-[36px] px-[12px] rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-300 text-[12px] font-bold touch-manipulation';

  return (
    <div
      className="relative w-[390px] h-[844px] mx-auto bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-100 overflow-hidden"
      style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}
    >
      <style>{clampLinesStyles}</style>

      {/* Header: 390x68 */}
      <header className="h-[68px] flex items-center justify-between px-[16px] border-b border-zinc-800 bg-zinc-950/80">
        <button
          type="button"
          onClick={() => onNavigate('mainMenu')}
          className="w-[40px] h-[40px] rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 flex items-center justify-center touch-manipulation"
          aria-label="Menu"
        >
          <List className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-[10px]">
          <div className="w-[36px] h-[36px] rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="text-[15px] font-black tracking-tight text-white">DPAL</div>
        </div>

        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={() => setSortMode((p) => (p === 'hot' ? 'near' : 'hot'))}
            className="w-[40px] h-[40px] rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 flex items-center justify-center touch-manipulation"
            aria-label="Sort"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('heroHub')}
            className="w-[40px] h-[40px] rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 flex items-center justify-center touch-manipulation"
            aria-label="Profile"
          >
            <UserCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Ticker: 390x38 */}
      <div className="h-[38px] px-[16px] flex items-center border-b border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center overflow-hidden w-full">
          <div className="flex items-center gap-[14px] whitespace-nowrap text-[12px] font-bold text-emerald-200/90 ticker-anim">
            <span className="text-emerald-300">LIVE</span>
            <span>Community updates</span>
            <span className="text-zinc-400">•</span>
            <span>Verified signals</span>
            <span className="text-zinc-400">•</span>
            <span>Send facts to the ledger</span>
            <span className="text-zinc-400">•</span>
            <span>Community updates</span>
            <span className="text-zinc-400">•</span>
          </div>
        </div>
      </div>

      {/* Keyframes for ticker */}
      <style>{`
        @keyframes dpalTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33%); }
        }
        .ticker-anim { animation: dpalTicker 14s linear infinite; }
      `}</style>

      {/* Controls Row: 390x58 */}
      <div className="h-[58px] px-[16px] flex items-center gap-[8px]">
        <button
          type="button"
          className="w-[148px] h-[38px] rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-100 font-black text-[12px] touch-manipulation shadow-[0_0_18px_rgba(16,185,129,0.18)]"
          aria-current="page"
        >
          Community Stories
        </button>

        <button
          type="button"
          onClick={() => setSortMode((p) => (p === 'hot' ? 'near' : 'hot'))}
          className="w-[64px] h-[38px] rounded-full bg-zinc-900/40 border border-zinc-800 text-zinc-300 font-black text-[12px] touch-manipulation"
          aria-label="Sort"
        >
          {sortMode === 'hot' ? 'Hot' : 'Near'}
        </button>

        <button
          type="button"
          onClick={() => setLayoutMode((p) => (p === 'list' ? 'map' : 'list'))}
          className="w-[78px] h-[38px] rounded-full bg-zinc-900/40 border border-zinc-800 text-zinc-300 font-black text-[12px] touch-manipulation flex items-center justify-center gap-[8px]"
          aria-label="Map or list toggle"
        >
          <MapIcon className="w-4 h-4" />
          <span className="truncate">{layoutMode === 'list' ? 'List' : 'Map'}</span>
        </button>

        <button
          type="button"
          onClick={() => setUrgency((p) => (p === 'any' ? 'urgent' : 'any'))}
          className="w-[44px] h-[38px] rounded-full bg-zinc-900/40 border border-zinc-800 text-zinc-300 touch-manipulation flex items-center justify-center"
          aria-label="Nearby"
        >
          <Crosshair className="w-5 h-5 text-cyan-200" />
        </button>
      </div>

      {/* Chip Row: 390x52 */}
      <div className="h-[52px] px-[16px] flex items-center gap-[8px] border-b border-zinc-800">
        <div className="flex items-center gap-[8px] overflow-x-auto no-scrollbar w-full">
          <button
            type="button"
            onClick={() => setFeedCategory('any')}
            className={`${chipStyle} ${feedCategory === 'any' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200' : ''}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFeedCategory('safety')}
            className={`${chipStyle} ${feedCategory === 'safety' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200' : ''}`}
          >
            Safety
          </button>
          <button
            type="button"
            onClick={() => setFeedCategory('environment')}
            className={`${chipStyle} ${feedCategory === 'environment' ? 'bg-amber-500/15 border-amber-500/40 text-amber-200' : ''}`}
          >
            Environment
          </button>
          <button
            type="button"
            onClick={() => setFeedCategory('community')}
            className={`${chipStyle} ${feedCategory === 'community' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' : ''}`}
          >
            Community
          </button>
          <button
            type="button"
            onClick={() => setUrgency((p) => (p === 'any' ? 'urgent' : 'any'))}
            className={`${chipStyle} ${urgency === 'urgent' ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' : ''}`}
          >
            Urgent
          </button>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="h-[8px]" />

      {/* Quick Post Card: x16 y224 w358 h84 */}
      <div className="px-[16px]">
        <div className="h-[84px] rounded-[22px] border border-zinc-800 bg-zinc-900/40 shadow-[0_8px_22px_rgba(0,0,0,0.25)] p-[14px] flex items-center gap-[12px]">
          <div className="w-[40px] h-[40px] rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-200 font-black">
            <Megaphone className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-black text-white">Start a community update</div>
            <div className="text-[12px] text-zinc-300 dpal-line-clamp-2 leading-[1.25]">
              Share what you saw, found, or fixed. Verified reports help neighbors act faster.
            </div>
          </div>

          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={onCreatePost}
              className="w-[40px] h-[40px] rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center touch-manipulation"
              aria-label="Add photo"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onCreatePost}
              className="w-[40px] h-[40px] rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center touch-manipulation"
              aria-label="Record voice"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="h-[12px]" />

      {/* Scrollable Feed Area (starts at y320) */}
      <div className="flex-1 overflow-y-auto px-[16px] pb-[90px]">
        <div className="flex flex-col gap-[14px]">
          {filtered.length === 0 ? (
            <div className="text-center text-zinc-500 font-bold text-[13px] py-[32px]">
              No community posts found.
            </div>
          ) : (
            filtered.map((report) => {
              const avatarChar = (report.location || 'D').toString().trim().slice(0, 1).toUpperCase();
              const imgUrl = report.imageUrls?.[0] || `https://picsum.photos/seed/${report.id}/600/400`;
              const urgent = isUrgent(report);
              const urgencyLabel = urgent ? 'Urgent' : 'Normal';
              const locationText = (report.location || 'Unknown').toString();
              const timeText = formatTime(report.timestamp);
              const distanceText = formatDistance(report);

              return (
                <article
                  key={report.id}
                  className="rounded-[22px] border border-zinc-800 bg-zinc-900/35 shadow-[0_8px_22px_rgba(0,0,0,0.22)] overflow-hidden touch-manipulation"
                >
                  <div className="p-[14px] space-y-[12px]">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-[10px]">
                      <div className="flex items-center gap-[10px] min-w-0">
                        <div className="w-[40px] h-[40px] rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-200 font-black">
                          {avatarChar}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-black text-white dpal-line-clamp-1">
                            {report.category}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-bold dpal-line-clamp-1">
                            {layoutMode === 'map' ? 'Nearby signals' : 'Community source'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="w-[36px] h-[36px] rounded-full bg-zinc-800/60 border border-zinc-700 text-zinc-200 flex items-center justify-center touch-manipulation"
                        aria-label="More"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Tag row */}
                    <div className="flex items-center gap-[8px] flex-wrap">
                      <span className="h-[26px] px-[10px] rounded-full border border-zinc-800 bg-zinc-800/40 text-zinc-200 text-[11px] font-black">
                        {report.category}
                      </span>
                      <span className={`h-[26px] px-[10px] rounded-full border ${badgeBg(report.severity)} text-[11px] font-black flex items-center gap-[6px]`}>
                        <span className={`w-[6px] h-[6px] rounded-full ${urgent ? 'bg-rose-400' : 'bg-emerald-300'}`} />
                        {urgencyLabel}
                      </span>
                    </div>

                    {/* Main image area: 330x180 */}
                    <div className="w-full h-[180px] rounded-[14px] overflow-hidden border border-zinc-800 bg-zinc-950">
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </div>

                    {/* Bold title */}
                    <div className="text-[14px] font-black text-white dpal-line-clamp-2">
                      {report.title || 'Community update'}
                    </div>

                    {/* Short description (2-3 lines) */}
                    <div className="text-[12px] text-zinc-300 leading-[1.35] dpal-line-clamp-3">
                      {report.description || 'A neighbor shared a verified signal. Stay safe and share what you know.'}
                    </div>

                    {/* Metadata row */}
                    <div className="flex items-center justify-between gap-[10px] text-[11px] text-zinc-400 font-bold">
                      <div className="flex items-center gap-[8px] min-w-0">
                        <MapPin className="w-4 h-4 text-cyan-200" />
                        <span className="truncate">{locationText}</span>
                      </div>
                      <div className="flex items-center gap-[8px]">
                        <Clock className="w-4 h-4 text-emerald-200" />
                        <span>{timeText}</span>
                      </div>
                      <div className="flex items-center gap-[8px]">
                        <Crosshair className="w-4 h-4 text-zinc-400" />
                        <span>{distanceText}</span>
                      </div>
                    </div>

                    {/* Bottom action row */}
                    <div className="grid grid-cols-4 gap-[10px] pt-[6px]">
                      <button
                        type="button"
                        onClick={() => onOpenIncidentRoom(report)}
                        className="flex flex-col items-center gap-[6px] text-[11px] font-black text-zinc-200 touch-manipulation"
                        aria-label="Support"
                      >
                        <Heart className="w-5 h-5 text-rose-300" />
                        <span className="leading-none">Support</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenIncidentRoom(report)}
                        className="flex flex-col items-center gap-[6px] text-[11px] font-black text-zinc-200 touch-manipulation"
                        aria-label="Comment"
                      >
                        <MessageSquare className="w-5 h-5 text-cyan-200" />
                        <span className="leading-none">Comment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate('hub')}
                        className="flex flex-col items-center gap-[6px] text-[11px] font-black text-zinc-200 touch-manipulation"
                        aria-label="Share"
                      >
                        <Link className="w-5 h-5 text-amber-200" />
                        <span className="leading-none">Share</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate('transparencyDatabase')}
                        className="flex flex-col items-center gap-[6px] text-[11px] font-black text-zinc-200 touch-manipulation"
                        aria-label="Send to Ledger"
                      >
                        <Send className="w-5 h-5 text-emerald-200" />
                        <span className="leading-none text-[10px] text-center">Send to Ledger</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Action Button: x316 y700 w58 h58 */}
      <button
        type="button"
        onClick={onCreatePost}
        className="absolute right-[16px] top-[700px] w-[58px] h-[58px] rounded-full bg-gradient-to-br from-emerald-500 to-cyan-400 shadow-[0_18px_40px_rgba(34,211,238,0.25)] border border-emerald-400/50 flex items-center justify-center touch-manipulation"
        aria-label="Create post"
      >
        <PlusCircle className="w-7 h-7 text-white" />
      </button>

      {/* Bottom Navigation: y760 height 84 */}
      <nav className="absolute bottom-0 left-0 right-0 h-[84px] bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-md">
        <div className="h-full flex items-center justify-around px-[10px]">
          {(
            [
              { key: 'home', label: 'Home', icon: Home, view: 'mainMenu' as const },
              { key: 'feed', label: 'Feed', icon: List, view: 'hub' as const },
              { key: 'locator', label: 'Locator', icon: MapIcon, view: 'dpalLocator' as const },
              { key: 'ledger', label: 'Ledger', icon: Database, view: 'transparencyDatabase' as const },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = item.key === 'feed';
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.view)}
                className="flex flex-col items-center justify-center gap-[6px] w-[70px] touch-manipulation"
                aria-label={item.label}
              >
                <span
                  className={`w-[38px] h-[38px] rounded-full flex items-center justify-center border ${
                    isActive ? 'bg-cyan-500/15 border-cyan-500/40' : 'bg-zinc-900/40 border-zinc-800'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-cyan-200' : 'text-zinc-500'}`} />
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-cyan-200' : 'text-zinc-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MobileCommunityFeedView;

