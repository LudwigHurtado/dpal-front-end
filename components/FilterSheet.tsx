import React, { useEffect } from 'react';
import { X } from './icons';
import FilterPanel from './FilterPanel';
import type { Category } from '../types';
import type { Hero, Report } from '../types';

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: { keyword: string; selectedCategories: Category[]; location: string };
  setFilters: React.Dispatch<React.SetStateAction<{ keyword: string; selectedCategories: Category[]; location: string }>>;
  onAnalyzeFeed: () => void;
  isAnalyzing: boolean;
  reportCount: number;
  hero: Hero;
  reports: Report[];
  onJoinReportChat?: (report: Report) => void;
  onAddNewReport?: () => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({
  open,
  onClose,
  filters,
  setFilters,
  onAnalyzeFeed,
  isAnalyzing,
  reportCount,
  hero,
  reports,
  onJoinReportChat,
  onAddNewReport,
}) => {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-[160] md:hidden max-h-[90vh] rounded-t-3xl border-t border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Filters &amp; Map</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            onAnalyzeFeed={() => { onAnalyzeFeed(); onClose(); }}
            isAnalyzing={isAnalyzing}
            reportCount={reportCount}
            hero={hero}
            reports={reports}
            onJoinReportChat={r => { onJoinReportChat?.(r); onClose(); }}
            onAddNewReport={() => { onAddNewReport?.(); onClose(); }}
          />
        </div>
      </div>
      <style>{`
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.8; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default FilterSheet;
