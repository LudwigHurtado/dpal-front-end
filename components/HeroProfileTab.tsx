import React, { useState, useEffect } from 'react';
import { type Hero, Archetype, HeroPath, type LedgerEvent, type DailyChallenge } from '../types';
import { useTranslations } from '../i18n';
import { 
    Loader, ShieldCheck, Zap, Sparkles, Target, Box, Database, 
    Monitor, Search, Pencil, User, Award, Activity, Clock, 
    ChevronRight, Settings, List, Plus, Layout as LayoutIcon, Coins, Fingerprint 
} from './icons';
import HeroBanner from './profile/HeroBanner';
import QuickActionsRow from './profile/QuickActionsRow';
import DailyChallengeCard from './profile/DailyChallengeCard';
import ImpactDashboard from './profile/ImpactDashboard';
import InventoryPreview from './profile/InventoryPreview';
import HeroPersonaManager from './HeroPersonaManager';
import SettingsTabs from './profile/SettingsTabs';
import AuditLogModal from './modals/AuditLogModal';
import EditProfileModal from './modals/EditProfileModal';

interface HeroProfileTabProps {
    hero: Hero;
    setHero: React.Dispatch<React.SetStateAction<Hero>>;
    onNavigate: (view: any, cat?: any, tab?: any) => void;
    onAddHeroPersona: (description: string, archetype: Archetype) => Promise<void>;
    onDeleteHeroPersona: (personaId: string) => void;
    onEquipHeroPersona: (personaId: string | null) => void;
}

