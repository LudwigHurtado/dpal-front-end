/// <reference types="vite/client" />

import './styles/mobile-theme.css';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import MainContentPanel from './components/MainContentPanel';
import HeroHub from './components/HeroHub';
import MainMenu from './components/MainMenu';
import CategorySelectionView from './components/CategorySelectionView';
import ReportSubmissionView from './components/ReportSubmissionView';
import ReportCompleteView from './components/ReportCompleteView';
import ReputationAndCurrencyView from './components/ReputationAndCurrencyView';
import PaymentView from './components/PaymentView';
import MissionDetailView from './components/MissionDetailView';
import MissionCompleteView from './components/MissionCompleteView';
import LiveIntelligenceView from './components/LiveIntelligenceView';
import GenerateMissionView from './components/GenerateMissionView';
import TrainingHolodeckView from './components/TrainingHolodeckView';
import TacticalVault from './components/TacticalVault';
import TransparencyDatabaseView from './components/TransparencyDatabaseView';
import AiRegulationHub from './components/AiRegulationHub';
import IncidentRoomView from './components/IncidentRoomView';
import TacticalHeatmap from './components/TacticalHeatmap';
import TeamOpsView from './components/TeamOpsView';
import MedicalOutpostView from './components/MedicalOutpostView';
import AcademyView from './components/AcademyView';
import LedgerScanner from './components/LedgerScanner';
import AiWorkDirectivesView from './components/AiWorkDirectivesView';
import OutreachEscalationHub from './components/OutreachEscalationHub';
import EcosystemOverview from './components/EcosystemOverview';
import SustainmentCenter from './components/SustainmentCenter';
import SubscriptionView from './components/SubscriptionView';
import AiSetupView from './components/AiSetupView';
import FieldMissionsView from './components/FieldMissionsView';
import { Category, SubscriptionTier, type Report, type Mission, type FeedAnalysis, type Hero, type Rank, SkillLevel, type EducationRole, NftRarity, IapPack, StoreItem, NftTheme, type ChatMessage, IntelItem, type HeroPersona, type TacticalDossier, type TeamMessage, type HealthRecord, Archetype, type SkillType, type AiDirective, SimulationMode, type MissionCompletionSummary, MissionApproach, MissionGoal } from './types';
import { MOCK_REPORTS, INITIAL_HERO_PROFILE, RANKS, IAP_PACKS, STORE_ITEMS, STARTER_MISSION, getStoredHomeLayout, HOME_LAYOUT_STORAGE_KEY, getApiBase } from './constants';
import type { HomeLayout } from './constants';
import BottomNav from './components/BottomNav';
import FilterSheet from './components/FilterSheet';
import { generateNftImage, generateHeroPersonaImage, generateHeroPersonaDetails, generateNftDetails, generateHeroBackstory, generateMissionFromIntel, isAiEnabled } from './services/geminiService';
import { useTranslations } from './i18n';

export type View = 'mainMenu' | 'categorySelection' | 'hub' | 'heroHub' | 'educationRoleSelection' | 'reportSubmission' | 'missionComplete' | 'reputationAndCurrency' | 'store' | 'reportComplete' | 'liveIntelligence' | 'missionDetail' | 'appLiveIntelligence' | 'generateMission' | 'trainingHolodeck' | 'tacticalVault' | 'transparencyDatabase' | 'aiRegulationHub' | 'incidentRoom' | 'threatMap' | 'teamOps' | 'medicalOutpost' | 'academy' | 'aiWorkDirectives' | 'outreachEscalation' | 'ecosystem' | 'sustainmentCenter' | 'subscription' | 'aiSetup' | 'fieldMissions';

/** Beacon published to the map for others to see (location shared with group) */
export interface FieldBeacon {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
  isOwn: boolean;
  timestamp: number;
}
export type TextScale = 'standard' | 'large' | 'ultra' | 'magnified';

// ✅ ADD: strict tab types (removes `any`)
export type HeroHubTab =
  | 'profile'
  | 'missions'
  | 'skills'
  | 'training'
  | 'briefing'
  | 'collection'
  | 'mint'
  | 'store'
  | 'vault';

export type HubTab =
  | 'my_reports'
  | 'community'
  | 'work_feed'
  | 'map';

