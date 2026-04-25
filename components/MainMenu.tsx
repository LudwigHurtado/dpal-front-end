
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from '../i18n';
import { List, ArrowRight, Search, Mic, Loader, Megaphone, Sparkles, Monitor, Broadcast, Zap, Database, ShieldCheck, Target, Map, User, Activity, Award, Hash, Gem, FileText, Phone, Globe, Package, Scale, AlertTriangle, Heart, Coins, X, Fingerprint, Waves } from './icons';
import { Category } from '../types';
import { CATEGORIES_WITH_ICONS, getValidatorPortalUrl } from '../constants';
import {
  CATEGORY_SPRITE_POSITIONS,
  CATEGORY_SPRITE_SHEET_SRC,
  getCategoryCardImageSrc,
} from '../categoryCardAssets';
import BlockchainStatusPanel from './BlockchainStatusPanel';
import GoogleAdSlot from './GoogleAdSlot';
import { type View, type HeroHubTab, type HubTab } from '../App';
import { featureFlags } from '../features/featureFlags';

type BlockLookupResult = { ok: true } | { ok: false; reason: 'invalid' | 'not_found' };

interface MainMenuProps {
    onNavigate: (view: View, category?: Category, targetTab?: HeroHubTab | HubTab) => void;
    totalReports: number;
    latestHash?: string;
    latestBlockNumber?: number;
    /** Resolve a ledger block height to the certified filing (local + API when configured). */
    onOpenReportByBlock?: (raw: string) => Promise<BlockLookupResult>;
    onGenerateMissionForCategory: (category: Category) => void;
    /** Dispatch Directory Actions menu — same behavior as category picker when provided. */
    onDispatchPlay?: () => void;
    onDispatchHelp?: () => void;
    onDispatchWork?: (category: Category) => void;
    onDispatchMissions?: (category: Category) => void;
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
    imageCycleMs?: number;
}> = ({ icon, label, subLabel, onClick, colorClass, status, bgImageUrl, bgImageUrls, imageCycleMs = 4500 }) => {
    const hexMap: Record<string, string> = {
        rose: '#f43f5e',
        cyan: '#22d3ee',
        amber: '#f59e0b',
        emerald: '#10b981',
        blue: '#3b82f6',
        purple: '#a855f7',
        teal: '#14b8a6',
        sky: '#0ea5e9',
    };
    const imageSources = (bgImageUrls && bgImageUrls.length > 0)
      ? bgImageUrls
      : (bgImageUrl ? [bgImageUrl] : []);
    const [imageIndex, setImageIndex] = useState(0);

    useEffect(() => {
        if (imageSources.length <= 1) return;
        const interval = setInterval(() => {
            setImageIndex((prev) => (prev + 1) % imageSources.length);
        }, imageCycleMs);
        return () => clearInterval(interval);
    }, [imageSources.length, imageCycleMs]);

    useEffect(() => {
        setImageIndex(0);
    }, [imageSources.length, label]);

    const currentImage = imageSources[imageIndex];

    return (
        <button 
            onClick={onClick}
            className={`relative flex flex-col items-start p-6 rounded-[1.8rem] dpal-bg-panel border-2 dpal-border-subtle hover:border-[var(--dpal-border-strong)] transition-all group overflow-hidden h-full text-left shadow-xl ${colorClass === 'rose' ? 'bg-rose-950/20 border-rose-500/40' : ''}`}
        >
            <DualCometBorder color={hexMap[colorClass] || '#22d3ee'} hoverable={true} />
            
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/10 blur-3xl group-hover:bg-${colorClass}-500/20 transition-colors`}></div>

            {currentImage && (
                <>
                    <img
                        src={encodeURI(currentImage)}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-contain object-center opacity-100 dpal-bg-deep"
                    />
                </>
            )}
            
            <div className="relative w-full flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl dpal-bg-deep border dpal-border-emphasis group-hover:border-${colorClass}-500/50 transition-all shadow-lg`}>
                    <div className={`text-${colorClass}-400 group-hover:scale-110 transition-transform`}>{icon}</div>
                </div>
                <div className="flex items-center space-x-2 bg-[var(--dpal-overlay-soft)] px-3 py-1 rounded-lg border dpal-border-subtle">
                    <div className={`w-1.5 h-1.5 rounded-full bg-${colorClass}-500 animate-pulse shadow-[0_0_8px_${colorClass}]`}></div>
                    <span className={`text-[8px] font-semibold tracking-wide text-${colorClass}-400`}>{status}</span>
                </div>
            </div>

            <div className="relative mt-auto w-full">
                <h3
                    className="translate-y-2 text-lg font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] break-words"
                    style={{ WebkitTextStroke: '1px rgba(0,0,0,0.85)' }}
                >
                    {label}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-200/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                    {subLabel}
                </p>
            </div>

            <div className={`absolute bottom-6 right-6 text-${colorClass}-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500`}>
                <ArrowRight className="w-5 h-5" />
            </div>
        </button>
    );
};

const MainMenu: React.FC<MainMenuProps> = ({
    onNavigate,
    totalReports,
    latestHash,
    latestBlockNumber,
    onOpenReportByBlock,
    onGenerateMissionForCategory,
    onDispatchPlay,
    onDispatchHelp,
    onDispatchWork,
    onDispatchMissions,
}) => {
    const { t } = useTranslations();

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
                        MY_CONTRIBUTIONS: '/main-screen/my-reports.png',
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
                        WORK_LOG: '/main-screen/weekly-work-log.png',
                        COMMUNITY_TIMELINE: '/main-screen/weekly-work-log.png',
                        WORK_FOR_DPAL_COINS: '/next-view/sector-dpal-coin.png',
                        STORAGE_QR: '/main-screen/storage-qr.png',
                        'DPAL HELP': '/category-cards/dpal-help.png',
                    };
                    const tileImage = (label: string): string | undefined => TILE_IMAGES[label];
                    return null as any;
                })()}
                <PrimaryNavModule 
                    icon={<Megaphone className="w-8 h-8" />}
                    label="Share a Report"
                    subLabel="Speak up for neighbors with kindness"
                    status="Ready"
                    colorClass="rose"
                    bgImageUrl="/main-screen/file-a-report.png"
                    onClick={() => onNavigate('categorySelection')}
                />

                <PrimaryNavModule
                    icon={<Monitor className="w-8 h-8" />}
                    label="Validator Node"
                    subLabel="Verifier Action Portal — review queue and outbound actions"
                    status="Live"
                    colorClass="blue"
                    bgImageUrl="/main-screen/validator-node.png"
                    onClick={() => {
                        const url = getValidatorPortalUrl();
                        if (url) {
                            // Same-tab navigation so the hub "enters" the Validator portal (back button returns).
                            window.location.assign(url);
                            return;
                        }
                        const msg =
                            'Validator Node URL is not set. Add VITE_VALIDATOR_PORTAL_URL to .env.local (e.g. https://dpal-reviewer-node.vercel.app) and restart Vite.';
                        if (import.meta.env.DEV) {
                            console.warn('[DPAL]', msg);
                        } else {
                            window.alert(msg);
                        }
                    }}
                />

                <PrimaryNavModule
                    icon={<Sparkles className="w-8 h-8" />}
                    label="Help Center"
                    subLabel="Fix issues, get support, resolve problems"
                    status="New"
                    colorClass="cyan"
                    bgImageUrl="/category-cards/dpal-help.png"
                    onClick={() => onNavigate('helpCenter')}
                />


                <PrimaryNavModule 
                    icon={<Database className="w-8 h-8" />}
                    label="Public Record"
                    subLabel="See what the community has verified together"
                    status="Connected"
                    colorClass="emerald"
                    bgImageUrl="/main-screen/public-ledger.png"
                    onClick={() => onNavigate('transparencyDatabase')}
                />

                <PrimaryNavModule 
                    icon={<Activity className="w-8 h-8" />}
                    label="My Contributions"
                    subLabel="Your personal story of care and impact"
                    status="Safe"
                    colorClass="cyan"
                    bgImageUrl="/main-screen/my-reports.png"
                    onClick={() => onNavigate('hub', undefined, 'my_reports')}
                />

                <PrimaryNavModule
                    icon={<Target className="w-8 h-8" />}
                    label="Missions"
                    subLabel="V2 assignment workspace — tasks, proof, escrow, and service layers"
                    status="Main"
                    colorClass="blue"
                    bgImageUrl="/main-screen/dpal-work-network.png"
                    onClick={() => onNavigate('missionMarketplace')}
                />

                <PrimaryNavModule 
                    icon={<Package className="w-8 h-8" />}
                    label="My Collection"
                    subLabel="Evidence, badges, and milestones you earned"
                    status="Yours"
                    colorClass="emerald"
                    bgImageUrl="/main-screen/asset-archive.png"
                    onClick={() => onNavigate('heroHub', undefined, 'collection')}
                />

                <PrimaryNavModule 
                    icon={<Coins className="w-8 h-8" />}
                    label="Wallet & Coins"
                    subLabel="Share resources with people you trust"
                    status="Open"
                    colorClass="amber"
                    bgImageUrl="/main-screen/coin-exchange.png"
                    onClick={() => onNavigate('heroHub', undefined, 'vault')}
                />

                <PrimaryNavModule 
                    icon={<Fingerprint className="w-8 h-8" />}
                    label="Trusted Escrow"
                    subLabel="Face-to-face verification for safer trades"
                    status="Verified"
                    colorClass="cyan"
                    bgImageUrl="/main-screen/escrow-service.png"
                    onClick={() => onNavigate('escrowService')}
                />

                <PrimaryNavModule 
                    icon={<Map className="w-8 h-8" />}
                    label="Family Locator"
                    subLabel="Find loved ones, pets, and precious things"
                    status="Live"
                    colorClass="emerald"
                    bgImageUrl="/main-screen/dpa-locator.png"
                    onClick={() => onNavigate('dpalLocator')}
                />

                <PrimaryNavModule
                    icon={<Zap className="w-8 h-8" />}
                    label="Play & Learn"
                    subLabel="Games that celebrate doing good together"
                    status="Beta"
                    colorClass="purple"
                    bgImageUrls={["/main-screen/dpal-game-hub.png", "/main-screen/dpal-game-hub 2.png"]}
                    onClick={() => onNavigate('gameHub')}
                />

                <PrimaryNavModule 
                    icon={<Scale className="w-8 h-8" />}
                    label="Local Leaders"
                    subLabel="See where officials stand — with clarity"
                    status="Civic"
                    colorClass="blue"
                    bgImageUrl="/main-screen/politician-viewpoints.png"
                    onClick={() => onNavigate('politicianTransparency')}
                />

                <PrimaryNavModule
                    icon={<Globe className="w-8 h-8" />}
                    label="Environmental Intelligence Hub"
                    subLabel="Monitor conditions, verify claims, run audits, and generate evidence-backed environmental reports."
                    status="Open Hub"
                    colorClass="teal"
                    bgImageUrl="/main-screen/Offset-Marketplace/hero-dpal-sustainability-collage.png"
                    onClick={() => onNavigate('environmentalIntelligenceHub')}
                />

                <PrimaryNavModule
                    icon={<Phone className="w-8 h-8" />}
                    label="Urgent Help Line"
                    subLabel="Reach caring support when minutes matter"
                    status="Here"
                    colorClass="rose"
                    bgImageUrl="/main-screen/escalation-hub.png"
                    onClick={() => onNavigate('outreachEscalation')}
                />

                <PrimaryNavModule
                    icon={<Scale className="w-8 h-8" />}
                    label="Resolution Layer"
                    subLabel="Track verified cases through outcomes and accountability"
                    status="Live"
                    colorClass="cyan"
                    bgImageUrl="/main-screen/resolution-layer.png"
                    onClick={() => onNavigate('resolutionLayer')}
                />

                <PrimaryNavModule 
                    icon={<Gem className="w-8 h-8" />}
                    label="Keepsake Studio"
                    subLabel="Turn verified truth into lasting mementos"
                    status="Bright"
                    colorClass="amber"
                    bgImageUrl="/main-screen/mint-station.png"
                    onClick={() => onNavigate('heroHub', undefined, 'mint')}
                />

                <PrimaryNavModule 
                    icon={<Activity className="w-8 h-8" />}
                    label="Health Lifeline"
                    subLabel="Medical QR that stays with you"
                    status="Care"
                    colorClass="rose"
                    bgImageUrls={[
                        "/main-screen/medical-qr-flow-en.png",
                        "/main-screen/medical-qr-flow-es.png",
                    ]}
                    imageCycleMs={5000}
                    onClick={() => onNavigate('medicalOutpost')}
                />

