
import React, { useState, useMemo } from 'react';
import { CATEGORIES_WITH_ICONS } from '../constants';
import { Category } from '../types';
import { useTranslations } from '../i18n';
import { ArrowLeft, ShieldCheck, Search, X, AlertTriangle } from './icons';

interface CategorySelectionViewProps {
  onSelectCategory: (category: Category) => void;
  onSelectMissions: (category: Category) => void;
  onSelectWork?: (category: Category) => void;
  onSelectPlay?: () => void;
  onSelectHelp?: () => void;
  onReturnToHub: () => void;
}

const BorderPulse: React.FC<{ color: string }> = ({ color }) => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
        <rect 
            x="0" y="0" width="100%" height="100%" 
            rx="2.5rem" fill="none" 
            stroke={color} strokeWidth="3"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-border-trace"
            style={{ 
                filter: `drop-shadow(0 0 10px ${color})`,
                strokeDasharray: '120 1200'
            }}
        />
    </svg>
);

const categoryImageSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const categoryImageByType: Partial<Record<Category, string>> = {
  [Category.AccidentsRoadHazards]: '/category-cards/accidents-and-road-hazards.png',
  [Category.Allergies]: '/category-cards/allergies.png',
  [Category.CivicDuty]: '/category-cards/civic-duty.png',
  [Category.Clergy]: '/category-cards/clergy.png',
  [Category.ConsumerScams]: '/category-cards/consumer-scams.png',
  [Category.MedicalNegligence]: '/category-cards/medical-negligence.png',
  [Category.Education]: '/category-cards/education.png',
  [Category.ElderlyCare]: '/category-cards/elder-abuse.png',
  [Category.Events]: '/category-cards/event-transparency.png',
  [Category.FireEnvironmentalHazards]: '/category-cards/fire-environmental-hazards.png',
  [Category.PublicSafetyAlerts]: '/category-cards/public-safety-alerts.png',
  [Category.Environment]: '/category-cards/environment.png',
  [Category.HousingIssues]: '/category-cards/housing-issues.png',
  [Category.Infrastructure]: '/category-cards/infrastructure.png',
  [Category.WorkplaceIssues]: '/category-cards/workplace-issues.png',
  [Category.InsuranceFraud]: '/category-cards/insurance fraud.png',
  [Category.ProfessionalServices]: '/category-cards/profesional-services.png',
  [Category.P2PEscrowVerification]: '/category-cards/marketplace-transactions-escrow.png',
  [Category.PoliceMisconduct]: '/category-cards/police-misconduct.png',
  [Category.StolenPropertyRegistry]: '/category-cards/stolen-property-registry.png',
  [Category.NonProfit]: '/category-cards/Non-Profit.png',
  [Category.ProofOfLifeBiometric]: '/category-cards/proof of life  biometric verification.png',
  [Category.PublicTransport]: '/category-cards/public transport.png',
  [Category.Travel]: '/category-cards/travel.png',
  [Category.IndependentDiscoveries]: '/category-cards/Independent Discoveries.png',
  [Category.Other]: '/category-cards/Independent Discoveries.png',
};

type SpritePos = { x: number; y: number };

// Sprite sheet support: one collage image sliced per category card.
// Grid is 3 columns x 2 rows in the provided collage.
const CATEGORY_SPRITE_POSITIONS: Partial<Record<Category, SpritePos>> = {
  [Category.AccidentsRoadHazards]: { x: 0, y: 0 },
  [Category.Allergies]: { x: 1, y: 0 },
  [Category.CivicDuty]: { x: 2, y: 0 },
  [Category.Clergy]: { x: 0, y: 1 },
  [Category.ConsumerScams]: { x: 1, y: 1 },
  [Category.ElderlyCare]: { x: 2, y: 1 },
};

const SPRITE_SRC = '/category-cards/category-collage.png';

