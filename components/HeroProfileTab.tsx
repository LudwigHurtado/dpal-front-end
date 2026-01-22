import React, { useState, useEffect } from 'react';
import { type Hero, Archetype, HeroPath, type LedgerEvent, type DailyChallenge } from '../types';
import { useTranslations } from '../i18n';
import { 
    Loader, ShieldCheck, Zap, Sparkles, Target, Box, Database, 
    Monitor, Search, Pencil, User, Award, Activity, Clock, 
    ChevronRight, Settings, List, Plus, Layout as LayoutIcon, Coins 
} from './icons';
import HeroBanner from './profile/HeroBanner';
import QuickActionsRow from './profile/QuickActionsRow';
import DailyChallengeCard from './profile/DailyChallengeCard';
import ImpactDashboard from './profile/ImpactDashboard';
import InventoryPreview from './profile/InventoryPreview';
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

    const apiBase = (import.meta as any).env?.VITE_API_BASE || 'https://dpal-backend.up.railway.app';

    // Mock/Persisted Activity Feed
    const [activity, setActivity] = useState<any[]>([]);

    useEffect(() => {
        // Fetch real-time feed and stats here
        setActivity([
            { id: '1', icon: <CheckCircle className="w-3 h-3 text-emerald-500"/>, label: 'Verified "Unsafe Meal Report"', time: '2h ago' },
            { id: '2', icon: <Megaphone className="w-3 h-3 text-rose-500"/>, label: 'Submitted "HOA Abuse" Shard', time: '5h ago' },
            { id: '3', icon: <Coins className="w-3 h-3 text-amber-500"/>, label: 'Earned 25 Credits (Audit Bonus)', time: '1d ago' },
            { id: '4', icon: <Award className="w-3 h-3 text-cyan-400"/>, label: 'Unlocked Badge: Evidence Ace', time: '2d ago' },
        ]);
    }, []);

    const updateHeroField = async (field: string, value: any) => {
        setHero(prev => ({ ...prev, [field]: value }));
        try {
            await fetch(`${apiBase}/api/profile/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
        } catch (e) { console.error("Sync Failure", e); }
    };

    if (isLoading) return <div className="py-40 flex flex-col items-center justify-center space-y-6"><Loader className="w-12 h-12 animate-spin text-cyan-500" /><p className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600">Synchronizing Identity Shard...</p></div>;

    return (
        <div className="max-w-[1400px] mx-auto space-y-12 pb-32">
            {/* 1. TOP NAV TOGGLE (Settings vs Overview) */}
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
                    {/* A. HERO BANNER */}
                    <HeroBanner 
                        hero={hero} 
                        onEdit={() => setShowEditProfile(true)}
                        onUpdateAvatar={() => onNavigate('heroHub', undefined, 'profile')} 
                    />

                    {/* B. QUICK ACTIONS */}
                    <QuickActionsRow 
                        onNavigate={onNavigate} 
                        missionCount={2} 
                        mintReady={true}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* C. DAILY CHALLENGE (LEFT) */}
                        <div className="lg:col-span-4 space-y-8">
                            <DailyChallengeCard 
                                hero={hero} 
                                setHero={setHero}
                            />
                            
                            {/* REPUTATION SUMMARY (DPAL FEEL) */}
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

                        {/* D. IMPACT DASHBOARD & ACTIVITY (RIGHT) */}
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
        </div>
    );
};

const MetricRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="flex justify-between items-center px-2">
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
        <span className={`text-xs font-black text-${color}-500`}>{value}</span>
    </div>
);

const CheckCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const Megaphone: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m3 11 18-5v12L3 13v-2Z" />
        <line x1="11.6" x2="11.6" y1="16.5" y2="21" />
    </svg>
);

export default HeroProfileTab;