const HeroProfileTab: React.FC<HeroProfileTabProps> = ({
    hero, setHero, onNavigate, onAddHeroPersona, onDeleteHeroPersona, onEquipHeroPersona
}) => {
    const { t } = useTranslations();
    const [isLoading, setIsLoading] = useState(false);
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [activeSection, setActiveSection] = useState<'overview' | 'settings'>('overview');

    const hasIdentities = (hero.personas || []).length > 0;

    // Mock/Persisted Activity Feed
    const [activity, setActivity] = useState<any[]>([]);

    useEffect(() => {
        setActivity([
            { id: '1', icon: <Activity className="w-3 h-3 text-emerald-500"/>, label: 'Verified "Unsafe Meal Report"', time: '2h ago' },
            { id: '2', icon: <Monitor className="w-3 h-3 text-rose-500"/>, label: 'Submitted "HOA Abuse" Shard', time: '5h ago' },
            { id: '3', icon: <Coins className="w-3 h-3 text-amber-500"/>, label: 'Earned 25 Credits (Audit Bonus)', time: '1d ago' },
            { id: '4', icon: <Award className="w-3 h-3 text-cyan-400"/>, label: 'Unlocked Badge: Evidence Ace', time: '2d ago' },
        ]);
    }, []);

    if (isLoading) return <div className="py-40 flex flex-col items-center justify-center space-y-6"><Loader className="w-12 h-12 animate-spin text-cyan-500" /><p className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600">Synchronizing Identity Shard...</p></div>;

    return (
        <div className="max-w-[1400px] mx-auto space-y-12 pb-32">
            {/* 1. TOP NAV TOGGLE */}
            <div className="flex justify-center">
                <div className="bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl flex space-x-2 shadow-2xl">
                    <button 
                        onClick={() => setActiveSection('overview')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'overview' ? 'bg-cyan-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Intelligence_Hub
                    </button>
                    <button 
                        onClick={() => setActiveSection('settings')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'settings' ? 'bg-cyan-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Node_Calibration
                    </button>
                </div>
            </div>

            {activeSection === 'overview' ? (
                <div className="space-y-12 animate-fade-in">
                    
                    {/* A. PRIMARY HERO SLOT / BANNER */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-[4.2rem] opacity-20 blur group-hover:opacity-40 transition-opacity duration-1000"></div>
                        <HeroBanner 
                            hero={hero} 
                            onEdit={() => setShowEditProfile(true)}
                            onUpdateAvatar={() => {
                                const el = document.getElementById('persona-minting-station');
                                el?.scrollIntoView({ behavior: 'smooth' });
                            }} 
                        />
                    </div>

                    {!hasIdentities && (
                        <div className="animate-pulse-slow">
                            <button 
                                onClick={() => {
                                    const el = document.getElementById('persona-minting-station');
                                    el?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="w-full p-12 bg-cyan-900/10 border-4 border-dashed border-cyan-800/40 rounded-[3rem] flex flex-col items-center justify-center space-y-8 group hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
                            >
                                <div className="p-8 bg-cyan-950 rounded-full border border-cyan-500/30">
                                    <Fingerprint className="w-16 h-16 text-cyan-400 group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-3xl font-black uppercase text-white tracking-tighter">Initialize_Hero_Protocol</h3>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Awaiting Identity Synthesis. Click to materialize your first operative.</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* B. QUICK ACTIONS */}
                    <QuickActionsRow 
                        onNavigate={onNavigate} 
                        missionCount={2} 
                        mintReady={true}
                    />

                    {/* C. HERO MINTING STATION */}
                    <div id="persona-minting-station" className="space-y-8 pt-8">
                        <div className="flex items-center justify-between px-6">
                            <h3 className="text-sm font-black uppercase text-zinc-500 tracking-[0.4em] flex items-center gap-4">
                                <Sparkles className="w-5 h-5 text-cyan-500" />
                                <span>Hero_Identity_Forge</span>
                            </h3>
                            <div className="bg-cyan-500/10 px-4 py-1.5 rounded-full border border-cyan-500/30">
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Neural_Minting_Active</span>
                            </div>
                        </div>
                        <HeroPersonaManager 
                            personas={hero.personas || []}
                            equippedPersonaId={hero.equippedPersonaId}
                            onAddHeroPersona={onAddHeroPersona}
                            onDeletePersona={onDeleteHeroPersona}
                            onEquipPersona={onEquipHeroPersona}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* D. STATS & TRACKERS */}
                        <div className="lg:col-span-4 space-y-8">
                            <DailyChallengeCard 
                                hero={hero} 
                                setHero={setHero}
                            />
                            
                            <div className="bg-zinc-900/60 border-2 border-zinc-800 rounded-[3rem] p-8 space-y-8 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldCheck className="w-40 h-40 text-emerald-500"/></div>
                                <h3 className="text-xs font-black uppercase text-zinc-500 tracking-[0.3em] flex items-center space-x-3">
                                    <Activity className="w-5 h-5 text-emerald-500" />
                                    <span>Trust_Index</span>
                                </h3>
                                <div className="space-y-6">
                                    <MetricRow label="Verification Rate" value="94%" color="emerald" />
                                    <MetricRow label="Evidence Quality" value="8.8/10" color="cyan" />
                                    <MetricRow label="Appeals Filed" value="0" color="zinc" />
                                </div>
                                <button 
                                    onClick={() => setShowAuditLog(true)}
                                    className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center space-x-3"
                                >
                                    <Database className="w-4 h-4 text-emerald-500" />
                                    <span>View_Full_Audit_Log</span>
                                </button>
                            </div>
                        </div>

                        {/* E. IMPACT DASHBOARD */}
                        <div className="lg:col-span-8 space-y-12">
                            <ImpactDashboard stats={hero.stats} activity={activity} />
                            
                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase text-zinc-500 tracking-[0.4em] px-4 flex items-center gap-4">
                                    <Box className="w-5 h-5 text-cyan-500" />
                                    <span>Inventory_Buffer</span>
                                </h3>
                                <InventoryPreview hero={hero} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <SettingsTabs hero={hero} setHero={setHero} />
                </div>
            )}

            {showAuditLog && <AuditLogModal hero={hero} onClose={() => setShowAuditLog(false)} />}
            {showEditProfile && <EditProfileModal hero={hero} onSave={(data) => { setHero(prev => ({...prev, ...data})); setShowEditProfile(false); }} onClose={() => setShowEditProfile(false)} />}
            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

const MetricRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="flex justify-between items-center px-2">
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
        <span className={`text-xs font-black text-${color}-500`}>{value}</span>
    </div>
);

export default HeroProfileTab;
