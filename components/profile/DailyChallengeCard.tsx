import React, { useState } from 'react';
import { type Hero } from '../../types';
import { Clock, CheckCircle, Circle, Loader, Sparkles, Coins } from '../icons';

interface DailyChallengeCardProps {
    hero: Hero;
    setHero: React.Dispatch<React.SetStateAction<Hero>>;
}

const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({ hero: _hero, setHero }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [isClaimed, setIsClaimed] = useState(false);

    const tasks = [
        { id: '1', label: 'Complete one helpful mission', current: 1, target: 1, done: true },
        { id: '2', label: 'Support two neighbors’ reports', current: 1, target: 2, done: false },
        { id: '3', label: 'Earn 50 trust points together', current: 50, target: 50, done: true },
    ];

    const completedCount = tasks.filter((t) => t.done).length;
    const isAllDone = completedCount === tasks.length;

    const handleClaim = () => {
        setIsClaiming(true);
        setTimeout(() => {
            setHero((prev) => ({ ...prev, heroCredits: prev.heroCredits + 100, xp: prev.xp + 250 }));
            setIsClaiming(false);
            setIsClaimed(true);
        }, 1500);
    };

    return (
        <div className="relative overflow-hidden rounded-3xl border border-amber-800/40 bg-gradient-to-b from-stone-900 to-stone-950 p-8 shadow-xl">
            <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-[0.06]">
                <Clock className="h-28 w-28 text-amber-400" />
            </div>

            <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold tracking-tight text-stone-50">Together today</h3>
                    <p className="mt-1 text-[11px] font-medium text-amber-200/70">Small steps add up for everyone</p>
                </div>
                <div className="rounded-full border border-amber-700/50 bg-amber-950/40 px-3 py-1.5 text-[11px] font-semibold text-amber-200">
                    {completedCount}/{tasks.length} done
                </div>
            </div>

            <div className="relative z-10 mb-8 space-y-3">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className="flex items-center gap-3 rounded-2xl border border-stone-700/60 bg-stone-950/50 px-4 py-3"
                    >
                        {task.done ? (
                            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                        ) : (
                            <Circle className="h-5 w-5 shrink-0 text-stone-600" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p
                                className={`text-xs font-medium ${
                                    task.done ? 'text-stone-500 line-through' : 'text-stone-200'
                                }`}
                            >
                                {task.label}
                            </p>
                            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-stone-800">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                        task.done ? 'bg-emerald-500' : 'bg-amber-500/60'
                                    }`}
                                    style={{ width: `${Math.min(100, (task.current / task.target) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="relative z-10">
                {isClaimed ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-emerald-400">
                        <Sparkles className="h-4 w-4" />
                        Thank you — reward claimed
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleClaim}
                        disabled={!isAllDone || isClaiming}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all ${
                            isAllDone
                                ? 'border-b-4 border-amber-800 bg-amber-500 text-stone-900 hover:bg-amber-400 active:scale-[0.99]'
                                : 'cursor-not-allowed border border-stone-700 bg-stone-800/80 text-stone-500 opacity-70'
                        }`}
                    >
                        {isClaiming ? <Loader className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                        {isAllDone ? 'Claim your thank-you credits' : 'Finish the list to unlock'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default DailyChallengeCard;
