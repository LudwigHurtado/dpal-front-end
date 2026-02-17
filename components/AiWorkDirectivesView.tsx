
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { type Hero, type AiDirective, Category, type Report, type WorkPhase, type WorkStep } from '../types';
import {
  Activity, AlertTriangle, ArrowLeft, Broadcast, Camera, Loader, 
  MapPin, Search, ShieldCheck, Sparkles, Target, X, Zap, 
  Database, FileText, CheckCircle, Plus, Layout as LayoutIcon, 
  Monitor, List, Package, Coins, Award
} from './icons';
import { generateAiDirectives, generateAiDirectivesBudget, isAiEnabled, AiError } from '../services/geminiService';
import { buildDirectiveAuditHash } from '../services/directivePacket';
import { useTranslations } from '../i18n';
import { CATEGORIES_WITH_ICONS } from '../constants';
import WorkspaceManager from './Workspace/WorkspaceManager';
import PanelShell from './Workspace/PanelShell';
import PhaseStepper from './WorkNode/PhaseStepper';
import StepCard from './WorkNode/StepCard';
import CompensationPanel from './WorkNode/CompensationPanel';

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

  const currentPhase = activeDirective?.phases?.[activeDirective.currentPhaseIndex || 0];
  const allPhasesComplete = activeDirective?.phases?.every((p) => p.isComplete) || false;

  const workPanels = [
      {
          id: 'directiveQueue',
          title: 'Directive_Queue',
          component: (
              <PanelShell id="directiveQueue" title="Directive_Queue">
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center space-x-2">
                            <MapPin className="w-3 h-3 text-rose-500" /><span>Geospatial_Lock</span>
                        </label>
                        <input value={heroLocation} onChange={e => setHeroLocation(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white font-black uppercase outline-none focus:border-cyan-500 transition-all" placeholder="Enter City or Address..." />
                        <div className="flex flex-wrap gap-2">
                            {['La Paz', 'Cochabamba', 'Santa Cruz', 'El Alto'].map((city) => (
                                <button key={city} onClick={() => setHeroLocation(city)} className="px-2 py-1 rounded-md text-[9px] font-black uppercase bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white">
                                    {city}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Focus_Domain</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES_WITH_ICONS.slice(0, 6).map(cat => (
                                <button key={cat.value} onClick={() => setSelectedCategory(cat.value as Category)} className={`px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all ${selectedCategory === cat.value ? 'bg-cyan-500/10 border-cyan-500 text-white' : 'bg-black border-zinc-800 text-zinc-600'}`}>
                                    {cat.icon} {t(cat.translationKey)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">AI_Cost_Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setAiMode('cheap')} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase border ${aiMode === 'cheap' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300' : 'bg-black border-zinc-800 text-zinc-500'}`}>Cheap AI</button>
                            <button onClick={() => setAiMode('premium')} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase border ${aiMode === 'premium' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300' : 'bg-black border-zinc-800 text-zinc-500'}`}>Premium AI</button>
                        </div>
                    </div>
                    <button onClick={handleRefresh} disabled={!selectedCategory || !heroLocation.trim() || isGenerating} className="w-full bg-white text-black font-black py-4 rounded-xl text-[10px] uppercase shadow-lg active:scale-95 transition-all disabled:opacity-40">
                        {isGenerating ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Generate_City_Jobs'}
                    </button>
                    {error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                            <p className="text-[9px] text-rose-400 font-black uppercase">{error.message}</p>
                        </div>
                    )}
                    <div className="space-y-3 pt-4 border-t border-zinc-800">
                        {directives.length === 0 ? (
                            <div className="text-center py-8 text-zinc-600">
                                <p className="text-[9px] font-black uppercase">No Directives Available</p>
                                <p className="text-[8px] mt-2">Select location and category, then sync</p>
                            </div>
                        ) : (
                            directives.map(dir => {
                                const progress = dir.phases 
                                    ? (dir.phases.filter(p => p.isComplete).length / dir.phases.length) * 100
                                    : 0;
                                return (
                                    <button 
                                        key={dir.id} 
                                        onClick={() => setActiveDirective(dir)} 
                                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                                            activeDirective?.id === dir.id 
                                                ? 'bg-amber-500/10 border-amber-500' 
                                                : 'bg-black border-zinc-800 hover:border-zinc-700'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h4 className="font-black text-xs text-white uppercase flex-1 truncate">{dir.title}</h4>
                                            {dir.status === 'completed' && (
                                                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-[8px]">
                                            <div className="flex items-center gap-1 text-amber-500">
                                                <Coins className="w-3 h-3" />
                                                <span className="font-black">{dir.rewardHc} HC</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-cyan-500">
                                                <Award className="w-3 h-3" />
                                                <span className="font-black">{dir.rewardXp} XP</span>
                                            </div>
                                        </div>
                                        {dir.phases && (
                                            <div className="mt-2">
                                                <div className="h-1 bg-zinc-950 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-cyan-500 transition-all"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <p className="text-[7px] text-zinc-600 mt-1 font-black uppercase">
                                                    {Math.round(progress)}% Complete
                                                </p>
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
              </PanelShell>
          )
      },
      {
          id: 'directiveDetail',
          title: 'Field_Protocol',
          component: (
              <PanelShell id="directiveDetail" title="Field_Protocol">
                {activeDirective ? (
                    <div className="p-6 space-y-6 overflow-y-auto h-full custom-scrollbar">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">{activeDirective.title}</h2>
                            <p className="text-sm text-zinc-400 font-bold leading-relaxed border-l-4 border-amber-500 pl-6 italic">"{activeDirective.description}"</p>
                            <div className="flex items-center gap-3 text-xs">
                                <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 font-black uppercase">
                                    {activeDirective.difficulty}
                                </span>
                                <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 font-black uppercase">
                                    {activeDirective.category}
                                </span>
                            </div>
                        </div>

                        {activeDirective.phases && activeDirective.phases.length > 0 ? (
                            <>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Phase_Progression</label>
                                    <PhaseStepper 
                                        phases={activeDirective.phases}
                                        currentPhaseIndex={activeDirective.currentPhaseIndex || 0}
                                        onPhaseClick={handlePhaseClick}
                                    />
                                </div>

                                {currentPhase && (
                                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                                                Current Phase: {currentPhase.name}
                                            </label>
                                            <span className="text-[8px] text-zinc-600 font-black uppercase">
                                                {currentPhase.estimatedDuration}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 font-bold italic border-l-2 border-cyan-500 pl-4">
                                            {currentPhase.description}
                                        </p>
                                        
                                        <div className="space-y-3">
                                            {currentPhase.steps.map((step) => {
                                                const previousSteps = currentPhase.steps.filter(
                                                    (s) => s.order < step.order
                                                );
                                                const canComplete = previousSteps.every((s) => s.isComplete) || step.order === 1;
                                                
                                                return (
                                                    <StepCard
                                                        key={step.id}
                                                        step={step}
                                                        isActive={step.order === (currentPhase.steps.find(s => !s.isComplete)?.order || step.order)}
                                                        canComplete={canComplete}
                                                        onToggleComplete={handleStepToggle}
                                                        onProofUpload={handleProofUpload}
                                                    />
                                                );
                                            })}
                                        </div>

                                        {allPhasesComplete && (
                                            <button
                                                onClick={handleCompleteDirective}
                                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                                <span>Finalize Directive & Claim Rewards</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Legacy_Action_Chain</label>
                                {activeDirective.packet?.steps.map((s, i) => (
                                    <div key={i} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex gap-4">
                                        <span className="text-xs font-black text-zinc-700">0{i+1}</span>
                                        <p className="text-[10px] font-black text-white uppercase">{s.verb}: {s.detail}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-12 text-center opacity-20">
                        <p className="text-xs font-black uppercase tracking-widest">Awaiting_Directive_Select</p>
                    </div>
                )}
              </PanelShell>
          )
      },
      {
          id: 'compensationPanel',
          title: 'Compensation',
          component: (
              <PanelShell id="compensationPanel" title="Compensation_Breakdown">
                {activeDirective && activeDirective.phases ? (
                    <div className="p-6 overflow-y-auto h-full custom-scrollbar">
                        <CompensationPanel 
                            directive={activeDirective}
                            phases={activeDirective.phases}
                        />
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-12 text-center opacity-20">
                        <p className="text-xs font-black uppercase tracking-widest">Select_Directive</p>
                    </div>
                )}
              </PanelShell>
          )
      }
  ];

  const defaultLayouts = {
    lg: [
        { i: 'directiveQueue', x: 0, y: 0, w: 3, h: 30, minW: 3, minH: 10 },
        { i: 'directiveDetail', x: 3, y: 0, w: 6, h: 25, minW: 5, minH: 10 },
        { i: 'compensationPanel', x: 9, y: 0, w: 3, h: 25, minW: 3, minH: 10 }
    ],
    md: [
        { i: 'directiveQueue', x: 0, y: 0, w: 2, h: 24, minW: 2, minH: 10 },
        { i: 'directiveDetail', x: 2, y: 0, w: 4, h: 16, minW: 3, minH: 10 },
        { i: 'compensationPanel', x: 2, y: 16, w: 4, h: 10, minW: 3, minH: 10 }
    ]
  };

  const mobileTabs = [
      { id: 'directiveQueue', label: 'Directives', icon: <List /> },
      { id: 'directiveDetail', label: 'Work', icon: <Zap /> },
      { id: 'compensationPanel', label: 'Rewards', icon: <Coins /> }
  ];

  return (
    <div className="flex flex-col h-[90vh] bg-black font-mono">
      <header className="bg-zinc-900 border-b border-zinc-800 px-8 py-4 flex justify-between items-center z-30">
        <div className="flex items-center space-x-4">
          <button onClick={onReturn} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tighter text-white">Work_Directives_OS</h1>
          </div>
        </div>
      </header>

      <div className="flex-grow p-4 md:p-6 overflow-hidden">
        {showCreatedState ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-emerald-400 animate-fade-in">
                    <CheckCircle className="w-12 h-12 text-black" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Directive_Complete</h2>
                <p className="text-sm text-zinc-400 font-bold">
                    All phases completed. Rewards have been distributed to your account.
                </p>
                <button 
                    onClick={() => {
                        setShowCreatedState(false);
                        setActiveDirective(null);
                    }} 
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-12 py-4 rounded-2xl uppercase text-xs transition-all active:scale-95"
                >
                    Return_To_Queue
                </button>
            </div>
        ) : (
            <WorkspaceManager 
                screenId="work-directives"
                panels={workPanels}
                defaultLayouts={defaultLayouts}
                mobileTabs={mobileTabs}
            />
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #18181b; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AiWorkDirectivesView;
