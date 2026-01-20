
import React, { useEffect } from 'react';
import type { MissionCompletionSummary } from '../types';
import { useTranslations } from '../i18n';
// Added ShieldCheck to imports
import { HeroCreditCoin, Gem, Award, ArrowLeft, QrCode, ShieldCheck } from './icons';

interface MissionCompleteViewProps {
    mission: MissionCompletionSummary;
    onReturn: () => void;
}

const DebugStamp: React.FC<{ missionTitle: string }> = ({ missionTitle }) => {
    // Only show in development/non-production
    if (process.env.NODE_ENV === 'production') return null;
    return (
        <div className="fixed bottom-2 left-2 z-[999] bg-black/80 text-[8px] font-mono text-cyan-500 p-2 rounded border border-cyan-500/30 pointer-events-none uppercase">
            [SYS_TRACE] Screen: missionComplete | Build: v2.5.0-STABLE | Mission: {missionTitle}
        </div>
    );
};

const MissionCompleteView: React.FC<MissionCompleteViewProps> = ({ mission, onReturn }) => {
    const { t } = useTranslations();
    
    useEffect(() => {
        console.log(`[DPAL_TRACE] Component: MissionCompleteView | Route: missionComplete | Mission: ${mission.title}`);
    }, [mission.title]);

    // In a real app, this would be a dynamic link to the mission completion details
    const baseUrl = window.location.origin;
    const deepLinkUrl = `${baseUrl}?missionId=${encodeURIComponent(mission.title)}`; 
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(deepLinkUrl)}&bgcolor=111827&color=34d399&margin=10`;

    return (
        <div className="flex flex-col items-center justify-start min-h-full bg-gray-900 text-white rounded-3xl p-6 md:p-12 relative overflow-y-auto animate-fade-in">
            <DebugStamp missionTitle={mission.title} />
            
            {/* Background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50 opacity-50 pointer-events-none"></div>
             <div className="absolute top-0 left-0 w-full h-full sparkle-bg pointer-events-none"></div>

            <div className="relative z-10 text-center max-w-3xl w-full py-8">
                <Award className="w-20 h-20 md:w-24 md:h-24 text-yellow-400 mx-auto mb-6 animate-bounce-custom" />
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">{t('missionComplete.title')}</h1>
                <p className="text-base md:text-lg text-zinc-400 font-bold uppercase tracking-widest mb-2">{t('missionComplete.subtitle')}</p>
                <p className="text-xl md:text-2xl font-black text-cyan-400 uppercase tracking-tight mb-12">"{mission.title}"</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-12">
                    <div className="bg-black/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-zinc-800 flex flex-col justify-center shadow-2xl">
                        <h2 className="text-xs font-black text-zinc-500 mb-8 uppercase tracking-[0.4em]">{t('missionComplete.rewardsClaimed')}</h2>
                        <div className="space-y-6">
                            {/* HeroCredits */}
                            <div className="flex items-center space-x-5 text-xl font-black">
                                <HeroCreditCoin className="w-10 h-10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
                                <span className="uppercase tracking-tight">{mission.rewardHeroCredits} {t('heroHub.heroCredits')}</span>
                            </div>
                            {/* Legend Tokens */}
                            {mission.rewardLegendTokens && (
                                <div className="flex items-center space-x-5 text-xl font-black">
                                    <Gem className="w-10 h-10 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]" />
                                    <span className="uppercase tracking-tight">{mission.rewardLegendTokens} {t('heroHub.legendTokens')}</span>
                                </div>
                            )}
                            {/* NFT Item */}
                            <div className="flex items-center space-x-6 border-t border-zinc-800/50 pt-6 mt-4">
                                <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-zinc-800">
                                    {mission.rewardNft.icon}
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="font-black text-white uppercase tracking-tighter truncate">{mission.rewardNft.name}</p>
                                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">{t('missionCard.completionReward')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-950/20 backdrop-blur-md p-8 rounded-[2.5rem] border border-emerald-500/30 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><QrCode className="w-20 h-20 text-emerald-500"/></div>
                        <div className="flex items-center space-x-3 text-emerald-400 mb-6 font-black uppercase text-[10px] tracking-[0.3em]">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Ledger_Seal_Verified</span>
                        </div>
                        <div className="bg-white p-4 rounded-3xl mb-6 shadow-[0_0_30px_rgba(52,211,153,0.2)] transform hover:scale-105 transition-transform duration-500">
                            <img src={qrImageUrl} alt="Mission QR" className="w-32 h-32 md:w-40 md:h-40" />
                        </div>
                        <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest leading-relaxed max-w-[20ch]">Scan to view record on the public transparency node.</p>
                        <p className="text-[9px] font-mono text-emerald-500/30 mt-4 tracking-tighter">BLOCK_REF: #6843{Math.floor(Math.random()*999)}</p>
                    </div>
                </div>
                
                <div className="flex flex-col items-center space-y-6">
                    <button
                        onClick={onReturn}
                        className="w-full sm:w-auto min-w-[280px] bg-white hover:bg-zinc-100 text-black font-black py-6 px-12 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-4xl active:scale-95 transition-all flex items-center justify-center space-x-4 border-b-8 border-zinc-300"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>{t('missionComplete.returnToHub')}</span>
                    </button>
                    
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.5em]">Synchronizing personal ledger archive...</p>
                </div>
            </div>

             <style>{`
                .sparkle-bg {
                    background-image:
                        radial-gradient(white, rgba(255,255,255,.2) 1px, transparent 40px),
                        radial-gradient(white, rgba(255,255,255,.15) 1px, transparent 30px);
                    background-size: 550px 550px, 350px 350px;
                    background-position: 0 0, 40px 60px;
                    animation: sparkle 15s linear infinite;
                }

                @keyframes sparkle {
                    from { background-position: 0 0, 40px 60px; }
                    to { background-position: -550px -550px, -310px -310px; }
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

                @keyframes bounce-custom {
                    0%, 100% { transform: translateY(-10%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
                    50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
                }
                .animate-bounce-custom { animation: bounce-custom 2s infinite; }
            `}</style>
        </div>
    );
};

export default MissionCompleteView;
