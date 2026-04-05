import React, { useEffect, useMemo, useState } from 'react';
import { type Hero, type Archetype, type HeroPersona } from '../types';
import { type Category } from '../types';
import { type View, type HeroHubTab, type HubTab } from '../App';
import { Loader, ShieldCheck, Sparkles, Box, Database, Activity, Coins, Heart } from './icons';

import HeroBanner from './profile/HeroBanner';
import QuickActionsRow from './profile/QuickActionsRow';
import DailyChallengeCard from './profile/DailyChallengeCard';
import ImpactDashboard from './profile/ImpactDashboard';
import InventoryPreview from './profile/InventoryPreview';
import HeroPersonaManager from './HeroPersonaManager';
import SettingsTabs from './profile/SettingsTabs';
import AuditLogModal from './modals/AuditLogModal';
import EditProfileModal from './modals/EditProfileModal';

type NavigateTab = HeroHubTab | HubTab;
type NavigateFn = (view: View, cat?: Category, tab?: NavigateTab) => void;

type ActivityItem = {
    id: string;
    icon: React.ReactNode;
    label: string;
    time: string;
};

interface HeroProfileTabProps {
    hero: Hero;
    setHero: React.Dispatch<React.SetStateAction<Hero>>;
    onNavigate: NavigateFn;
    onAddHeroPersona: (description: string, archetype: Archetype, sourceImage?: string) => Promise<void>;
    onDeleteHeroPersona: (personaId: string) => void;
    onEquipHeroPersona: (personaId: string | null) => void;
    onGenerateBackstory?: () => Promise<void>;
    onSaveHeroPersona?: (persona: HeroPersona) => Promise<void>;
    onMintHeroPersona?: (persona: HeroPersona) => Promise<void>;
}

const MetricRow: React.FC<{ label: string; value: string; valueClass: string }> = ({ label, value, valueClass }) => (
    <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-medium text-stone-500">{label}</span>
        <span className={`text-xs font-semibold ${valueClass}`}>{value}</span>
    </div>
);

