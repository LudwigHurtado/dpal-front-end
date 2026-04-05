import React from 'react';
import { type Hero } from '../../types';
import { RANKS } from '../../constants';
import { Pencil, Heart, Award, Sun } from '../icons';

interface HeroBannerProps {
    hero: Hero;
    onEdit: () => void;
    onUpdateAvatar: () => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ hero, onEdit, onUpdateAvatar }) => {
    const heroRank = hero?.rank || 1;
    const heroXp = hero?.xp || 0;
    const nextRank = RANKS.find(r => r.level === heroRank + 1);
    const xpProgress = nextRank ? (heroXp / nextRank.xpNeeded) * 100 : 100;

    const equippedPersona = hero?.personas?.find(p => p.id === hero.equippedPersonaId);
    const avatarUrl = equippedPersona?.imageUrl || 'https://i.imgur.com/8p8Vp6V.png';

    return (
        <div className="relative w-full overflow-hidden rounded-3xl border border-amber-900/30 bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950/40 p-8 shadow-xl md:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(251,191,36,0.08),transparent_50%)]" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center gap-10 md:flex-row md:items-start">
                <div className="relative shrink-0">
                    <button
                        type="button"
                        onClick={onUpdateAvatar}
                        className="group relative overflow-hidden rounded-3xl border-4 border-amber-200/20 bg-stone-800 p-1 shadow-lg transition-transform hover:scale-[1.02]"
                        title="Update your photo"
                    >
                        <img
                            src={avatarUrl}
                            alt=""
                            className="h-44 w-44 rounded-2xl object-cover transition-all duration-500 group-hover:brightness-105 md:h-52 md:w-52"
                        />
                    </button>
                    <div className="absolute -bottom-1 -right-1 flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-emerald-600 px-3 py-1 text-[10px] font-semibold text-white shadow-md">
                        <Heart className="h-3.5 w-3.5 fill-white/20" />
                        <span>Here to help</span>
                    </div>
                </div>

                <div className="min-w-0 flex-1 space-y-5 text-center md:text-left">
                    <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-amber-200/80">
                            Your profile — family, unity, care
                        </p>
                        <div className="flex flex-col items-center gap-1 md:flex-row md:items-baseline md:gap-3">
                            <h1 className="text-3xl font-bold leading-tight tracking-tight text-stone-50 md:text-4xl">
                                {equippedPersona?.name || hero?.name || 'Friend'}
                            </h1>
                            <span className="text-lg font-medium text-amber-200/90">@{hero?.handle || 'neighbor'}</span>
                        </div>
                        <p className="mx-auto max-w-xl text-sm leading-relaxed text-stone-300 md:mx-0">
                            {equippedPersona?.backstory ||
                                hero?.bio ||
                                'Share a little about you—how you show up for family and neighbors.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                        <div className="flex items-center gap-2 rounded-2xl border border-stone-600/60 bg-stone-800/80 px-4 py-2">
                            <Award className="h-5 w-5 text-amber-400" />
                            <span className="text-sm font-semibold text-stone-100">
                                {hero?.equippedTitle || hero?.title || 'Neighbor'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-stone-600/60 bg-stone-800/80 px-4 py-2">
                            <Sun className="h-5 w-5 text-amber-300" />
                            <span className="text-sm font-semibold text-stone-100">
                                {hero?.streak || 0} day caring streak
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onEdit}
                            className="rounded-2xl border border-stone-500 bg-stone-800/90 p-3 text-stone-200 transition-colors hover:border-amber-400/50 hover:bg-stone-700"
                            title="Edit profile"
                        >
                            <Pencil className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="max-w-xl space-y-2 pt-2">
                        <div className="flex items-end justify-between px-1 text-xs">
                            <span className="font-medium text-stone-400">Growing together</span>
                            <span className="font-semibold text-emerald-400">
                                {Math.round(xpProgress)}% toward {nextRank?.title || 'the next step'}
                            </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full border border-stone-700 bg-stone-950">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-700"
                                style={{ width: `${Math.min(100, xpProgress)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex w-full min-w-[200px] flex-col items-center justify-center gap-6 rounded-3xl border border-stone-600/50 bg-stone-950/60 p-6 text-center shadow-inner md:w-auto">
                    <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-stone-500">Community impact</p>
                        <p className="text-3xl font-bold tabular-nums text-stone-50">
                            {(hero?.masteryScore || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="h-px w-full bg-stone-700/80" />
                    <div className="flex w-full justify-around gap-4">
                        <div>
                            <p className="mb-0.5 text-[10px] font-medium text-stone-500">Credits</p>
                            <p className="text-lg font-bold text-amber-400">{(hero?.heroCredits || 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="mb-0.5 text-[10px] font-medium text-stone-500">Trust</p>
                            <p className="text-lg font-bold text-sky-300">{(hero?.reputation || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroBanner;