const CategorySelectionView: React.FC<CategorySelectionViewProps> = ({ onSelectCategory, onSelectMissions, onSelectWork, onSelectPlay, onSelectHelp, onReturnToHub }) => {
    const { t } = useTranslations();
    const [searchQuery, setSearchQuery] = useState('');
    const [hiddenCategoryImages, setHiddenCategoryImages] = useState<Record<string, boolean>>({});

    const filteredCategories = useMemo(() => {
        const sorted = [...CATEGORIES_WITH_ICONS].sort((a, b) => t(a.translationKey).localeCompare(t(b.translationKey)));
        if (!searchQuery.trim()) return sorted;
        
        const query = searchQuery.toLowerCase();
        return sorted.filter(cat => 
            t(cat.translationKey).toLowerCase().includes(query) ||
            cat.value.toLowerCase().includes(query)
        );
    }, [searchQuery, t]);

    return (
        <div className="animate-fade-in font-mono text-white max-w-7xl mx-auto px-4 pb-20">
            <button
                onClick={onReturnToHub}
                className="inline-flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-cyan-400 transition-colors mb-12 group"
            >
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span>TERMINAL_RETURN</span>
            </button>

            <header className="mb-12 text-center">
                <div className="flex items-center justify-center space-x-4 mb-4">
                    <ShieldCheck className="w-10 h-10 text-cyan-500" />
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">Category_Picker</h1>
                </div>
                <p className="text-zinc-500 text-xs font-bold tracking-[0.4em] uppercase mb-10">Select target domain for field reporting or tactical missions</p>

                {/* Tactical Search Field */}
                <div className="max-w-2xl mx-auto relative group">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                        <Search className={`w-6 h-6 transition-colors ${searchQuery ? 'text-cyan-500' : 'text-zinc-700'}`} />
                    </div>
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="FILTER_DOMAINS_BY_KEYWORD..."
                        className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] pl-16 pr-16 py-6 text-lg font-black uppercase tracking-widest text-white outline-none focus:border-cyan-500 focus:ring-8 focus:ring-cyan-500/5 transition-all shadow-inner placeholder:text-zinc-800"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-6 flex items-center text-zinc-600 hover:text-rose-500 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </header>

            {filteredCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredCategories.map((cat) => (
                        <div
                            key={cat.value}
                            className="group flex flex-col bg-zinc-900/40 rounded-[2.5rem] border-2 border-zinc-800 hover:border-zinc-600 transition-all duration-500 relative overflow-hidden shadow-2xl p-8"
                        >
                            <BorderPulse color="#06b6d4" />
                            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity"></div>

                            {/* CATEGORY TITLE (above image, never on top of it) */}
                            <div className="relative z-10 text-center pb-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-300">
                                    {t(cat.translationKey)}
                                </div>
                            </div>

                            {/* HERO IMAGE REGION (separate from buttons) */}
                            <div className="relative flex-1 min-h-[220px] rounded-[2rem] overflow-hidden border border-white/10 bg-black/20">
                                {!hiddenCategoryImages[cat.value] && (
                                    <img
                                        src={encodeURI(categoryImageByType[cat.value] || `/category-cards/${categoryImageSlug(cat.value)}.png`)}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover object-center opacity-100 transition-opacity"
                                        onError={() =>
                                            setHiddenCategoryImages((prev) => ({
                                                ...prev,
                                                [cat.value]: true,
                                            }))
                                        }
                                    />
                                )}

                                {hiddenCategoryImages[cat.value] && CATEGORY_SPRITE_POSITIONS[cat.value] && (
                                    <div
                                        className="absolute inset-0 opacity-35 group-hover:opacity-45 transition-opacity"
                                        style={{
                                            backgroundImage: `url(${SPRITE_SRC})`,
                                            backgroundSize: '300% 200%',
                                            backgroundPosition: `${(CATEGORY_SPRITE_POSITIONS[cat.value]!.x * 100) / 2}% ${(CATEGORY_SPRITE_POSITIONS[cat.value]!.y * 100)}%`,
                                            backgroundRepeat: 'no-repeat',
                                        }}
                                    />
                                )}

                                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/0 via-zinc-950/10 to-zinc-950/30" />
                            </div>

                            {/* ACTION BAR: Report | Icon | Actions (menu) */}
                            <div className="mt-5 relative z-20 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => onSelectCategory(cat.value)}
                                    className="flex-1 inline-flex items-center justify-center bg-white text-black font-black py-3 px-4 rounded-2xl hover:bg-zinc-200 transition-all shadow-lg text-[10px] tracking-widest uppercase"
                                >
                                    Report
                                </button>

                                <div className="w-12 h-12 rounded-2xl border border-white/10 bg-black/40 backdrop-blur flex items-center justify-center flex-shrink-0">
                                    <span className="text-3xl leading-none">{cat.icon}</span>
                                </div>

                                <div className="relative flex-1 group/actions">
                                    <button
                                        type="button"
                                        className="w-full inline-flex items-center justify-center bg-cyan-600 text-white font-black py-3 px-4 rounded-2xl hover:bg-cyan-500 transition-all shadow-lg text-[10px] tracking-widest uppercase"
                                        aria-haspopup="menu"
                                    >
                                        Actions
                                    </button>

                                    <div
                                        className="absolute right-0 left-0 mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur shadow-2xl overflow-hidden opacity-0 pointer-events-none translate-y-1 transition-all duration-150 group-hover/actions:opacity-100 group-hover/actions:pointer-events-auto group-hover/actions:translate-y-0"
                                        role="menu"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => onSelectPlay?.()}
                                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-900 text-[10px] font-black uppercase tracking-widest"
                                            role="menuitem"
                                        >
                                            Play
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onSelectHelp?.()}
                                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-900 text-[10px] font-black uppercase tracking-widest"
                                            role="menuitem"
                                        >
                                            Help
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => (onSelectWork || onSelectMissions)(cat.value)}
                                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-900 text-[10px] font-black uppercase tracking-widest"
                                            role="menuitem"
                                        >
                                            Work
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onSelectCategory(cat.value)}
                                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-900 text-[10px] font-black uppercase tracking-widest"
                                            role="menuitem"
                                        >
                                            Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-32 text-center space-y-8 animate-fade-in">
                    <div className="p-8 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-[3rem] inline-block">
                        <AlertTriangle className="w-16 h-16 text-zinc-800" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black uppercase text-zinc-700 tracking-tighter">Null_Set_Detected</h3>
                        <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest mt-2">No categories matching "{searchQuery}" in local blocks.</p>
                    </div>
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="px-10 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Clear Search Query
                    </button>
                </div>
            )}

            <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes border-trace {
                    0% { stroke-dashoffset: 1320; }
                    100% { stroke-dashoffset: 0; }
                }
                .animate-border-trace {
                    animation: border-trace 3s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default CategorySelectionView;