const HeroProfileTab: React.FC<HeroProfileTabProps> = ({
    hero,
    setHero,
    onNavigate,
    onAddHeroPersona,
    onDeleteHeroPersona,
    onEquipHeroPersona,
    onSaveHeroPersona,
    onMintHeroPersona,
}) => {
    const [isLoading] = useState(false);
    const [showAuditLog, setShowAuditLog] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [activeSection, setActiveSection] = useState<'overview' | 'settings'>('overview');

    if (!hero) {
        return (
            <div className="p-6 font-sans">
                <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6">
                    <div className="text-lg font-semibold text-stone-100">No profile loaded</div>
                    <p className="mt-2 text-sm text-stone-400">Create or select a profile, then open this tab again.</p>
                </div>
            </div>
        );
    }

    const hasIdentities = useMemo(() => (hero.personas || []).length > 0, [hero.personas]);

    const [activity, setActivity] = useState<ActivityItem[]>([]);
    useEffect(() => {
        setActivity([
            {
                id: '1',
                icon: <Activity className="h-3.5 w-3.5 text-emerald-500" />,
                label: 'Supported a food-safety report nearby',
                time: '2h ago',
            },
            {
                id: '2',
                icon: <Heart className="h-3.5 w-3.5 text-rose-400" />,
                label: 'Shared a housing concern with care',
                time: '5h ago',
            },
            {
                id: '3',
                icon: <Coins className="h-3.5 w-3.5 text-amber-400" />,
                label: 'Earned thank-you credits (community bonus)',
                time: '1d ago',
            },
            {
                id: '4',
                icon: <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />,
                label: 'Badge: trusted helper',
                time: '2d ago',
            },
        ]);
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-32 font-sans">
                <Loader className="h-10 w-10 animate-spin text-amber-500" />
                <p className="text-sm font-medium text-stone-500">Loading your home space…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1400px] space-y-10 pb-28 font-sans antialiased">
            <div className="flex justify-center">
                <div className="flex rounded-2xl border border-stone-700/80 bg-stone-900/90 p-1 shadow-lg">
                    <button
                        type="button"
                        onClick={() => setActiveSection('overview')}
                        className={`rounded-xl px-6 py-2.5 text-xs font-semibold transition-colors ${
                            activeSection === 'overview'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'text-stone-400 hover:text-stone-200'
                        }`}
                    >
                        Home & heart
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('settings')}
                        className={`rounded-xl px-6 py-2.5 text-xs font-semibold transition-colors ${
                            activeSection === 'settings'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'text-stone-400 hover:text-stone-200'
                        }`}
                    >
                        Settings
                    </button>
                </div>
            </div>

            {activeSection === 'overview' ? (
                <div className="animate-fade-in space-y-10">
                    <HeroBanner
                        hero={hero}
                        onEdit={() => setShowEditProfile(true)}
                        onUpdateAvatar={() => {
                            document.getElementById('persona-minting-station')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    />

                    {!hasIdentities && (
                        <button
                            type="button"
                            onClick={() =>
                                document.getElementById('persona-minting-station')?.scrollIntoView({ behavior: 'smooth' })
                            }
                            className="group w-full rounded-3xl border-2 border-dashed border-amber-800/50 bg-amber-950/20 p-10 text-center transition-colors hover:border-amber-600/50 hover:bg-amber-950/30"
                        >
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-700/40 bg-amber-950/50 text-3xl transition-transform group-hover:scale-105">
                                🤗
                            </div>
                            <h3 className="text-xl font-semibold text-stone-50">Add a friendly face</h3>
                            <p className="mx-auto mt-2 max-w-md text-sm text-stone-400">
                                Optional portrait or nickname so neighbors recognize you—great for families building trust together.
                            </p>
                        </button>
                    )}

                    <QuickActionsRow onNavigate={onNavigate} missionCount={2} mintReady={true} />

                    <div id="persona-minting-station" className="space-y-4 pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-300">
                                <Sparkles className="h-5 w-5 text-amber-400" />
                                Your identities & portraits
                            </h3>
                            <span className="rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1 text-[10px] font-semibold text-emerald-300">
                                Private by default
                            </span>
                        </div>

                        <HeroPersonaManager
                            hero={hero}
                            personas={hero.personas || []}
                            equippedPersonaId={hero.equippedPersonaId}
                            onAddHeroPersona={onAddHeroPersona}
                            onDeletePersona={onDeleteHeroPersona}
                            onEquipPersona={onEquipHeroPersona}
                            onSavePersona={onSaveHeroPersona}
                            onMintPersona={onMintHeroPersona}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                        <div className="space-y-8 lg:col-span-4">
                            <DailyChallengeCard hero={hero} setHero={setHero} />

                            <div className="relative overflow-hidden rounded-3xl border border-stone-700/80 bg-stone-900/70 p-7 shadow-lg">
                                <div className="pointer-events-none absolute -right-4 -top-4 opacity-[0.07]">
                                    <ShieldCheck className="h-36 w-36 text-emerald-500" />
                                </div>
                                <h3 className="relative z-10 mb-6 flex items-center gap-2 text-sm font-semibold text-stone-200">
                                    <Activity className="h-5 w-5 text-emerald-400" />
                                    Trust & care
                                </h3>
                                <div className="relative z-10 space-y-4">
                                    <MetricRow label="Verification rate" value="94%" valueClass="text-emerald-400" />
                                    <MetricRow label="Clarity of what you share" value="8.8/10" valueClass="text-sky-300" />
                                    <MetricRow label="Disputes" value="0" valueClass="text-stone-400" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAuditLog(true)}
                                    className="relative z-10 mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-600 bg-stone-950/60 py-3 text-[11px] font-semibold text-stone-300 transition-colors hover:bg-stone-800"
                                >
                                    <Database className="h-4 w-4 text-emerald-500" />
                                    View full kindness log
                                </button>
                            </div>
                        </div>

                        <div className="space-y-10 lg:col-span-8">
                            <ImpactDashboard stats={hero.stats} activity={activity} />

                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-stone-300">
                                    <Box className="h-5 w-5 text-amber-400" />
                                    Collection
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

            {showEditProfile && (
                <EditProfileModal
                    hero={hero}
                    onSave={(data) => {
                        setHero((prev) => ({ ...prev, ...data }));
                        setShowEditProfile(false);
                    }}
                    onClose={() => setShowEditProfile(false)}
                />
            )}
        </div>
    );
};

export default HeroProfileTab;
