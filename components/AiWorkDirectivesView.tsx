
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { type Hero, type AiDirective, Category, type Report, type WorkPhase, type WorkStep } from '../types';
import {
  Activity, AlertTriangle, ArrowLeft, Loader,
  MapPin, Search, ShieldCheck, Sparkles, Target, Zap,
  CheckCircle, Coins, Award, ChevronLeft, ChevronRight
} from './icons';
import { generateAiDirectives, generateAiDirectivesBudget, isAiEnabled, AiError } from '../services/geminiService';
import { buildDirectiveAuditHash } from '../services/directivePacket';
import { useTranslations } from '../i18n';
import { CATEGORIES_WITH_ICONS } from '../constants';

type WorkMarketplaceCategory = {
  id: string;
  label: string;
  icon: string;
  generationCategory: Category;
  categorySet: Category[];
  keywords: string[];
};

const WORK_MARKETPLACE_CATEGORIES: WorkMarketplaceCategory[] = [
  { id: 'general', label: 'General Missions', icon: '🧭', generationCategory: Category.CivicDuty, categorySet: [Category.CivicDuty, Category.GoodDeeds, Category.Other], keywords: ['general', 'community', 'civic'] },
  { id: 'education', label: 'Education', icon: '🎓', generationCategory: Category.Education, categorySet: [Category.Education], keywords: ['education', 'school', 'teacher', 'student'] },
  { id: 'police', label: 'Police', icon: '🛡️', generationCategory: Category.PoliceMisconduct, categorySet: [Category.PoliceMisconduct], keywords: ['police', 'misconduct'] },
  { id: 'courts', label: 'Courts', icon: '⚖️', generationCategory: Category.CivicDuty, categorySet: [Category.CivicDuty, Category.WorkplaceIssues], keywords: ['court', 'legal', 'justice'] },
  { id: 'politicians', label: 'Politicians', icon: '🏛️', generationCategory: Category.CivicDuty, categorySet: [Category.CivicDuty, Category.Events], keywords: ['politician', 'office', 'campaign'] },
  { id: 'environment', label: 'Environment', icon: '🌿', generationCategory: Category.Environment, categorySet: [Category.Environment, Category.WaterViolations, Category.FireEnvironmentalHazards], keywords: ['environment', 'water', 'pollution', 'hazard'] },
  { id: 'housing', label: 'Housing', icon: '🏠', generationCategory: Category.HousingIssues, categorySet: [Category.HousingIssues], keywords: ['housing', 'tenant', 'rent'] },
  { id: 'medical', label: 'Medical', icon: '🩺', generationCategory: Category.MedicalNegligence, categorySet: [Category.MedicalNegligence, Category.Allergies], keywords: ['medical', 'clinic', 'hospital', 'health'] },
  { id: 'community-help', label: 'Community Help', icon: '🤝', generationCategory: Category.DpalHelp, categorySet: [Category.DpalHelp, Category.GoodDeeds, Category.ElderlyCare], keywords: ['help', 'community', 'support', 'elderly'] },
  { id: 'lost-pets', label: 'Lost Pets', icon: '🐾', generationCategory: Category.PublicSafetyAlerts, categorySet: [Category.PublicSafetyAlerts, Category.IndependentDiscoveries], keywords: ['pet', 'lost', 'animal'] },
  { id: 'insurance', label: 'Insurance', icon: '🧾', generationCategory: Category.InsuranceFraud, categorySet: [Category.InsuranceFraud], keywords: ['insurance', 'claim', 'fraud'] },
  { id: 'banking', label: 'Banking', icon: '🏦', generationCategory: Category.ConsumerScams, categorySet: [Category.ConsumerScams, Category.P2PEscrowVerification], keywords: ['bank', 'finance', 'account', 'payment'] },
  { id: 'public-safety', label: 'Public Safety', icon: '🚨', generationCategory: Category.PublicSafetyAlerts, categorySet: [Category.PublicSafetyAlerts, Category.AccidentsRoadHazards, Category.Infrastructure], keywords: ['safety', 'accident', 'road', 'alert'] },
];

