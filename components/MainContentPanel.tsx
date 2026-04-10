
import React, { useState, useEffect } from 'react';
import type { Report, FeedAnalysis } from '../types';
import FeedPanel from './FeedPanel';
import MyReportsList from './MyReportsList';
import CommunityWorkFeed from './CommunityWorkFeed';
import MapHubView from './MapHubView';
import { useTranslations } from '../i18n';
import { User, List, ArrowLeft, Zap, ShieldCheck, Activity, ListFilter, Map } from './icons';
import { type HubTab } from '../App';

interface MainContentPanelProps {
  reports: Report[];
  filteredReports: Report[];
  analysis: FeedAnalysis | null;
  analysisError: string | null;
  onCloseAnalysis: () => void;
  onAddReportImage: (reportId: string, imageUrl: string) => void;
  onReturnToMainMenu: () => void;
  onJoinReportChat: (report: Report) => void;
  onEnterMissionV2?: (report: Report) => void;
  activeTab: HubTab;
  setActiveTab: (tab: HubTab) => void;
  onAddNewReport: () => void;
  onOpenFilters?: () => void;
  /** Optional location for Map tab center (e.g. from filters). */
  mapCenter?: string;
}

const MainContentPanel: React.FC<MainContentPanelProps> = ({ reports, filteredReports, onReturnToMainMenu, onJoinReportChat, onEnterMissionV2, activeTab, setActiveTab, onAddNewReport, mapCenter, onOpenFilters, ...rest }) => {
  const { t } = useTranslations();
  
  const tabs = [
    { id: 'my_reports', label: t('mainContent.myReports'), icon: User },
    { id: 'community', label: t('mainContent.communityFeed'), icon: List },
    { id: 'work_feed', label: 'Community Timeline', icon: Activity },
    { id: 'map', label: 'Map', icon: Map },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'my_reports':
        return (
          <MyReportsList
            reports={reports}
            onJoinReportChat={onJoinReportChat}
            onAddNewReport={onAddNewReport}
            onReturnHome={onReturnToMainMenu}
            onOpenCommunityFeed={() => setActiveTab('community')}
          />
        );
      case 'community':
        return <FeedPanel reports={filteredReports} onJoinReportChat={onJoinReportChat} onEnterMissionV2={onEnterMissionV2} {...rest} />;
      case 'work_feed':
        return <CommunityWorkFeed />;
      case 'map':
        return <MapHubView onReturnToMainMenu={onReturnToMainMenu} onOpenFilters={onOpenFilters} mapCenter={mapCenter} />;
      default:
        return null;
    }
  };

  const isMyReports = activeTab === 'my_reports';

  return (
    <div className={`space-y-8 animate-fade-in ${isMyReports ? 'font-sans' : 'font-mono'}`}>
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <button
            onClick={onReturnToMainMenu}
            className={`inline-flex items-center space-x-3 transition-colors group ${
              isMyReports
                ? 'text-sm font-medium dpal-text-muted hover:text-[var(--dpal-info)]'
                : 'text-[10px] font-black uppercase tracking-[0.3em] dpal-text-muted hover:text-cyan-400'
            }`}
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Return Home</span>
          </button>
          <div className="flex items-center gap-3">
            {onOpenFilters && (
              <button
                onClick={onOpenFilters}
                className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl bg-[var(--dpal-surface-alt)] border dpal-border-emphasis text-[10px] font-black uppercase tracking-wider dpal-text-secondary hover:border-cyan-500/50 hover:text-cyan-400 transition-colors lg:hidden"
                aria-label="Open filters"
              >
                <ListFilter className="w-4 h-4" />
                <span>Filters</span>
              </button>
            )}
            {!isMyReports && (
              <div className="flex items-center space-x-2 text-[8px] font-black dpal-text-muted uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
                <span>Positive Impact</span>
              </div>
            )}
          </div>
       </div>

      <div className="dpal-tab-rail overflow-x-auto no-scrollbar justify-start">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as HubTab)}
              className={`flex-shrink-0 min-w-max flex items-center justify-center space-x-3 py-2.5 px-4 md:px-6 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                isActive
                ? 'bg-cyan-600 text-white shadow-[0_0_25px_rgba(6,182,212,0.3)] border-t border-cyan-400/30'
                : 'dpal-text-muted hover:bg-[var(--dpal-surface-alt)] hover:text-[var(--dpal-text-secondary)]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in relative min-h-[60vh]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.05),transparent_50%)] pointer-events-none"></div>
        {renderContent()}
      </div>
       <style>{`
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MainContentPanel;