console.log("AI enabled?", Boolean(import.meta.env.VITE_GEMINI_API_KEY));
console.log("API base:", import.meta.env.VITE_API_BASE);

const isMobileDeviceProfile = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);
};

const DEVICE_PROFILE = isMobileDeviceProfile() ? 'mobile' : 'desktop';
const scopedKey = (key: string) => `dpal-${DEVICE_PROFILE}-${key}`;

const getScopedItem = (key: string, legacyKey?: string): string | null => {
  const next = localStorage.getItem(scopedKey(key));
  if (next !== null) return next;
  if (legacyKey) return localStorage.getItem(legacyKey);
  return null;
};

const setScopedItem = (key: string, value: string) => {
  localStorage.setItem(scopedKey(key), value);
};

const getInitialReports = (): Report[] => {
  const normalizeReport = (r: any): Report => {
    const parsedTs = new Date(r?.timestamp);
    const safeTs = Number.isNaN(parsedTs.getTime()) ? new Date() : parsedTs;

    return {
      ...r,
      id: r?.id || `rep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: typeof r?.title === 'string' ? r.title : 'Untitled Report',
      description: typeof r?.description === 'string' ? r.description : '',
      location: typeof r?.location === 'string' ? r.location : 'Unknown',
      category: r?.category || Category.Other,
      timestamp: safeTs,
      severity: r?.severity || 'Standard',
      status: r?.status || 'Submitted',
      trustScore: typeof r?.trustScore === 'number' ? r.trustScore : 70,
    } as Report;
  };

  const saved = getScopedItem('reports');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((r: any) => normalizeReport({
          ...r,
          anchoredAt: r?.anchoredAt ? new Date(r.anchoredAt) : undefined,
        }));
      }
      return MOCK_REPORTS.map(normalizeReport);
    } catch (e) {
      return MOCK_REPORTS.map(normalizeReport);
    }
  }
  return MOCK_REPORTS.map(normalizeReport);
};

const getInitialMissions = (): Mission[] => {
  const saved = getScopedItem('missions');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((m: any) => ({
        ...m,
        reconActions: m.reconActions || [],
        mainActions: m.mainActions || (m.steps || []).map((s: any, i: number) => ({
            id: `act-${i}`,
            name: s.name,
            task: s.task,
            icon: s.icon,
            whyItMatters: "Essential field requirement.",
            priority: s.priority || 'Medium',
            isComplete: s.isComplete || false,
            /** FIX: Removed invalid properties 'requiredChecks', 'riskChecks', 'evidenceRequired' and added required 'prompts' */
            prompts: s.prompts || [
                { id: `p-${i}-1`, type: 'confirmation', promptText: 'Standard field verification', required: true, responseType: 'checkbox', storedAs: { entity: 'missionLog', field: 'verified' } }
            ],
            impactedSkills: ['Technical', 'Civic']
        })),
        phase: m.phase || (m.status === 'completed' ? 'COMPLETED' : 'OPERATION'),
        currentActionIndex: m.currentActionIndex || 0
      }));
    } catch (e) { return []; }
  }
  return [];
};

const getInitialHero = (): Hero => {
  const saved = getScopedItem('hero');
  let base: Hero;
  if (saved) {
    try {
      base = JSON.parse(saved);
    } catch {
      base = INITIAL_HERO_PROFILE;
    }
  } else {
    base = INITIAL_HERO_PROFILE;
  }

  // Ensure testers always have enough Hero Credits to mint
  const MIN_HERO_CREDITS = 100_000;
  if (typeof base.heroCredits !== 'number' || base.heroCredits < MIN_HERO_CREDITS) {
    base = { ...base, heroCredits: MIN_HERO_CREDITS };
  }

  return base;
};

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>(getInitialReports);
  const [currentView, setCurrentView] = useState<View>('mainMenu');
  const [prevView, setPrevView] = useState<View>('mainMenu');
  const [heroHubTab, setHeroHubTab] = useState<HeroHubTab>('profile');
  const [hubTab, setHubTab] = useState<HubTab>('my_reports');
  const [homeLayout, setHomeLayout] = useState<HomeLayout>(() => {
    const savedLayout = getScopedItem('home-layout', HOME_LAYOUT_STORAGE_KEY);
    if (savedLayout === 'feed' || savedLayout === 'map' || savedLayout === 'categories') return savedLayout;
    return getStoredHomeLayout();
  });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', selectedCategories: [] as Category[], location: '', });

  const [selectedCategoryForSubmission, setSelectedCategoryForSubmission] = useState<Category | null>(null);
  const [selectedIntelForMission, setSelectedIntelForMission] = useState<IntelItem | null>(null);
  const [initialCategoriesForIntel, setInitialCategoriesForIntel] = useState<Category[]>([]);
  
  const [missions, setMissions] = useState<Mission[]>(getInitialMissions);
  const [hero, setHero] = useState<Hero>(getInitialHero);
  const [heroLocation, setHeroLocation] = useState<string>('');
  const [completedReport, setCompletedReport] = useState<Report | null>(null);
  const [completedMissionSummary, setCompletedMissionSummary] = useState<MissionCompletionSummary | null>(null);
  const [itemForPayment, setItemForPayment] = useState<IapPack | StoreItem | null>(null);
  const [selectedMissionForDetail, setSelectedMissionForDetail] = useState<Mission | null>(null);
  const [selectedReportForIncidentRoom, setSelectedReportForIncidentRoom] = useState<Report | null>(null);
  const [fieldBeacons, setFieldBeacons] = useState<FieldBeacon[]>([]);
  const [globalTextScale, setGlobalTextScale] = useState<TextScale>('standard');
  const [isOfflineMode, setIsOfflineMode] = useState(() => getScopedItem('offline-mode') === 'true');
  const [directives, setDirectives] = useState<AiDirective[]>(() => {
    const saved = getScopedItem('directives');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  /* Mobile: single layout for all viewports; hide header on small screens for space */
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const useMobileLayout = isMobileViewport;

  useEffect(() => { setScopedItem('offline-mode', String(isOfflineMode)); }, [isOfflineMode]);

  useEffect(() => {
    document.documentElement.classList.remove('scale-standard', 'scale-large', 'scale-ultra', 'scale-magnified');
    document.documentElement.classList.add(`scale-${globalTextScale}`);
  }, [globalTextScale]);

  useEffect(() => {
    setScopedItem('hero', JSON.stringify(hero));
    setScopedItem('reports', JSON.stringify(reports));
    setScopedItem('missions', JSON.stringify(missions));
    setScopedItem('directives', JSON.stringify(directives));
  }, [hero, reports, missions, directives]);

  useEffect(() => {
    setScopedItem('home-layout', homeLayout);
  }, [homeLayout]);

  useEffect(() => {
    if (currentView !== 'hub') setFilterSheetOpen(false);
  }, [currentView]);

  const heroWithRank = useMemo((): Hero => {
    let currentRank: Rank = RANKS[0];
    for (const rank of RANKS) { if (hero.xp >= rank.xpNeeded) currentRank = rank; else break; }
    return { ...hero, rank: currentRank.level, title: hero.equippedTitle || currentRank.title };
  }, [hero]);

  const latestAnchoredReport = useMemo(() => {
    return reports.find(r => Boolean(r.hash || r.txHash || r.blockNumber));
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const title = (report.title || '').toString().toLowerCase();
      const description = (report.description || '').toString().toLowerCase();
      const location = (report.location || '').toString().toLowerCase();

      const keyword = (filters.keyword || '').toLowerCase();
      const locationFilter = (filters.location || '').toLowerCase();

      const matchesKeyword = !keyword || title.includes(keyword) || description.includes(keyword);
      const matchesCategory = filters.selectedCategories.length === 0 || filters.selectedCategories.includes(report.category);
      const matchesLocation = !locationFilter || location.includes(locationFilter);

      return matchesKeyword && matchesCategory && matchesLocation;
    });
  }, [reports, filters]);

  const handleNavigate = (
    view: View,
    category?: Category,
    targetTab?: HeroHubTab | HubTab
  ) => {
    const aiViews: View[] = ['liveIntelligence', 'generateMission', 'trainingHolodeck', 'aiWorkDirectives'];
    if (aiViews.includes(view) && !isAiEnabled() && !isOfflineMode) {
        setPrevView(currentView);
        setCurrentView('aiSetup');
        return;
    }
    setPrevView(currentView);
    if (category) { 
        setSelectedCategoryForSubmission(category); 
        setCurrentView('reportSubmission'); 
    } 
    else { 
        // ✅ SAFE hero hub navigation
        if (view === 'heroHub') {
          const allowedHeroTabs: HeroHubTab[] = [
            'profile',
            'missions',
            'skills',
            'training',
            'briefing',
            'collection',
            'mint',
            'store',
            'vault',
          ];

          if (targetTab && allowedHeroTabs.includes(targetTab as HeroHubTab)) {
            setHeroHubTab(targetTab as HeroHubTab);
          } else {
            // fallback instead of black screen
            setHeroHubTab('profile');
          }
        }

        // ✅ SAFE hub navigation
        if (view === 'hub') {
          const allowedHubTabs: HubTab[] = ['my_reports', 'community', 'work_feed', 'map'];
          if (targetTab && allowedHubTabs.includes(targetTab as HubTab)) {
            setHubTab(targetTab as HubTab);
          } else {
            setHubTab('my_reports');
          }
        }
        setCurrentView(view); 
    }
  };

  const handleCompleteMissionStep = (m: Mission) => {
    const actions = m.phase === 'RECON' ? m.reconActions : m.mainActions;
    const nextIdx = m.currentActionIndex + 1;

    if (nextIdx >= actions.length) {
        if (m.phase === 'RECON') {
            const updated = { ...m, phase: 'OPERATION' as const, currentActionIndex: 0 };
            setMissions(prev => prev.map(mi => mi.id === m.id ? updated : mi));
            setSelectedMissionForDetail(updated);
        } else {
            setMissions(prev => prev.map(mi => mi.id === m.id ? { ...mi, phase: 'COMPLETED', status: 'completed' } : mi));
            setHero(prev => ({ ...prev, heroCredits: prev.heroCredits + m.finalReward.hc, xp: prev.xp + 500 }));
            setCompletedMissionSummary({ title: m.title, rewardHeroCredits: m.finalReward.hc, rewardNft: m.finalReward.nft });
            setCurrentView('missionComplete');
        }
    } else {
        const updated = { ...m, currentActionIndex: nextIdx };
        setMissions(prev => prev.map(mi => mi.id === m.id ? updated : mi));
        setSelectedMissionForDetail(updated);
    }
  };

  const handleAddHeroPersona = async (desc: string, arch: Archetype, sourceImage?: string) => {
    const details = await generateHeroPersonaDetails(desc, arch);
    const imageUrl = await generateHeroPersonaImage(desc, arch, sourceImage);
    const newPersona: HeroPersona = { id: `persona-${Date.now()}`, name: details.name, backstory: details.backstory, combatStyle: details.combatStyle, imageUrl, prompt: desc, archetype: arch };
    setHero(prev => ({ ...prev, personas: [...prev.personas, newPersona], equippedPersonaId: prev.equippedPersonaId || newPersona.id }));
  };

  const handleAddReport = async (rep: any) => {
    const reportId = `rep-${Date.now()}`;

    let anchored: {
      reportHash?: string;
      txHash?: string;
      blockNumber?: number;
      chain?: string;
      anchoredAt?: string;
    } = {};

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/reports/anchor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, ...rep }),
      });

      if (response.ok) {
        const data = await response.json();
        anchored = {
          reportHash: data?.reportHash,
          txHash: data?.txHash,
          blockNumber: data?.blockNumber,
          chain: data?.chain,
          anchoredAt: data?.anchoredAt,
        };
      }
    } catch (error) {
      console.warn('Anchor API unavailable, using local fallback:', error);
    }

    const fallbackTxHash = `0x${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
    const finalReport: Report = {
      ...rep,
      id: reportId,
      timestamp: new Date(),
      hash: anchored.reportHash || `0x${Math.random().toString(16).slice(2)}`,
      blockchainRef: anchored.txHash || fallbackTxHash,
      txHash: anchored.txHash || fallbackTxHash,
      blockNumber: anchored.blockNumber,
      chain: anchored.chain || 'DPAL_INTERNAL',
      anchoredAt: anchored.anchoredAt ? new Date(anchored.anchoredAt) : new Date(),
      isAuthor: true,
      status: 'Submitted'
    };

    setReports(prev => [finalReport, ...prev]);
    setCompletedReport(finalReport);
    setCurrentView('reportComplete');
  };

  const handleCompleteDirective = (directive: AiDirective): Report => {
    // Calculate total compensation from phases
    const totalHc = directive.phases?.reduce((sum, phase) => sum + phase.compensation.hc, 0) || directive.rewardHc;
    const totalXp = directive.phases?.reduce((sum, phase) => sum + phase.compensation.xp, 0) || directive.rewardXp;

    // Update hero credits and XP
    setHero(prev => ({
      ...prev,
      heroCredits: (prev.heroCredits || 0) + totalHc,
      xp: (prev.xp || 0) + totalXp,
    }));

    // Mark directive as completed
    const updatedDirective: AiDirective = {
      ...directive,
      status: 'completed',
      rewardHc: totalHc,
      rewardXp: totalXp,
    };
    setDirectives(prev => prev.map(d => d.id === directive.id ? updatedDirective : d));

    // Create a Report from the completed directive
    const reportId = `dir-${directive.id}`;
    const report: Report = {
      id: reportId,
      title: `Work Directive: ${directive.title}`,
      description: directive.description,
      category: directive.category,
      location: heroLocation || 'Unknown',
      timestamp: new Date(),
      hash: directive.auditHash || `0x${Math.random().toString(16).slice(2)}`,
      blockchainRef: directive.auditHash || '',
      isAuthor: true,
      status: 'Submitted',
      trustScore: 100,
      severity: 'Informational',
      isActionable: false,
      credsEarned: totalHc,
      imageUrls: directive.proofImageUrl ? [directive.proofImageUrl] : undefined,
    };

    setReports(prev => [report, ...prev]);
    return report;
  };

  return (
    <div className="min-h-screen flex flex-col transition-all duration-300 bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {!useMobileLayout && (
        <Header 
          onNavigateToHeroHub={() => handleNavigate('heroHub', undefined, 'profile')} 
          onNavigateHome={() => setCurrentView('mainMenu')} 
          onNavigateToReputationAndCurrency={() => setCurrentView('reputationAndCurrency')} 
          onNavigateMissions={() => handleNavigate('liveIntelligence')} 
          onNavigate={handleNavigate} 
          hero={heroWithRank} 
          textScale={globalTextScale} 
          setTextScale={setGlobalTextScale}
        />
      )}
      
      <main className={`container mx-auto px-4 flex-grow relative z-10 ${useMobileLayout ? 'pt-4 pb-24' : 'py-8'} ${['mainMenu', 'hub', 'categorySelection', 'heroHub', 'transparencyDatabase', 'fieldMissions'].includes(currentView) ? 'pb-24' : ''}`}>
        {currentView === 'aiSetup' && (
          <AiSetupView onReturn={() => setCurrentView('mainMenu')} onEnableOfflineMode={() => { setIsOfflineMode(true); setCurrentView(prevView || 'mainMenu'); }} />
        )}
        
        {currentView === 'mainMenu' && (
          <MainMenu onNavigate={handleNavigate} totalReports={reports.length} latestHash={latestAnchoredReport?.hash || latestAnchoredReport?.txHash} latestBlockNumber={latestAnchoredReport?.blockNumber} onGenerateMissionForCategory={(cat) => { setInitialCategoriesForIntel([cat]); handleNavigate('liveIntelligence'); }} />
        )}

        {currentView === 'categorySelection' && (
          <CategorySelectionView 
            onSelectCategory={(cat) => handleNavigate('reportSubmission', cat)} 
            onSelectMissions={(cat) => { setInitialCategoriesForIntel([cat]); handleNavigate('liveIntelligence'); }} 
            onReturnToHub={() => setCurrentView('mainMenu')} 
          />
        )}

        {currentView === 'reportSubmission' && selectedCategoryForSubmission && (
          <ReportSubmissionView 
            category={selectedCategoryForSubmission} 
            role={null} 
            onReturn={() => setCurrentView('categorySelection')} 
            addReport={handleAddReport} 
            totalReports={reports.length} 
          />
        )}

        {currentView === 'reportComplete' && completedReport && (
          <ReportCompleteView report={completedReport} onReturn={() => setCurrentView('mainMenu')} onEnterSituationRoom={(r) => { setSelectedReportForIncidentRoom(r); setCurrentView('incidentRoom'); }} />
        )}

        {currentView === 'hub' && (
          <div className="space-y-6 md:space-y-10 min-h-0 flex flex-col">
            <LedgerScanner reports={reports} onTargetFound={(r) => { setSelectedReportForIncidentRoom(r); setCurrentView('incidentRoom'); }} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-1 min-h-0">
              <div className="w-full lg:col-span-8 min-h-[400px]">
                <MainContentPanel reports={reports} filteredReports={filteredReports} analysis={null} analysisError={null} onCloseAnalysis={() => {}} onAddReportImage={() => {}} onReturnToMainMenu={() => setCurrentView('mainMenu')} onJoinReportChat={(r) => { setSelectedReportForIncidentRoom(r); setCurrentView('incidentRoom'); }} activeTab={hubTab} setActiveTab={setHubTab} onAddNewReport={() => handleNavigate('categorySelection')} onOpenFilters={() => setFilterSheetOpen(true)} mapCenter={filters.location || undefined} />
              </div>
              <div className="hidden lg:block lg:col-span-4">
                <FilterPanel filters={filters} setFilters={setFilters} onAnalyzeFeed={() => handleNavigate('liveIntelligence')} isAnalyzing={false} reportCount={reports.length} hero={heroWithRank} reports={reports} onJoinReportChat={(r) => { setSelectedReportForIncidentRoom(r); setCurrentView('incidentRoom'); }} onAddNewReport={() => handleNavigate('categorySelection')} />
              </div>
            </div>
          </div>
        )}

        {currentView === 'hub' && filterSheetOpen && (
          <FilterSheet
            open={filterSheetOpen}
            onClose={() => setFilterSheetOpen(false)}
            filters={filters}
            setFilters={setFilters}
            onAnalyzeFeed={() => handleNavigate('liveIntelligence')}
            isAnalyzing={false}
            reportCount={reports.length}
            hero={heroWithRank}
            reports={reports}
            onJoinReportChat={(r) => { setSelectedReportForIncidentRoom(r); setCurrentView('incidentRoom'); }}
            onAddNewReport={() => handleNavigate('categorySelection')}
          />
        )}

        {currentView === 'liveIntelligence' && (
          <LiveIntelligenceView onReturn={() => setCurrentView(prevView === 'heroHub' ? 'heroHub' : 'mainMenu')} onGenerateMission={(intel) => { setSelectedIntelForMission(intel); setCurrentView('generateMission'); }} heroLocation={heroLocation} setHeroLocation={setHeroLocation} initialCategories={initialCategoriesForIntel} textScale={globalTextScale} />
        )}

        {currentView === 'generateMission' && selectedIntelForMission && (
          <GenerateMissionView intelItem={selectedIntelForMission} onReturn={() => handleNavigate('liveIntelligence')} onAcceptMission={async (intel, approach, goal) => {
              const m = await generateMissionFromIntel(intel, approach, goal);
              const structuredM: Mission = {
                  ...m,
                  id: `msn-${Date.now()}`,
                  phase: 'RECON',
                  currentActionIndex: 0,
                  status: 'active',
                  reconActions: [
                      /** FIX: Removed invalid properties 'requiredChecks', 'riskChecks', 'evidenceRequired' and added required 'prompts' */
                      { id: 'rec-1', name: 'Coordinate Survey', task: 'Verify geospatial center of target.', whyItMatters: "Ensures legal jurisdiction and node alignment.", icon: '🛰️', priority: 'High', isComplete: false, prompts: [{ id: 'p-rec-1', type: 'confirmation', promptText: 'GPS Link Verified', required: true, responseType: 'checkbox', storedAs: { entity: 'riskAssessment', field: 'gps_verified' } }], impactedSkills: ['Technical'] },
                      { id: 'rec-2', name: 'Strategic Mapping', task: 'Identify impacted citizens.', whyItMatters: "Quantifies community harm factor.", icon: '👥', priority: 'Medium', isComplete: false, prompts: [{ id: 'p-rec-2', type: 'observation', promptText: 'Sector count verified', required: true, responseType: 'text', storedAs: { entity: 'missionLog', field: 'impact_count' } }], impactedSkills: ['Empathy'] },
                  ],
                  mainActions: (m.steps || []).map((s: any, i: number) => ({
                      id: `act-${i}`,
                      name: s.name,
                      task: s.task,
                      whyItMatters: s.whyItMatters || "Primary field directive.",
                      icon: s.icon,
                      priority: s.priority || 'Medium',
                      isComplete: false,
                      /** FIX: Removed invalid properties 'requiredChecks', 'riskChecks', 'evidenceRequired' and added required 'prompts' */
                      prompts: s.prompts || [],
                      impactedSkills: ['Forensic', 'Tactical']
                  }))
              };
              setMissions(prev => [structuredM, ...prev]);
              handleNavigate('heroHub', undefined, 'missions');
          }} />
        )}

        {currentView === 'missionDetail' && selectedMissionForDetail && (
          <MissionDetailView mission={selectedMissionForDetail} onReturn={() => handleNavigate('heroHub', undefined, 'missions')} messages={[]} onSendMessage={() => {}} hero={heroWithRank} onCompleteMissionStep={handleCompleteMissionStep} />
        )}

        {currentView === 'missionComplete' && completedMissionSummary && (
          <MissionCompleteView mission={completedMissionSummary} onReturn={() => setCurrentView('mainMenu')} />
        )}

        {currentView === 'heroHub' && (
          <HeroHub onReturnToHub={() => setCurrentView('mainMenu')} missions={missions} isLoadingMissions={false} hero={heroWithRank} setHero={setHero} heroLocation={heroLocation} setHeroLocation={setHeroLocation} onGenerateNewMissions={() => {}} onMintNft={async () => ({} as any)} reports={reports} iapPacks={IAP_PACKS} storeItems={STORE_ITEMS} onInitiateHCPurchase={() => {}} onInitiateStoreItemPurchase={() => {}} onAddHeroPersona={handleAddHeroPersona} onDeleteHeroPersona={() => {}} onEquipHeroPersona={(pid) => setHero(prev => ({ ...prev, equippedPersonaId: pid }))} onGenerateHeroBackstory={async () => {}} onNavigateToMissionDetail={(m) => { setSelectedMissionForDetail(m); setCurrentView('missionDetail'); }} onNavigate={handleNavigate} activeTab={heroHubTab} setActiveTab={setHeroHubTab} />
        )}

        {currentView === 'transparencyDatabase' && (
          <TransparencyDatabaseView onReturn={() => setCurrentView('mainMenu')} hero={heroWithRank} reports={reports} filters={filters} setFilters={setFilters} onJoinReportChat={(r) => { setSelectedReportForIncidentRoom(r); setCurrentView('incidentRoom'); }} />
        )}

        {currentView === 'fieldMissions' && (
          <FieldMissionsView
            onReturn={() => setCurrentView('mainMenu')}
            missions={missions}
            beacons={fieldBeacons}
            onPublishBeacon={(latitude, longitude, label) => {
              setFieldBeacons((prev) => [
                ...prev,
                {
                  id: `beacon-${Date.now()}`,
                  latitude,
                  longitude,
                  label,
                  isOwn: true,
                  timestamp: Date.now(),
                },
              ]);
            }}
          />
        )}

        {currentView === 'trainingHolodeck' && (
          <TrainingHolodeckView hero={heroWithRank} onReturn={() => setCurrentView('mainMenu')} onComplete={() => {}} />
        )}

        {currentView === 'incidentRoom' && selectedReportForIncidentRoom && (
          <IncidentRoomView report={selectedReportForIncidentRoom} hero={heroWithRank} onReturn={() => setCurrentView('hub')} messages={[]} onSendMessage={() => {}} />
        )}

        {currentView === 'reputationAndCurrency' && (
          <ReputationAndCurrencyView onReturn={() => setCurrentView('mainMenu')} />
        )}

        {currentView === 'aiWorkDirectives' && (
          <AiWorkDirectivesView
            onReturn={() => setCurrentView('mainMenu')}
            hero={heroWithRank}
            heroLocation={heroLocation}
            setHeroLocation={setHeroLocation}
            directives={directives}
            setDirectives={setDirectives}
            onCompleteDirective={handleCompleteDirective}
          />
        )}

        {currentView === 'ecosystem' && (
          <EcosystemOverview onReturn={() => setCurrentView('mainMenu')} />
        )}
      </main>

      {['mainMenu', 'hub', 'categorySelection', 'heroHub', 'transparencyDatabase', 'fieldMissions'].includes(currentView) && (
        <BottomNav currentView={currentView} onNavigate={(view) => handleNavigate(view)} />
      )}
    </div>
  );
};

export default App;