interface AiWorkDirectivesViewProps {
  onReturn: () => void;
  hero: Hero;
  heroLocation: string;
  setHeroLocation: (loc: string) => void;
  directives: AiDirective[];
  setDirectives: React.Dispatch<React.SetStateAction<AiDirective[]>>;
  onCompleteDirective: (dir: AiDirective) => Report;
}

const AiWorkDirectivesView: React.FC<AiWorkDirectivesViewProps> = ({
  onReturn,
  hero,
  heroLocation,
  setHeroLocation,
  directives,
  setDirectives,
  onCompleteDirective,
}) => {
  const { t } = useTranslations();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDirective, setActiveDirective] = useState<AiDirective | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [error, setError] = useState<AiError | null>(null);
  const [showCreatedState, setShowCreatedState] = useState(false);
  const [aiMode, setAiMode] = useState<'cheap' | 'premium'>('cheap');
  const [selectedMarketplaceCategoryId, setSelectedMarketplaceCategoryId] = useState<string>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [missionFilter, setMissionFilter] = useState<'all' | 'active' | 'completed' | 'high_reward'>('all');
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [savedMissionIds, setSavedMissionIds] = useState<Record<string, boolean>>({});
  const [missionNotes, setMissionNotes] = useState<Record<string, string>>({});
  const [missionCheckedSteps, setMissionCheckedSteps] = useState<Record<string, number[]>>({});
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (dir: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    categoryScrollRef.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
  };

  // Initialize directive with phases if it doesn't have them (backward compatibility)
  useEffect(() => {
    if (activeDirective && !activeDirective.phases && activeDirective.packet) {
      // Convert legacy packet structure to phases
      const legacyPhases: WorkPhase[] = [
        {
          id: 'phase-recon-legacy',
          name: 'Initial Reconnaissance',
          description: 'Initial investigation and planning phase.',
          phaseType: 'RECON',
          steps: activeDirective.packet.steps.slice(0, 2).map((s, i) => ({
            id: `step-recon-${i}`,
            name: `${s.verb} ${s.actor}`,
            task: s.detail,
            instruction: `Complete: ${s.detail}`,
            isComplete: false,
            requiresProof: false,
            order: i + 1,
          })),
          compensation: { hc: Math.floor(activeDirective.rewardHc * 0.2), xp: Math.floor(activeDirective.rewardXp * 0.2) },
          isComplete: false,
          estimatedDuration: '30-45 minutes',
        },
        {
          id: 'phase-exec-legacy',
          name: 'Execution',
          description: 'Main work tasks execution.',
          phaseType: 'EXECUTION',
          steps: activeDirective.packet.steps.slice(2).map((s, i) => ({
            id: `step-exec-${i}`,
            name: `${s.verb} ${s.actor}`,
            task: s.detail,
            instruction: `Complete: ${s.detail}`,
            isComplete: false,
            requiresProof: true,
            proofType: 'photo' as const,
            order: i + 1,
          })),
          compensation: { hc: Math.floor(activeDirective.rewardHc * 0.5), xp: Math.floor(activeDirective.rewardXp * 0.5) },
          isComplete: false,
          estimatedDuration: '1-2 hours',
        },
        {
          id: 'phase-verify-legacy',
          name: 'Verification',
          description: 'Proof submission and validation.',
          phaseType: 'VERIFICATION',
          steps: [
            {
              id: 'step-verify-1',
              name: 'Submit Evidence',
              task: 'Upload all collected proof materials.',
              instruction: 'Submit photos, videos, or text evidence collected during execution.',
              isComplete: false,
              requiresProof: true,
              proofType: 'photo',
              order: 1,
            },
          ],
          compensation: { hc: Math.floor(activeDirective.rewardHc * 0.2), xp: Math.floor(activeDirective.rewardXp * 0.2) },
          isComplete: false,
          estimatedDuration: '20-30 minutes',
        },
        {
          id: 'phase-complete-legacy',
          name: 'Completion',
          description: 'Final review and reward distribution.',
          phaseType: 'COMPLETION',
          steps: [
            {
              id: 'step-complete-1',
              name: 'Confirm Completion',
              task: 'Review and confirm all work is complete.',
              instruction: 'Verify all phases are complete and submit for rewards.',
              isComplete: false,
              requiresProof: false,
              order: 1,
            },
          ],
          compensation: { hc: activeDirective.rewardHc - Math.floor(activeDirective.rewardHc * 0.9), xp: activeDirective.rewardXp - Math.floor(activeDirective.rewardXp * 0.9) },
          isComplete: false,
          estimatedDuration: '5 minutes',
        },
      ];
      setActiveDirective({
        ...activeDirective,
        phases: legacyPhases,
        currentPhaseIndex: 0,
      });
    }
  }, [activeDirective]);

  const handleRefresh = async () => {
    if (!selectedCategory || !heroLocation.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const data = aiMode === 'cheap'
        ? await generateAiDirectivesBudget(heroLocation, selectedCategory, 4)
        : await generateAiDirectives(heroLocation, selectedCategory, 3);
      setDirectives(data);
    } catch (e: any) {
      setError(e instanceof AiError ? e : new AiError('TEMPORARY_FAILURE', 'Link unstable.'));
    } finally { setIsGenerating(false); }
  };

  const handleStepToggle = (stepId: string) => {
    if (!activeDirective || !activeDirective.phases) return;

    const updatedPhases = activeDirective.phases.map((phase) => ({
      ...phase,
      steps: phase.steps.map((step) =>
        step.id === stepId ? { ...step, isComplete: !step.isComplete } : step
      ),
    }));

    // Check if all steps in current phase are complete
    const currentPhase = updatedPhases[activeDirective.currentPhaseIndex || 0];
    if (currentPhase && currentPhase.steps.every((s) => s.isComplete)) {
      currentPhase.isComplete = true;
      currentPhase.completedAt = Date.now();
    }

    // Auto-advance to next phase if current is complete
    let newPhaseIndex = activeDirective.currentPhaseIndex || 0;
    if (currentPhase?.isComplete && newPhaseIndex < updatedPhases.length - 1) {
      newPhaseIndex = newPhaseIndex + 1;
    }

    const updatedDirective: AiDirective = {
      ...activeDirective,
      phases: updatedPhases,
      currentPhaseIndex: newPhaseIndex,
      status: updatedPhases.every((p) => p.isComplete) ? 'completed' : 'in_progress',
    };

    setActiveDirective(updatedDirective);
    setDirectives((prev) =>
      prev.map((d) => (d.id === updatedDirective.id ? updatedDirective : d))
    );
  };

  const handleProofUpload = (stepId: string, proofUrl: string, proofType: string) => {
    if (!activeDirective || !activeDirective.phases) return;

    const updatedPhases = activeDirective.phases.map((phase) => ({
      ...phase,
      steps: phase.steps.map((step) =>
        step.id === stepId ? { ...step, proofUrl } : step
      ),
    }));

    setActiveDirective({
      ...activeDirective,
      phases: updatedPhases,
    });
  };

  const handlePhaseClick = (phaseIndex: number) => {
    if (!activeDirective || !activeDirective.phases) return;
    // Only allow clicking on completed phases or current phase
    const canAccess =
      phaseIndex <= (activeDirective.currentPhaseIndex || 0) ||
      activeDirective.phases[phaseIndex - 1]?.isComplete;
    if (canAccess) {
      setActiveDirective({
        ...activeDirective,
        currentPhaseIndex: phaseIndex,
      });
    }
  };

  const handleCompleteDirective = async () => {
    if (!activeDirective || !activeDirective.phases) return;

    // Verify all phases are complete
    const allComplete = activeDirective.phases.every((p) => p.isComplete);
    if (!allComplete) {
      setError(new AiError('TEMPORARY_FAILURE', 'Complete all phases before finalizing.'));
      return;
    }

    try {
      // Calculate total compensation
      const totalHc = activeDirective.phases.reduce((sum, p) => sum + p.compensation.hc, 0);
      const totalXp = activeDirective.phases.reduce((sum, p) => sum + p.compensation.xp, 0);

      // Build audit hash
      const auditHash = await buildDirectiveAuditHash({
        ...activeDirective,
        heroLocation,
      });

      const completedDirective: AiDirective = {
        ...activeDirective,
        status: 'completed',
        rewardHc: totalHc,
        rewardXp: totalXp,
        auditHash,
      };

      onCompleteDirective(completedDirective);
      setShowCreatedState(true);
    } catch (e) {
      setError(new AiError('TEMPORARY_FAILURE', 'Ledger commit failed.'));
    }
  };

  const handleCompleteSimple = async (directive: AiDirective) => {
    try {
      const auditHash = await buildDirectiveAuditHash({ ...directive, heroLocation });
      const completed: AiDirective = { ...directive, status: 'completed', auditHash };
      setDirectives((prev) => prev.map((d) => (d.id === directive.id ? completed : d)));
      setActiveDirective(completed);
      setExpandedMissionId(null);
      onCompleteDirective(completed);
      setShowCreatedState(true);
    } catch {
      setError(new AiError('TEMPORARY_FAILURE', 'Could not complete mission. Try again.'));
    }
  };

  const toggleSimpleStep = (missionId: string, stepIdx: number) => {
    setMissionCheckedSteps((prev) => {
      const current = prev[missionId] || [];
      const updated = current.includes(stepIdx)
        ? current.filter((i) => i !== stepIdx)
        : [...current, stepIdx];
      return { ...prev, [missionId]: updated };
    });
  };

  const currentPhase = activeDirective?.phases?.[activeDirective.currentPhaseIndex || 0];
  const allPhasesComplete = activeDirective?.phases?.every((p) => p.isComplete) || false;
  const aiAvailable = isAiEnabled();
  const selectedMarketplaceCategory = WORK_MARKETPLACE_CATEGORIES.find((c) => c.id === selectedMarketplaceCategoryId) || WORK_MARKETPLACE_CATEGORIES[0];

  const stats = useMemo(() => {
    const completed = directives.filter((d) => d.status === 'completed').length;
    const active = directives.filter((d) => d.status !== 'completed').length;
    return { active, completed };
  }, [directives]);

  const getDirectiveObjectives = (directive: AiDirective): string[] => {
    if (directive.phases?.length) {
      return directive.phases.flatMap((phase) => phase.steps.map((step) => step.task)).slice(0, 4);
    }
    if (directive.packet?.steps?.length) {
      return directive.packet.steps.map((s) => s.detail).slice(0, 4);
    }
    return [directive.instruction];
  };

  const getDirectiveProofNeeds = (directive: AiDirective): string[] => {
    if (directive.phases?.length) {
      const needs = directive.phases
        .flatMap((phase) => phase.steps)
        .filter((step) => step.requiresProof)
        .map((step) => (step.proofType ? `${step.proofType} proof` : 'supporting proof'));
      if (needs.length > 0) return Array.from(new Set(needs)).slice(0, 3);
    }
    if (directive.packet?.evidenceMissing?.length) {
      return directive.packet.evidenceMissing.map((e) => e.item).slice(0, 3);
    }
    return ['Photo or supporting note'];
  };

  const getEstimatedTime = (directive: AiDirective): string => {
    if (directive.phases?.length) {
      const phaseDurations = directive.phases.map((p) => p.estimatedDuration).filter(Boolean);
      return phaseDurations.length ? phaseDurations.join(' + ') : 'About 1-2 hours';
    }
    return directive.packet?.timeWindow || 'About 1-2 hours';
  };

  const getUrgency = (directive: AiDirective): 'Low' | 'Medium' | 'High' | 'Critical' => {
    const p = directive.packet?.priority;
    if (p === 'LOW') return 'Low';
    if (p === 'HIGH') return 'High';
    if (p === 'CRITICAL') return 'Critical';
    return 'Medium';
  };

  const directiveMatchesCategory = (directive: AiDirective, cat: WorkMarketplaceCategory): boolean => {
    if (cat.id === 'general') return true;
    if (cat.categorySet.includes(directive.category)) return true;
    const blob = `${directive.title} ${directive.description} ${directive.instruction}`.toLowerCase();
    return cat.keywords.some((k) => blob.includes(k));
  };

  const filteredMissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return directives
      .filter((d) => directiveMatchesCategory(d, selectedMarketplaceCategory))
      .filter((d) => {
        if (missionFilter === 'active') return d.status !== 'completed';
        if (missionFilter === 'completed') return d.status === 'completed';
        if (missionFilter === 'high_reward') return d.rewardHc >= 80;
        return true;
      })
      .filter((d) => {
        if (!q) return true;
        return `${d.title} ${d.description} ${d.instruction}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [directives, selectedMarketplaceCategory, missionFilter, searchQuery]);

  const cycleMissionFilter = () => {
    setMissionFilter((prev) => {
      if (prev === 'all') return 'active';
      if (prev === 'active') return 'completed';
      if (prev === 'completed') return 'high_reward';
      return 'all';
    });
  };

  const handleCategorySelect = (cat: WorkMarketplaceCategory) => {
    setSelectedMarketplaceCategoryId(cat.id);
    setSelectedCategory(cat.generationCategory);
    setExpandedMissionId(null);
  };

  const handleStartMission = (directive: AiDirective) => {
    setActiveDirective(directive);
    setExpandedMissionId(directive.id);
    if (directive.status === 'available') {
      const next = { ...directive, status: 'in_progress' as const };
      setDirectives((prev) => prev.map((d) => (d.id === directive.id ? next : d)));
      setActiveDirective(next);
    }
  };

  const handleAskAiForMission = async (directive: AiDirective) => {
    setSelectedCategory(directive.category);
    if (!heroLocation.trim()) {
      setError(new AiError('TEMPORARY_FAILURE', 'Enter your city or area first.'));
      return;
    }
    await handleRefresh();
  };

  const toggleSavedMission = (missionId: string) => {
    setSavedMissionIds((prev) => ({ ...prev, [missionId]: !prev[missionId] }));
  };

  return (
    <div className="flex flex-col min-h-[90vh] bg-[var(--dpal-background)] font-sans">
      <header className="bg-[color-mix(in_srgb,var(--dpal-panel)_88%,transparent)] border-b border-[color:var(--dpal-border)] px-4 md:px-8 py-4 md:py-5 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={onReturn} className="p-2 rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] text-[var(--dpal-text-muted)] hover:text-[var(--dpal-text-primary)] hover:bg-[var(--dpal-surface-alt)] transition-all">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--dpal-text-muted)]">DPAL Work Network</p>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--dpal-text-primary)]">AI-guided community work marketplace</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-2 rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-300 text-xs font-bold">Coins: {hero.heroCredits.toLocaleString()}</div>
              <div className="px-3 py-2 rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] text-[var(--dpal-text-secondary)] text-xs font-bold">Active: {stats.active}</div>
              <div className="px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold">Completed: {stats.completed}</div>
              <div className={`px-3 py-2 rounded-xl border text-xs font-bold ${aiAvailable ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                AI: {isGenerating ? 'Assigning...' : aiAvailable ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dpal-text-muted)]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search missions by title, objective, or guidance"
                className="w-full dpal-input pl-10"
              />
            </div>
            <button onClick={cycleMissionFilter} className="px-4 py-3 rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-surface-alt)] text-[var(--dpal-text-secondary)] hover:text-[var(--dpal-text-primary)] hover:border-[color:var(--dpal-border-strong)] transition-all text-sm font-semibold">
              Filter: {missionFilter.replace('_', ' ')}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-6 space-y-6">
        {showCreatedState && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex flex-col items-center text-center gap-3">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
            <p className="text-lg font-black text-[var(--dpal-text-primary)]">Mission completed and rewards distributed.</p>
            <button
              onClick={() => {
                setShowCreatedState(false);
                setActiveDirective(null);
              }}
              className="dpal-btn-primary"
            >
              Back to marketplace
            </button>
          </div>
        )}

        {!!error && (
          <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm font-semibold">
            {error.message}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--dpal-text-secondary)]">Mission Categories</h2>
            <div className="text-xs text-[var(--dpal-text-muted)]">Tap a category to browse assignments</div>
          </div>

          {/* Arrow + scroll row */}
          <div className="flex items-center gap-2">
            {/* Left arrow */}
            <button
              onClick={() => scrollCategories('left')}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/25 text-white hover:bg-white/20 shadow-lg transition-all"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable row */}
            <div
              ref={categoryScrollRef}
              className="flex-1 flex gap-3 overflow-x-auto overflow-y-hidden pb-2 [scrollbar-width:thin] [scrollbar-color:var(--dpal-border)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--dpal-border)]"
            >
              {WORK_MARKETPLACE_CATEGORIES.map((cat) => {
                const selected = cat.id === selectedMarketplaceCategoryId;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className={`shrink-0 min-w-[140px] text-left rounded-2xl border p-4 transition-all ${
                      selected
                        ? 'bg-[var(--dpal-support-cyan)] border-[color:var(--dpal-support-cyan-bright)] text-white shadow-[0_10px_28px_-16px_var(--dpal-support-cyan-glow)]'
                        : 'bg-[var(--dpal-card)] border-[color:var(--dpal-border)] text-[var(--dpal-text-secondary)] hover:border-[color:var(--dpal-border-strong)] hover:bg-[var(--dpal-card-hover)]'
                    }`}
                  >
                    <div className="text-xl mb-2">{cat.icon}</div>
                    <div className="text-sm font-bold leading-tight">{cat.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Right arrow */}
            <button
              onClick={() => scrollCategories('right')}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/25 text-white hover:bg-white/20 shadow-lg transition-all"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-[color:var(--dpal-border)] bg-[color-mix(in_srgb,var(--dpal-panel)_50%,transparent)] p-4 md:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-black text-[var(--dpal-text-primary)]">{selectedMarketplaceCategory.label}</h3>
            <button
              onClick={handleRefresh}
              disabled={!heroLocation.trim() || isGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_16px_-4px_rgba(6,182,212,0.7)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isGenerating ? 'Generating...' : 'Generate AI Missions'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--dpal-text-muted)] flex items-center gap-2">
              <MapPin className="w-3 h-3 text-rose-500" /> Mission area
            </label>
            <input
              value={heroLocation}
              onChange={(e) => setHeroLocation(e.target.value)}
              className="dpal-input max-w-md"
              placeholder="City or neighborhood"
            />
          </div>

          {filteredMissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] p-8 text-center">
              <p className="text-sm font-semibold text-[var(--dpal-text-secondary)]">No assignments in this category yet.</p>
              <p className="text-xs text-[var(--dpal-text-muted)] mt-2">Set location and refresh AI assignments to load missions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMissions.map((directive) => {
                const expanded = expandedMissionId === directive.id;
                const objectives = getDirectiveObjectives(directive);
                const proofNeeds = getDirectiveProofNeeds(directive);
                const urgency = getUrgency(directive);
                const isSaved = Boolean(savedMissionIds[directive.id]);
                const missionActive = activeDirective?.id === directive.id ? activeDirective : directive;
                const activeMissionPhase = missionActive.phases?.[missionActive.currentPhaseIndex || 0];
                const missionAllComplete = missionActive.phases?.every((p) => p.isComplete) || false;
                return (
                  <article key={directive.id} className="dpal-card p-4 md:p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2 min-w-0">
                        <h4 className="text-lg font-bold text-[var(--dpal-text-primary)]">{directive.title}</h4>
                        <p className="text-sm text-[var(--dpal-text-secondary)]">{directive.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="dpal-badge">{selectedMarketplaceCategory.label}</span>
                        <span className={`dpal-badge ${urgency === 'Critical' ? 'dpal-badge-danger' : urgency === 'High' ? 'dpal-badge-warning' : 'dpal-badge-info'}`}>Urgency: {urgency}</span>
                        <span className="dpal-badge dpal-badge-success">Reward: {directive.rewardHc} coins</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] p-3">
                        <p className="text-[11px] font-bold uppercase text-[var(--dpal-text-muted)]">Difficulty</p>
                        <p className="text-sm font-semibold text-[var(--dpal-text-primary)]">{directive.difficulty}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] p-3">
                        <p className="text-[11px] font-bold uppercase text-[var(--dpal-text-muted)]">Estimated Time</p>
                        <p className="text-sm font-semibold text-[var(--dpal-text-primary)]">{getEstimatedTime(directive)}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] p-3">
                        <p className="text-[11px] font-bold uppercase text-[var(--dpal-text-muted)]">Mission Type</p>
                        <p className="text-sm font-semibold text-[var(--dpal-text-primary)]">{directive.category}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] p-3">
                        <p className="text-[11px] font-bold uppercase text-[var(--dpal-text-muted)]">AI Guidance</p>
                        <p className="text-sm font-semibold text-[var(--dpal-text-primary)] truncate">{directive.recommendedNextAction || directive.instruction}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] p-3">
                        <p className="text-[11px] font-bold uppercase text-[var(--dpal-text-muted)] mb-2">Objective Checklist</p>
                        <ul className="space-y-1">
                          {objectives.map((obj) => (
                            <li key={`${directive.id}-${obj}`} className="text-sm text-[var(--dpal-text-secondary)] flex gap-2">
                              <Target className="w-4 h-4 mt-0.5 text-[var(--dpal-support-cyan-bright)]" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] p-3">
                        <p className="text-[11px] font-bold uppercase text-[var(--dpal-text-muted)] mb-2">Proof Needed</p>
                        <ul className="space-y-1">
                          {proofNeeds.map((proof) => (
                            <li key={`${directive.id}-${proof}`} className="text-sm text-[var(--dpal-text-secondary)] flex gap-2">
                              <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-400" />
                              <span>{proof}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => handleStartMission(directive)} className="dpal-btn-primary">
                        <Activity className="w-4 h-4" />
                        <span>{directive.status === 'in_progress' ? 'Track Progress' : 'Start Mission'}</span>
                      </button>
                      <button onClick={() => handleAskAiForMission(directive)} className="dpal-btn">
                        <Sparkles className="w-4 h-4" />
                        <span>Ask AI</span>
                      </button>
                      <button onClick={() => toggleSavedMission(directive.id)} className="dpal-btn-ghost">
                        <span>{isSaved ? 'Saved' : 'Save Mission'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setExpandedMissionId(expanded ? null : directive.id);
                          setActiveDirective(directive);
                        }}
                        className="dpal-btn-ghost"
                      >
                        <span>{expanded ? 'Hide Details' : 'Mission Details'}</span>
                      </button>
                    </div>

                    {expanded && (
                      <div className="rounded-2xl border border-[color:var(--dpal-border)] bg-[var(--dpal-surface)] p-4 space-y-4">
                        <p className="text-[11px] uppercase font-bold tracking-[0.12em] text-[var(--dpal-text-muted)]">Category → Mission list → Mission details</p>

                        {activeMissionPhase ? (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-sm font-bold text-[var(--dpal-text-primary)]">{activeMissionPhase.name}</h5>
                              <span className="text-xs text-[var(--dpal-text-muted)]">{activeMissionPhase.estimatedDuration}</span>
                            </div>
                            <p className="text-sm text-[var(--dpal-text-secondary)]">{activeMissionPhase.description}</p>
                            <div className="space-y-2">
                              {activeMissionPhase.steps.map((step) => {
                                const previousSteps = activeMissionPhase.steps.filter((s) => s.order < step.order);
                                const canComplete = previousSteps.every((s) => s.isComplete) || step.order === 1;
                                return (
                                  <button
                                    key={step.id}
                                    disabled={!canComplete}
                                    onClick={() => handleStepToggle(step.id)}
                                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                                      step.isComplete
                                        ? 'border-emerald-500/40 bg-emerald-500/10'
                                        : canComplete
                                        ? 'border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] hover:border-[color:var(--dpal-border-strong)]'
                                        : 'border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] opacity-50 cursor-not-allowed'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-sm font-semibold text-[var(--dpal-text-primary)]">{step.name}</span>
                                      {step.isComplete && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                                    </div>
                                    <p className="text-xs text-[var(--dpal-text-secondary)] mt-1">{step.task}</p>
                                  </button>
                                );
                              })}
                            </div>

                            {missionAllComplete && (
                              <button onClick={handleCompleteDirective} className="w-full dpal-btn-primary">
                                <CheckCircle className="w-4 h-4" />
                                <span>Complete Mission & Claim Coins</span>
                              </button>
                            )}
                          </>
                        ) : missionActive.status === 'in_progress' ? (
                          <>
                            {/* In-progress indicator */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Mission In Progress</span>
                            </div>

                            {/* Step checklist */}
                            <div className="space-y-2">
                              <p className="text-[11px] font-bold uppercase text-[var(--dpal-text-muted)]">Steps — tap each when done</p>
                              {(missionActive.packet?.steps?.length
                                ? missionActive.packet.steps.map((s) => ({ label: s.detail, sub: `${s.verb} · ${s.eta}` }))
                                : objectives.map((o) => ({ label: o, sub: '' }))
                              ).map((step, idx) => {
                                const done = (missionCheckedSteps[missionActive.id] || []).includes(idx);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => toggleSimpleStep(missionActive.id, idx)}
                                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                                      done
                                        ? 'border-emerald-500/40 bg-emerald-500/10'
                                        : 'border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] hover:border-[color:var(--dpal-border-strong)]'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-sm font-semibold text-[var(--dpal-text-primary)]">{step.label}</span>
                                      {done && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                                    </div>
                                    {step.sub && <p className="text-xs text-[var(--dpal-text-secondary)] mt-1">{step.sub}</p>}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Proof needed reminder */}
                            {proofNeeds.length > 0 && (
                              <div className="rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] p-3 space-y-1">
                                <p className="text-[11px] font-bold uppercase text-[var(--dpal-text-muted)]">Proof Required</p>
                                {proofNeeds.map((p) => (
                                  <div key={p} className="flex items-center gap-2 text-sm text-[var(--dpal-text-secondary)]">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>{p}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Field notes */}
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-bold uppercase text-[var(--dpal-text-muted)]">Field Notes &amp; Proof</p>
                              <textarea
                                value={missionNotes[missionActive.id] || ''}
                                onChange={(e) => setMissionNotes((prev) => ({ ...prev, [missionActive.id]: e.target.value }))}
                                placeholder="Describe what you found, observed, or completed. Add evidence notes, links, or photo descriptions here…"
                                rows={3}
                                className="w-full rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] p-3 text-sm text-[var(--dpal-text-primary)] placeholder:text-[var(--dpal-text-muted)] resize-none focus:outline-none focus:border-[color:var(--dpal-border-strong)] transition-colors"
                              />
                            </div>

                            {/* Complete */}
                            <button
                              onClick={() => handleCompleteSimple(missionActive)}
                              className="w-full dpal-btn-primary"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Mark Complete &amp; Claim {missionActive.rewardHc} Coins</span>
                            </button>
                          </>
                        ) : (
                          <p className="text-sm text-[var(--dpal-text-secondary)]">Hit <strong className="text-[var(--dpal-text-primary)]">Start Mission</strong> to begin tracking steps and submitting proof.</p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--dpal-border-strong); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--dpal-background-secondary); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AiWorkDirectivesView;
