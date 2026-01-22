import React from 'react';
import { type Hero } from '../../types';
import { RANKS } from '../../constants';
import { Pencil, ShieldCheck, Zap, Award, Hash } from '../icons';

interface HeroBannerProps {
    hero: Hero;
    onEdit: () => void;
    onUpdateAvatar: () => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ hero, onEdit, onUpdateAvatar }) => {
    const nextRank = RANKS.find(r => r.level === hero.rank + 1);
    const xpProgress = nextRank ? (hero.xp / nextRank.xpNeeded) * 100 : 100;

    return (
        <div className="relative w-full bg-zinc-900 border-4 border-zinc-800 rounded-[4rem] p-10 md:p-14 overflow-hidden shadow-4xl group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(6,182,212,0.1),transparent)]"></div>
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-cyan-500/5 blur-[100px] rounded-full"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                {/* Avatar Deck */}
                <div className="relative">
                    <div 
                        onClick={onUpdateAvatar}
                        className="w-44 h-44 md:w-56 md:h-56 rounded-[3.5rem] p-1.5 bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-500 border-4 border-zinc-950"
                    >
                        <img 
                            src={hero.personas.find(p => p.id === hero.equippedPersonaId)?.imageUrl || 'https://i.imgur.com/8p8Vp6V.png'} 
                            alt="Hero" 
                            className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700" 
                        />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black px-4 py-1.5 rounded-xl font-black text-[10px] border-2 border-zinc-950 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>VERIFIED</span>
                    </div>
                </div>

                {/* Identity Info */}
                <div className="flex-grow text-center md:text-left space-y-6">
                    <div className="space-y-2">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">{hero.name}</h1>
                            <span className="text-cyan-500 font-bold text-xl md:text-2xl tracking-tighter mb-1">@{hero.handle || 'operative'}</span>
                        </div>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.4em] max-w-xl line-clamp-2 italic">
                            "{hero.bio || 'Active ledger operative patrolling the decentralized frontier.'}"
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <div className="bg-zinc-950 border border-zinc-800 px-6 py-2.5 rounded-2xl flex items-center space-x-3">
                            <Award className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-black text-white uppercase tracking-widest">{hero.equippedTitle || hero.title}</span>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 px-6 py-2.5 rounded-2xl flex items-center space-x-3">
                            <Zap className="w-5 h-5 text-rose-500 animate-pulse" />
                            <span className="text-sm font-black text-white uppercase tracking-widest">🔥 {hero.streak || 0} Day Streak</span>
                        </div>
                        <button 
                            onClick={onEdit}
                            className="p-3 bg-zinc-800 hover:bg-white hover:text-black rounded-2xl transition-all border border-zinc-700"
                        >
                            <Pencil className="w-5 h-5" />
                        </button>
                    </div>

                    {/* XP Progression */}
                    <div className="space-y-3 pt-4 max-w-2xl">
                        <div className="flex justify-between items-end px-2">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rank_Advancement_Protocol</p>
                            <p className="text-sm font-black text-emerald-500">{Math.round(xpProgress)}% to {nextRank?.title.toUpperCase() || 'MAX'}</p>
                        </div>
                        <div className="w-full bg-zinc-950 rounded-full h-3 border border-zinc-800 overflow-hidden shadow-inner">
                            <div className="h-full bg-cyan-500 transition-all duration-1000 shadow-[0_0_20px_cyan]" style={{ width: `${xpProgress}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Tactical Stats Panel */}
                <div className="bg-zinc-950/80 border-2 border-zinc-800 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center space-y-6 min-w-[200px]">
                    <div className="text-center">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Impact_Score</p>
                        <p className="text-4xl font-black text-white tracking-tighter">{hero.masteryScore.toLocaleString()}</p>
                    </div>
                    <div className="w-full h-px bg-zinc-800"></div>
                    <div className="flex items-center space-x-4">
                        <div className="text-center">
                            <p className="text-[7px] font-black text-zinc-600 uppercase mb-1">Credits</p>
                            <p className="text-lg font-black text-amber-500">{hero.heroCredits.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[7px] font-black text-zinc-600 uppercase mb-1">Reputation</p>
                            <p className="text-lg font-black text-cyan-400">{hero.reputation.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroBanner;