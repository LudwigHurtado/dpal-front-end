
import React, { useState, useEffect } from 'react';
import { useTranslations } from '../i18n';
import { List, ArrowRight, Search, Mic, Loader, Megaphone, Sparkles, Monitor, Broadcast, Zap, Database, ShieldCheck, Target, Map, User, Activity, Award, Hash, Gem, FileText, Phone, Globe, Package, Scale, AlertTriangle, Heart, Coins, X, Fingerprint } from './icons';
import { Category } from '../types';
import { CATEGORIES_WITH_ICONS } from '../constants';
import BlockchainStatusPanel from './BlockchainStatusPanel';
import GoogleAdSlot from './GoogleAdSlot';
import { type View, type HeroHubTab, type HubTab } from '../App';
import { featureFlags } from '../features/featureFlags';

interface MainMenuProps {
    onNavigate: (view: View, category?: Category, targetTab?: HeroHubTab | HubTab) => void;
    totalReports: number;
    latestHash?: string;
    latestBlockNumber?: number;
    onGenerateMissionForCategory: (category: Category) => void;
}

const PERIMETER_COLORS = ['#06b6d4', '#f43f5e', '#f59e0b', '#10b981', '#a855f7', '#3b82f6'];

const DualCometBorder: React.FC<{ 
    color: string; 
    radius?: string; 
    visible?: boolean; 
    hoverable?: boolean 
}> = ({ color, radius = "1.8rem", visible = false, hoverable = true }) => (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'} ${hoverable && !visible ? 'group-hover:opacity-100' : ''}`}>
        <rect 
            x="0" y="0" width="100%" height="100%" 
            rx={radius} fill="none" 
            stroke={color} strokeWidth="3"
            className="animate-border-trace-cw"
            style={{ 
                filter: `drop-shadow(0 0 10px ${color})`,
                strokeDasharray: '80 600'
            }}
        />
        <rect 
            x="0" y="0" width="100%" height="100%" 
            rx={radius} fill="none" 
            stroke={color} strokeWidth="2"
            className="opacity-60 animate-border-trace-ccw"
            style={{ 
                filter: `drop-shadow(0 0 12px ${color})`,
                strokeDasharray: '120 800'
            }}
        />
    </svg>
);

const PrimaryNavModule: React.FC<{
    icon: React.ReactNode;
    label: string;
    subLabel: string;
    onClick: () => void;
    colorClass: string;
    status: string;
    bgImageUrl?: string;
    bgImageUrls?: string[];
}> = ({ icon, label, subLabel, onClick, colorClass, status, bgImageUrl, bgImageUrls }) => {
    const hexMap: Record<string, string> = {
        rose: '#f43f5e',
        cyan: '#22d3ee',
        amber: '#f59e0b',
        emerald: '#10b981',
        blue: '#3b82f6',
        purple: '#a855f7'
    };
    const imageSources = (bgImageUrls && bgImageUrls.length > 0)
      ? bgImageUrls
      : (bgImageUrl ? [bgImageUrl] : []);
    const [imageIndex, setImageIndex] = useState(0);

    useEffect(() => {
        if (imageSources.length <= 1) return;
        const interval = setInterval(() => {
            setImageIndex((prev) => (prev + 1) % imageSources.length);
        }, 4500);
        return () => clearInterval(interval);
    }, [imageSources.length]);

    useEffect(() => {
        setImageIndex(0);
    }, [imageSources.length, label]);

    const currentImage = imageSources[imageIndex];

    return (
        <button 
            onClick={onClick}
            className={`relative flex flex-col items-start p-6 rounded-[1.8rem] bg-zinc-900 border-2 border-zinc-700 hover:border-zinc-500 transition-all group overflow-hidden h-full text-left shadow-xl ${colorClass === 'rose' ? 'bg-rose-950/20 border-rose-500/40' : ''}`}
        >
            <DualCometBorder color={hexMap[colorClass] || '#22d3ee'} hoverable={true} />
            
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/10 blur-3xl group-hover:bg-${colorClass}-500/20 transition-colors`}></div>

            {currentImage && (
                <>
                    <img
                        src={encodeURI(currentImage)}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-cover opacity-100"
                    />
                </>
            )}
            
            <div className="relative w-full flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl bg-zinc-950 border border-zinc-700 group-hover:border-${colorClass}-500/50 transition-all shadow-lg`}>
                    <div className={`text-${colorClass}-400 group-hover:scale-110 transition-transform`}>{icon}</div>
                </div>
                <div className="flex items-center space-x-2 bg-black/60 px-3 py-1 rounded-lg border border-zinc-800">
                    <div className={`w-1.5 h-1.5 rounded-full bg-${colorClass}-500 animate-pulse shadow-[0_0_8px_${colorClass}]`}></div>
                    <span className={`text-[8px] font-black uppercase tracking-widest text-${colorClass}-500`}>{status}</span>
                </div>
            </div>

            <div className="relative mt-auto w-full">
                <h3
                    className="text-lg font-black text-white uppercase tracking-tighter leading-none break-words drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] translate-y-2"
                    style={{ WebkitTextStroke: '1.2px rgba(0,0,0,0.95)' }}
                >
                    {label}
                </h3>
            </div>

            <div className={`absolute bottom-6 right-6 text-${colorClass}-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500`}>
                <ArrowRight className="w-5 h-5" />
            </div>
        </button>
    );
};

const MainMenu: React.FC<MainMenuProps> = ({ onNavigate, totalReports, latestHash, latestBlockNumber, onGenerateMissionForCategory }) => {
    const { t } = useTranslations();
    const [categorySearch, setCategorySearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<Category | null>(null);
    
    const [colorIndex, setColorIndex] = useState(0);
    const [showPerimeter, setShowPerimeter] = useState(false);

    useEffect(() => {
        const triggerCycle = () => {
            setShowPerimeter(true);
            setColorIndex(prev => (prev + 1) % PERIMETER_COLORS.length);
            setTimeout(() => {
                setShowPerimeter(false);
            }, 3000);
        };
        triggerCycle();
        const interval = setInterval(triggerCycle, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="animate-fade-in max-w-[1400px] mx-auto px-4 pb-24 font-mono">
            <header className="mb-8 text-center flex flex-col items-center relative pt-4" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 relative z-20">
                {/*
                  Main menu tile images live under:
                  public/main-screen/
                  and are referenced as /main-screen/<filename>.png
                */}
                {(() => {
                    const TILE_IMAGES: Record<string, string> = {
                        FILE_A_REPORT: '/main-screen/file-a-report.png',
                        REPORT_DASHBOARD: '/main-screen/dashboard.png',
                        PUBLIC_LEDGER: '/main-screen/public-ledger.png',
                        MY_REPORTS: '/main-screen/my-reports.png',
                        FIELD_MISSIONS: '/main-screen/field-missions.png',
                        ASSET_ARCHIVE: '/main-screen/asset-archive.png',
                        COIN_EXCHANGE: '/main-screen/coin-exchange.png',
                        ESCROW_SERVICE: '/main-screen/escrow-service.png',
                        DPAL_LOCATOR: '/main-screen/dpa-locator.png',
                        DPAL_GAME_HUB: '/main-screen/dpal-game-hub.png',
                        POLITICIAN_VIEWPOINTS: '/main-screen/politician-viewpoints.png',
                        ESCALATION_HUB: '/main-screen/escalation-hub.png',
                        MINT_STATION: '/main-screen/mint-station.png',
                        QR_LIVE_SAVER: '/main-screen/qr-live-saver.png',
                        WORK_LOG: '/main-screen/work-log.png',
                        WORK_FOR_DPAL_COINS: '/main-screen/work-for-dpal-coins.png',
                        STORAGE_QR: '/main-screen/storage-qr.png',
                    };
                    const tileImage = (label: string): string | undefined => TILE_IMAGES[label];
                    return null as any;
                })()}
                <PrimaryNavModule 
                    icon={<Megaphone className="w-8 h-8" />}
                    label="FILE_A_REPORT"
                    subLabel="Initialize Genesis Accountability Shard"
                    status="READY"
                    colorClass="rose"
                    bgImageUrl="/main-screen/file-a-report.png"
                    onClick={() => onNavigate('categorySelection')}
                />

                <PrimaryNavModule
                    icon={<Monitor className="w-8 h-8" />}
                    label="REPORT_DASHBOARD"
                    subLabel="Open the new reporting command dashboard"
                    status="NEW"
                    colorClass="cyan"
                    bgImageUrl="/main-screen/dashboard.png"
                    onClick={() => onNavigate('reportDashboard')}
                />

                <PrimaryNavModule 
                    icon={<Database className="w-8 h-8" />}
                    label="PUBLIC_LEDGER"
                    subLabel="View All Peer-Verified Shards"
                    status="LIVE_SYNC"
                    colorClass="emerald"
                    bgImageUrl="/main-screen/public-ledger.png"
                    onClick={() => onNavigate('transparencyDatabase')}
                />

                <PrimaryNavModule 
                    icon={<Activity className="w-8 h-8" />}
                    label="MY_REPORTS"
                    subLabel="Your Personal History & Impact Logs"
                    status="SECURE"
                    colorClass="cyan"
                    bgImageUrl="/main-screen/my-reports.png"
                    onClick={() => onNavigate('hub', undefined, 'my_reports')}
                />

                <PrimaryNavModule 
                    icon={<Target className="w-8 h-8" />}
                    label="FIELD_MISSIONS"
                    subLabel="Active Regional Tasks & Directives"
                    status="ACTIVE"
                    colorClass="amber"
                    bgImageUrl="/main-screen/field-missions.png"
                    onClick={() => onNavigate('liveIntelligence')}
                />

                <PrimaryNavModule 
                    icon={<Package className="w-8 h-8" />}
                    label="ASSET_ARCHIVE"
                    subLabel="View Shard Evidence & Milestone Badges"
                    status="SECURE"
                    colorClass="emerald"
                    bgImageUrl="/main-screen/asset-archive.png"
                    onClick={() => onNavigate('heroHub', undefined, 'collection')}
                />

                <PrimaryNavModule 
                    icon={<Coins className="w-8 h-8" />}
                    label="COIN_EXCHANGE"
                    subLabel="Manage P2P Resource & Token Transfers"
                    status="ACTIVE"
                    colorClass="amber"
                    bgImageUrl="/main-screen/coin-exchange.png"
                    onClick={() => onNavigate('heroHub', undefined, 'vault')}
                />

                <PrimaryNavModule 
                    icon={<Fingerprint className="w-8 h-8" />}
                    label="ESCROW_SERVICE"
                    subLabel="Live face + fingerprint verification for P2P escrow"
                    status="KYC"
                    colorClass="cyan"
                    bgImageUrl="/main-screen/escrow-service.png"
                    onClick={() => onNavigate('escrowService')}
                />

                <PrimaryNavModule 
                    icon={<Map className="w-8 h-8" />}
                    label="DPAL_LOCATOR"
                    subLabel="Locate lost people, pets, and items (GPS + photo + voice)"
                    status="LIVE"
                    colorClass="emerald"
                    bgImageUrl="/main-screen/dpa-locator.png"
                    onClick={() => onNavigate('dpalLocator')}
                />

                <PrimaryNavModule
                    icon={<Zap className="w-8 h-8" />}
                    label="DPAL_GAME_HUB"
                    subLabel="Play mission modes, earn progress, and boost civic impact"
                    status="BETA"
                    colorClass="purple"
                    bgImageUrls={["/main-screen/dpal-game-hub.png", "/main-screen/dpal-game-hub 2.png"]}
                    onClick={() => onNavigate('gameHub')}
                />

                <PrimaryNavModule 
                    icon={<Scale className="w-8 h-8" />}
                    label="POLITICIAN_VIEWPOINTS"
                    subLabel="See where local officials stand on upcoming measures"
                    status="CIVIC"
                    colorClass="blue"
                    bgImageUrl="/main-screen/politician-viewpoints.png"
                    onClick={() => onNavigate('politicianTransparency')}
                />

                <PrimaryNavModule
                    icon={<Globe className="w-8 h-8" />}
                    label="OFFSET_MARKETPLACE"
                    subLabel="Verified carbon projects & traceable impact credits"
                    status="MARKET"
                    colorClass="emerald"
                    bgImageUrls={[
                        '/main-screen/Offset-Marketplace/hero-future-carbon-credits.png',
                        '/main-screen/Offset-Marketplace/hero-dpal-sustainability-collage.png',
                        '/main-screen/Offset-Marketplace/hero-meadow-forest-sky.png',
                        '/main-screen/Offset-Marketplace/edu-carbon-credit-forest.png',
                    ]}
                    onClick={() => onNavigate('offsetMarketplace')}
                />

                <PrimaryNavModule 
                    icon={<Phone className="w-8 h-8" />}
                    label="ESCALATION_HUB"
                    subLabel="Automated AI Vox & Live Field Queue"
                    status="ALERT"
                    colorClass="rose"
                    onClick={() => onNavigate('outreachEscalation')}
                />

                <PrimaryNavModule 
                    icon={<Gem className="w-8 h-8" />}
                    label="MINT_STATION"
                    subLabel="Forge Permanent Truth Artifacts"
                    status="ACTIVE"
                    colorClass="amber"
                    onClick={() => onNavigate('heroHub', undefined, 'mint')}
                />

                <PrimaryNavModule 
                    icon={<Activity className="w-8 h-8" />}
                    label="QR_LIVE_SAVER"
                    subLabel="Sync Life-Line Medical Shards"
                    status="HEALTH"
                    colorClass="rose"
                    onClick={() => onNavigate('medicalOutpost')}
                />

                <PrimaryNavModule 
                    icon={<Broadcast className="w-8 h-8" />}
                    label="FIELD_MISSIONS"
                    subLabel="Beacon, Map & Help Requests — Join or Offer Help"
                    status="LIVE"
                    colorClass="emerald"
                    onClick={() => onNavigate('fieldMissions')}
                />

                <PrimaryNavModule 
                    icon={<Activity className="w-8 h-8" />}
                    label="WORK_LOG"
                    subLabel="Community Contribution Feed"
                    status="LOGGING"
                    colorClass="blue"
                    onClick={() => onNavigate('hub', undefined, 'work_feed')}
                />

                <PrimaryNavModule
                    icon={<Coins className="w-8 h-8" />}
                    label="WORK_FOR_DPAL_COINS"
                    subLabel="No money value. Earn via cards, NFTs, and DPAL coins."
                    status="REWARDS"
                    colorClass="amber"
                    onClick={() => onNavigate('reportWorkPanel')}
                />

                <PrimaryNavModule 
                    icon={<Database className="w-8 h-8" />}
                    label="STORAGE_QR"
                    subLabel="MongoDB data location & QR link to this page"
                    status="NODE"
                    colorClass="cyan"
                    onClick={() => onNavigate('storage')}
                />
            </div>

            <div className="flex justify-end mb-12">
                <button
                    onClick={() => onNavigate('outreachEscalation')}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-xl border border-emerald-500/40 bg-zinc-950 hover:border-emerald-400 transition-all text-emerald-300 font-black text-xs uppercase tracking-[0.2em]"
                >
                    <Globe className="w-4 h-4" />
                    Governance Protocol
                </button>
            </div>

            <BlockchainStatusPanel totalReports={totalReports} latestHash={latestHash} latestBlockNumber={latestBlockNumber} />

            <div className="my-8 bg-zinc-900/70 border border-zinc-800 rounded-3xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sponsored Transparency</p>
                    <span className="text-[10px] text-zinc-600 uppercase">Ad</span>
                </div>
                <GoogleAdSlot
                    slot={import.meta.env.VITE_ADSENSE_SLOT_HOME || import.meta.env.VITE_ADSENSE_SLOT_SUPPORT_NODE || ''}
                    format="auto"
                    className="rounded-xl overflow-hidden"
                    style={{ minHeight: 120 }}
                />
            </div>
            
            <div className="my-20 border-t border-zinc-900"></div>
            
            <div className="flex flex-col items-center gap-8 mb-16 max-w-4xl mx-auto relative z-20">
                <h2 className="text-3xl font-black text-white tracking-tighter text-center uppercase leading-none">Dispatch_Directory</h2>
                <div className="w-full">
                     <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-8">
                            <Search className="h-6 w-6 text-zinc-600 group-focus-within:text-cyan-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="Filter targets by domain..."
                          className="w-full pl-20 pr-20 py-6 bg-zinc-950 border-2 border-zinc-800 rounded-[2.5rem] focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all text-white font-bold tracking-tight text-xl shadow-inner uppercase placeholder:text-zinc-900"
                        />
                    </div>
                </div>
            </div>
            
            <div className="relative p-1 rounded-[3.5rem] group/grid overflow-visible z-20">
                <DualCometBorder 
                    color={PERIMETER_COLORS[colorIndex]} 
                    radius="3.5rem" 
                    visible={showPerimeter} 
                    hoverable={false}
                />
                
                <div className="bg-black/40 rounded-[3.4rem] p-8 md:p-12 border border-zinc-900 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {[...CATEGORIES_WITH_ICONS]
                          .sort((a, b) => t(a.translationKey).localeCompare(t(b.translationKey)))
                          .filter(cat => t(cat.translationKey).toLowerCase().includes(categorySearch.toLowerCase()))
                          .map((cat) => (
                            <div
                                key={cat.value}
                                className={`group/card relative rounded-[2.5rem] overflow-hidden transition-all duration-300 border-2 ${activeCategory === cat.value ? 'bg-zinc-900 border-cyan-500 shadow-2xl scale-[1.03] z-20' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 shadow-lg'}`}
                            >
                                <DualCometBorder color="#06b6d4" radius="2.5rem" hoverable={true} />
                                <button
                                    onClick={() => setActiveCategory(activeCategory === cat.value ? null : cat.value)}
                                    className="w-full flex flex-col items-center justify-center text-center p-10 min-h-[200px]"
                                >
                                    <div className="text-6xl mb-6 transition-transform duration-500 group-hover/card:scale-110">
                                    {cat.icon}
                                    </div>
                                    <span className="font-black text-lg text-white transition-colors tracking-tight uppercase">
                                    {t(cat.translationKey)}
                                    </span>
                                </button>
                                {activeCategory === cat.value && (
                                    <div className="p-8 border-t border-zinc-800 animate-fade-in-fast flex flex-col gap-4 bg-zinc-950">
                                        <button
                                            onClick={() => onNavigate('reportSubmission', cat.value)}
                                            className="group/btn relative w-full flex items-center justify-center space-x-4 bg-white text-black font-black py-5 px-6 rounded-2xl hover:bg-rose-50 transition-all uppercase text-xs tracking-widest shadow-xl active:scale-95 overflow-hidden border-2 border-transparent hover:border-rose-500/50"
                                        >
                                            <DualCometBorder color="#f43f5e" radius="1rem" hoverable={true} />
                                            <Megaphone className="w-5 h-5 relative z-10 text-rose-600" />
                                            <span className="relative z-10">File_A_Report</span>
                                        </button>
                                        <button
                                            onClick={() => onGenerateMissionForCategory(cat.value)}
                                            className="group/btn relative w-full flex items-center justify-center space-x-4 bg-cyan-600 text-white font-black py-5 px-6 rounded-2xl hover:bg-cyan-500 transition-all uppercase text-xs tracking-widest shadow-xl active:scale-95 overflow-hidden border-2 border-transparent hover:border-cyan-300/50"
                                        >
                                            <DualCometBorder color="#ffffff" radius="1rem" hoverable={true} />
                                            <Zap className="w-5 h-5 fill-current relative z-10" />
                                            <span className="relative z-10">Tactical_Missions</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

             <style>{`
                .neon-glimmer {
                    color: #fff;
                    text-shadow: 0 0 7px #fff, 0 0 10px #06b6d4, 0 0 21px #06b6d4;
                    animation: glimmer 3s infinite alternate;
                }
                @keyframes glimmer {
                    from { opacity: 1; text-shadow: 0 0 7px #fff, 0 0 10px #06b6d4, 0 0 21px #06b6d4; }
                    to { opacity: 0.7; text-shadow: 0 0 4px #fff, 0 0 7px #06b6d4, 0 0 15px #06b6d4; }
                }
                
                @keyframes border-trace-cw {
                    0% { stroke-dashoffset: 1100; }
                    100% { stroke-dashoffset: 0; }
                }
                @keyframes border-trace-ccw {
                    0% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: 1350; }
                }
                .animate-border-trace-cw {
                    animation: border-trace-cw 3s linear infinite;
                }
                .animate-border-trace-ccw {
                    animation: border-trace-ccw 2.5s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default MainMenu;
