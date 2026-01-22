import React, { useState } from 'react';
import { type Hero } from '../../types';
import { Clock, CheckCircle, Circle, Loader, Sparkles, Coins } from '../icons';

interface DailyChallengeCardProps {
    hero: Hero;
    setHero: React.Dispatch<React.SetStateAction<Hero>>;
}

const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({ hero, setHero }) => {
    const [isClaiming, setIsClaiming] = useState(false);
    const [isClaimed, setIsClaimed] = useState(false);

    // Simulated tasks for prototype
    const tasks = [
        { id: '1', label: 'Complete 1 Field Mission', current: 1, target: 1, done: true },
        { id: '2', label: 'Verify 2 Shards', current: 1, target: 2, done: false },
        { id: '3', label: 'Earn 50 Reputation', current: 50, target: 50, done: true },
    ];

    const completedCount = tasks.filter(t => t.done).length;
    const isAllDone = completedCount === tasks.length;

    const handleClaim = () => {
        setIsClaiming(true);
        setTimeout(() => {
            setHero(prev => ({ ...prev, heroCredits: prev.heroCredits + 100, xp: prev.xp + 250 }));
            setIsClaiming(false);
            setIsClaimed(true);
        }, 1500);
    };

    return (
        <div className="bg-zinc-900 border-2 border-amber-500/20 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Clock className="w-32 h-32 text-amber-500" /></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Daily_Incentive</h3>
                    <p className="text-[8px] font-bold text-amber-500 uppercase tracking-[0.4em] mt-2">Reset in 08:42:15</p>
                </div>
                <div className="bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/30 text-amber-500 text-[10px] font-black">
                    {completedCount}/{tasks.length} SYNCED
                </div>
            </div>

            <div className="space-y-4 mb-10 relative z-10">
                {tasks.map(task => (
                    <div key={task.id} className="flex items-center space-x-4 p-4 bg-zinc-950 rounded-2xl border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        {task.done ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-zinc-800" />}
                        <div className="flex-grow min-w-0">
                            <p className={`text-[10px] font-black uppercase truncate ${task.done ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                {task.label}
                            </p>
                            <div className="h-0.5 w-full bg-zinc-900 rounded-full mt-2 overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ${task.done ? 'bg-emerald-500' : 'bg-amber-500/50'}`} style={{ width: `${(task.current/task.target)*100}%` }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="relative z-10">
                {isClaimed ? (
                    <div className="text-center py-4 text-emerald-500 font-black uppercase text-xs tracking-widest animate-fade-in flex items-center justify-center gap-3">
                        <Sparkles className="w-4 h-4"/> Reward_Claimed
                    </div>
                ) : (
                    <button 
                        onClick={handleClaim}
                        disabled={!isAllDone || isClaiming}
                        className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] transition-all flex items-center justify-center space-x-4 border-b-4 ${
                            isAllDone 
                            ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-700 shadow-xl active:scale-95' 
                            : 'bg-zinc-800 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-50'
                        }`}
                    >
                        {isClaiming ? <Loader className="w-4 h-4 animate-spin"/> : <Coins className="w-4 h-4"/>}
                        <span>{isAllDone ? 'Claim_Reward' : 'Directive_Incomplete'}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default DailyChallengeCard;