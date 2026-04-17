
import React, { useState } from 'react';
import { SkillLevel, type Mission, type Hero, type Category, type Report, type IapPack, type StoreItem, type SkillNode, type HeroPersona, Archetype } from '../types';
import { useTranslations } from '../i18n';
import { type HeroHubTab, type HubTab, type View } from '../App';
import { ArrowLeft, Loader, Coins, Gem, Zap, UserCircle, Store, Broadcast, MapPin, Monitor, Target, Search, ListFilter, Package, Heart, List } from './icons';
import { RANKS, CATEGORIES_WITH_ICONS } from '../constants';
import CollectionCodex from './CollectionCodex';
import HeroPersonaMintStation from './HeroPersonaMintStation';
import StoreView from './StoreView';
import HeroPersonaManager from './HeroPersonaManager';
import HeroProfileTab from './HeroProfileTab';
import TacticalVault from './TacticalVault';

interface HeroHubProps {
  onReturnToHub: () => void;
  missions: Mission[];
  isLoadingMissions: boolean;
  hero: Hero;
  setHero: React.Dispatch<React.SetStateAction<Hero>>;
  heroLocation: string;
  setHeroLocation: (loc: string) => void;
  onGenerateNewMissions: (preferences: { skillLevel: SkillLevel; categories: Category[]; location?: string; }) => void;
  reports: Report[];
  iapPacks: IapPack[];
  storeItems: StoreItem[];
  onInitiateHCPurchase: (pack: IapPack) => void;
  onInitiateStoreItemPurchase: (item: StoreItem) => void;
  onAddHeroPersona: (description: string, archetype: Archetype, sourceImage?: string) => Promise<void>;
  onDeleteHeroPersona: (personaId: string) => void;
  onEquipHeroPersona: (personaId: string | null) => void;
  onGenerateHeroBackstory: () => Promise<void>;
  onSaveHeroPersona?: (persona: HeroPersona) => Promise<void>;
  onMintHeroPersona?: (persona: HeroPersona) => Promise<void>;
  onNavigateToMissionDetail: (mission: Mission) => void;
  onNavigate: (view: View, category?: Category, targetTab?: HeroHubTab | HubTab) => void;
  activeTab: HeroHubTab;
  setActiveTab: (tab: HeroHubTab) => void;
}

const QUICK_LOCATIONS = ["San Jose, CA", "Los Angeles, CA", "Chicago, IL", "New York, NY", "Gerlach, NV"];