<PrimaryNavModule
                    icon={<Coins className="w-8 h-8" />}
                    label="DPAL Work Network"
                    subLabel="Mission marketplace — choose work that matters"
                    status="Bright"
                    colorClass="amber"
                    bgImageUrl="/main-screen/dpal-mission-control-hero.png"
                    onClick={() => onNavigate('aiWorkDirectives')}
                />

                <PrimaryNavModule
                    icon={<ShieldCheck className="w-8 h-8" />}
                    label="DPAL Lifts"
                    subLabel="Decentralized Public Assistance Lifts"
                    status="Soon"
                    colorClass="emerald"
                    bgImageUrl="/category-cards/dpal-lifts.png"
                    onClick={() => onNavigate('goodWheels')}
                />

                <PrimaryNavModule 
                    icon={<Database className="w-8 h-8" />}
                    label="Saved Data"
                    subLabel="Your backup link and storage snapshot"
                    status="Saved"
                    colorClass="cyan"
                    onClick={() => onNavigate('storage')}
                />
            </div>


            <BlockchainStatusPanel
                totalReports={totalReports}
                latestHash={latestHash}
                latestBlockNumber={latestBlockNumber}
                onOpenReportByBlock={onOpenReportByBlock}
            />

            <div className="my-8 dpal-bg-panel-soft border dpal-border-subtle rounded-3xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black dpal-text-muted uppercase tracking-widest">Sponsored Transparency</p>
                    <span className="text-[10px] dpal-text-muted uppercase">Ad</span>
                </div>
                <GoogleAdSlot
                    slot={import.meta.env.VITE_ADSENSE_SLOT_HOME || import.meta.env.VITE_ADSENSE_SLOT_SUPPORT_NODE || ''}
                    format="auto"
                    className="rounded-xl overflow-hidden"
                    style={{ minHeight: 120 }}
                />
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
