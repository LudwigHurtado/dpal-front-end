import React from 'react';
import { type HeroStats } from '../../types';
import { FileText, ShieldCheck, Target, Heart, Scale, Clock, Activity } from '../icons';

interface ImpactDashboardProps {
    stats: HeroStats;
    activity: any[];
}

const ImpactDashboard: React.FC<ImpactDashboardProps> = ({ stats, activity }) => {
    return (
        <div className="space-y-12">
            {/* STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard label="Shards Committed" value={stats.reportsSubmitted || 0} icon={<FileText/>} color="cyan" />
                <StatCard label="Verified Proof" value={stats.reportsVerified || 0} icon={<ShieldCheck/>} color="emerald" />
                <StatCard label="Citizens Helped" value={(stats.reportsSubmitted * 12) || 0} icon={<Heart/>} color="rose" />
                <StatCard label="Value Recovered" value={`$${((stats.reportsVerified * 45) || 0).toLocaleString()}`} icon={<Scale/>} color="amber" />
            </div>

            {/* IMPACT TIMELINE */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-[3rem] p-10 space-y-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Activity className="w-40 h-40 text-cyan-500" /></div>
                
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase text-zinc-500 tracking-[0.4em] flex items-center gap-4">
                        <Clock className="w-5 h-5 text-cyan-500" />
                        <span>Intelligence_Timeline</span>
                    </h3>
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">LIVE_LEDGER_FEED</span>
                </div>

                <div className="space-y-6">
                    {activity.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-6 bg-black/40 rounded-[1.8rem] border border-zinc-800 hover:border-cyan-500/30 transition-all group shadow-inner">
                            <div className="flex items-center space-x-6">
                                <div className="p-3 bg-zinc-900 rounded-xl group-hover:scale-110 transition-transform">
                                    {item.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white uppercase tracking-tight">{item.label}</p>
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1 tracking-widest">{item.time}</p>
                                </div>
                            </div>
                            <ShieldCheck className="w-4 h-4 text-zinc-800 group-hover:text-emerald-500/50 transition-colors" />
                        </div>
                    ))}
                    {activity.length === 0 && (
                        <p className="text-center py-10 text-[10px] font-black text-zinc-800 uppercase tracking-[0.5em]">No_Activity_Logged</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: any; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
    <div className={`p-8 bg-zinc-900 border-2 border-zinc-800 hover:border-${color}-500/30 transition-all rounded-[2.5rem] shadow-xl group overflow-hidden relative`}>
        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-${color}-400`}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-16 h-16" })}
        </div>
        <div className={`p-3 bg-zinc-950 rounded-xl mb-4 inline-block text-${color}-500 border border-zinc-800`}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
        </div>
        <p className="text-[28px] font-black text-white tracking-tighter leading-none">{value}</p>
        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-3 truncate">{label}</p>
    </div>
);

export default ImpactDashboard;