const DeploymentConsole: React.FC<{
  onGenerate: (preferences: { skillLevel: SkillLevel; categories: Category[]; location?: string; }) => void;
  isGenerating: boolean;
  location: string;
  setLocation: (loc: string) => void;
}> = ({ onGenerate, isGenerating, location, setLocation }) => {
    const { t } = useTranslations();
    const [skillLevel, setSkillLevel] = useState<SkillLevel>(SkillLevel.Beginner);
    const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

    const handleGenerate = () => {
        onGenerate({ skillLevel, categories: selectedCategories, location });
    };

    const handleCategoryToggle = (category: Category) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    return (
        <div className="relative mb-16 overflow-hidden rounded-[2rem] border border-stone-700/80 bg-stone-900/70 p-8 shadow-xl md:rounded-[2.5rem] md:p-12">
            <div className="pointer-events-none absolute right-0 top-0 p-10 opacity-[0.04]">
                <Target className="h-48 w-48 text-amber-500" />
            </div>

            <div className="relative z-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
                <div className="space-y-6 lg:col-span-3">
                    <label className="flex items-center gap-3 text-sm font-semibold text-stone-400">
                        <Zap className="h-5 w-5 text-amber-400" />
                        <span>Comfort level</span>
                    </label>
                    <div className="flex flex-col gap-4">
                        {Object.values(SkillLevel).map(level => (
                            <button
                                key={level}
                                onClick={() => setSkillLevel(level as SkillLevel)}
                                className={`rounded-2xl border-2 px-6 py-4 text-left text-sm font-semibold transition-all ${
                                    skillLevel === level 
                                    ? 'border-amber-500 bg-amber-500/15 text-amber-50 shadow-md' 
                                    : 'border-stone-700 bg-stone-950 text-stone-500 hover:border-stone-600'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{t(`skillLevels.${(level as string).toLowerCase()}`)}</span>
                                    {skillLevel === level && <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400 shadow-md" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6 lg:col-span-4">
                    <label className="flex items-center gap-3 text-sm font-semibold text-stone-400">
                        <MapPin className="h-5 w-5 text-rose-400" />
                        <span>Your area</span>
                    </label>
                    <div className="space-y-4">
                        <div className="group relative">
                            <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-stone-600 transition-colors group-focus-within:text-amber-500" />
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="City, neighborhood, or ZIP"
                                className="w-full rounded-2xl border-2 border-stone-700 bg-stone-950 py-5 pl-14 pr-5 text-base font-medium text-white outline-none transition-all placeholder:text-stone-600 focus:border-amber-600/50 focus:ring-2 focus:ring-amber-500/20"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_LOCATIONS.map(city => (
                                <button
                                    key={city}
                                    type="button"
                                    onClick={() => setLocation(city)}
                                    className={`rounded-xl border px-4 py-2 text-[11px] font-semibold transition-all ${
                                        location === city ? 'border-amber-500 bg-amber-500/15 text-amber-100' : 'border-stone-700 bg-stone-950 text-stone-500 hover:border-stone-600'
                                    }`}
                                >
                                    {city.split(',')[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6 lg:col-span-5">
                    <label className="flex items-center gap-3 text-sm font-semibold text-stone-400">
                        <ListFilter className="h-5 w-5 text-emerald-400" />
                        <span>What you care about</span>
                    </label>
                    <div className="custom-scrollbar h-[220px] overflow-y-auto rounded-2xl border-2 border-stone-700 bg-stone-950 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {CATEGORIES_WITH_ICONS.map(cat => {
                                const isSelected = selectedCategories.includes(cat.value);
                                return (
                                    <button
                                        key={cat.value}
                                        onClick={() => handleCategoryToggle(cat.value)}
                                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                            isSelected 
                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-50 shadow-sm' 
                                            : 'border-stone-700 bg-stone-900 text-stone-500 hover:border-stone-600 hover:text-stone-300'
                                        }`}
                                    >
                                        <span className="text-2xl">{cat.icon}</span>
                                        <span className="truncate text-[11px] font-semibold leading-tight">{t(cat.translationKey)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-stone-700/80 pt-10 sm:flex-row">
                <div className="flex items-center gap-3 rounded-2xl border border-stone-700 bg-stone-950/80 px-6 py-3">
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 shadow-md" />
                    <span className="text-xs font-medium text-stone-500">Ready to find local ways to help</span>
                </div>
                
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || !location}
                    className="flex min-w-[280px] items-center justify-center gap-3 rounded-2xl bg-amber-600 px-10 py-5 text-sm font-semibold text-stone-950 shadow-lg transition-all hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 disabled:opacity-50 active:scale-[0.99] sm:w-auto"
                >
                    {isGenerating ? <Loader className="h-6 w-6 animate-spin text-stone-900"/> : <Broadcast className="h-6 w-6 text-stone-900"/>}
                    <span>{isGenerating ? 'Finding ideas…' : 'Find ways to help'}</span>
                </button>
            </div>
        </div>
    );
};


const HeroHub: React.FC<HeroHubProps> = ({
  onReturnToHub,
  missions,
  isLoadingMissions,
  hero,
  setHero,
  heroLocation,
  setHeroLocation,
  onGenerateNewMissions,
  reports,
  iapPacks,
  storeItems,
  onInitiateHCPurchase,
  onInitiateStoreItemPurchase,
  onAddHeroPersona,
  onDeleteHeroPersona,
  onEquipHeroPersona,
  onGenerateHeroBackstory,
  onSaveHeroPersona,
  onMintHeroPersona,
  onNavigateToMissionDetail,
  onNavigate,
  activeTab,
  setActiveTab
}) => {
  const { t } = useTranslations();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateMissions = async (preferences: { skillLevel: SkillLevel; categories: Category[]; location?: string; }) => {
    setIsGenerating(true);
    await onGenerateNewMissions(preferences);
    setIsGenerating(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserCircle },
    { id: 'missions', label: 'Missions', icon: List },
    { id: 'training', label: 'Learn', icon: Monitor },
    { id: 'vault', label: 'Wallet', icon: Coins },
    { id: 'collection', label: 'Collection', icon: Package },
    { id: 'mint', label: 'Create', icon: Gem },
    { id: 'store', label: 'Shop', icon: Store },
  ];

  return (
    <div className="animate-fade-in min-h-screen font-sans text-white">
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <button
          onClick={onReturnToHub}
          className="group inline-flex items-center gap-3 text-sm font-semibold text-stone-400 transition-colors hover:text-amber-200"
        >
          <ArrowLeft className="h-6 w-6 transition-transform group-hover:-translate-x-1" />
          <span>Back to home</span>
        </button>
        <div className="flex items-center gap-4">
             <div className="rounded-2xl border border-amber-700/40 bg-amber-950/30 p-3 shadow-md">
                <Heart className="h-8 w-8 text-amber-400" />
            </div>
            <div>
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-stone-50 md:text-3xl">You & your community</h1>
                <p className="mt-1 text-sm font-medium text-stone-500">Family · unity · help</p>
            </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto w-full">
        <div className="sticky top-[6.5rem] z-[80] mb-16 flex items-center justify-start space-x-1 overflow-x-auto rounded-3xl border border-stone-700/80 bg-stone-900/95 p-1.5 shadow-xl backdrop-blur-xl no-scrollbar md:rounded-[2rem]">
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (tab.id === 'briefing') {
                                onNavigate('liveIntelligence');
                            } else {
                                setActiveTab(tab.id as HeroHubTab)
                            }
                        }}
                        className={`flex flex-shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[10px] font-semibold tracking-wide transition-all duration-300 md:gap-3 md:px-8 md:py-4 md:text-xs ${
                            isActive ? 'bg-amber-600 text-white shadow-md md:scale-[1.02]' : 'text-stone-500 hover:bg-stone-800 hover:text-stone-200'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <TabIcon className="h-4 w-4 md:h-5 md:w-5" />
                        <span>{tab.label}</span>
                    </button>
                );
            })}
        </div>

        <div className="animate-fade-in-fast relative h-full">
            {activeTab === 'profile' && (
              <HeroProfileTab 
                hero={hero} 
                setHero={setHero} 
                onNavigate={onNavigate}
                onAddHeroPersona={onAddHeroPersona}
                onDeleteHeroPersona={onDeleteHeroPersona}
                onEquipHeroPersona={onEquipHeroPersona}
                onGenerateBackstory={onGenerateHeroBackstory}
                onSaveHeroPersona={onSaveHeroPersona}
                onMintHeroPersona={onMintHeroPersona}
              />
            )}

            {activeTab === 'missions' && (
            <div className="space-y-16 max-w-[1400px] mx-auto pb-32">
              <DeploymentConsole onGenerate={handleGenerateMissions} isGenerating={isGenerating} location={heroLocation} setLocation={setHeroLocation} />

              <div className="space-y-20">
                {missions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-10">
                        {missions.map(m => {
                            const totalSteps = (m.reconActions?.length || 0) + (m.mainActions?.length || 0) || 1;
                            const currentIdx = m.status === 'completed' ? totalSteps : (m.currentActionIndex || 0);
                            const progressPercent = Math.round((currentIdx / totalSteps) * 100);

                            return (
                                <button 
                                    key={m.id}
                                    type="button"
                                    onClick={() => onNavigateToMissionDetail(m)}
                                    className={`group relative w-full overflow-hidden rounded-[2rem] border-2 p-8 text-left transition-all duration-500 md:rounded-[2.5rem] md:p-10 ${m.status === 'completed' ? 'border-emerald-900/40 bg-stone-900/50 opacity-90' : 'border-stone-700 bg-stone-900/80 hover:border-amber-700/50 hover:shadow-lg'}`}
                                >
                                    <div className="absolute left-0 top-0 h-full w-1.5 bg-amber-600/40 transition-opacity group-hover:bg-amber-500/60" />
                                    <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                                        <div className="min-w-0 flex-grow pl-3">
                                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                                <span className={`rounded-full border px-4 py-1.5 text-[10px] font-semibold ${m.status === 'completed' ? 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300' : 'border-amber-600/40 bg-amber-950/30 text-amber-200'}`}>
                                                    {m.status === 'completed' ? 'Completed' : 'In progress'}
                                                </span>
                                                <span className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-[10px] font-medium text-stone-500">
                                                    Mission #{m.id.split('-').pop()}
                                                </span>
                                            </div>
                                            <h4 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-stone-50 md:text-3xl">{m.title}</h4>
                                            <p className="mb-5 line-clamp-2 border-l-2 border-amber-800/50 pl-4 text-sm font-medium leading-relaxed text-stone-400">"{m.backstory}"</p>
                                            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-stone-500">
                                                <span className="flex items-center gap-2"><Target className="h-5 w-5 text-amber-500"/>{m.category}</span>
                                                <span className="flex items-center gap-2"><MapPin className="h-5 w-5 text-rose-400"/>{m.location || 'Your area'}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex w-full flex-shrink-0 flex-col items-stretch gap-4 lg:w-auto lg:items-end">
                                            <div className="flex items-center gap-8 rounded-2xl border border-stone-700 bg-stone-950/80 px-6 py-5 shadow-inner">
                                                <div className="text-center">
                                                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-500">Feels doable</p>
                                                    <p className="text-3xl font-bold tabular-nums text-stone-50">{Math.round(m.successProbability * 100)}%</p>
                                                </div>
                                                <div className="h-10 w-px bg-stone-700" />
                                                <div className="text-center">
                                                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-stone-500">Credits</p>
                                                    <div className="flex items-center gap-2 text-2xl font-bold text-amber-400">
                                                        <span>{m.finalReward.hc}</span><Coins className="h-6 w-6"/>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex max-w-[300px] items-center gap-3">
                                                <div className="h-2 flex-grow overflow-hidden rounded-full border border-stone-700 bg-stone-950">
                                                    <div className={`h-full transition-all duration-1000 ${m.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progressPercent}%` }}></div>
                                                </div>
                                                <span className="text-xs font-semibold text-stone-500">{progressPercent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-[2.5rem] border-2 border-dashed border-stone-700 bg-stone-900/30 py-24 text-center">
                        <Heart className="mx-auto mb-6 h-16 w-16 text-stone-700 opacity-40" />
                        <h3 className="text-xl font-semibold text-stone-500">No missions yet</h3>
                        <p className="mx-auto mt-2 max-w-sm text-sm text-stone-600">Set your area above— we’ll suggest ways to help nearby.</p>
                    </div>
                )}
              </div>
            </div>
            )}

            {activeTab === 'collection' && <CollectionCodex reports={reports} hero={hero} onReturn={() => setActiveTab('missions')} />}
            {activeTab === 'mint' && <HeroPersonaMintStation hero={hero} onAddHeroPersona={onAddHeroPersona} />}
            {activeTab === 'store' && <StoreView hero={hero} iapPacks={iapPacks} storeItems={storeItems} onInitiateHCPurchase={onInitiateHCPurchase} onInitiateStoreItemPurchase={onInitiateStoreItemPurchase} onReturn={() => setActiveTab('missions')} isEmbedded />}
            {activeTab === 'vault' && <TacticalVault hero={hero} setHero={setHero} onReturn={() => setActiveTab('missions')} reports={reports} />}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default HeroHub;
