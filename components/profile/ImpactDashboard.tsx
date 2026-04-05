import React from 'react';
import { type HeroStats } from '../../types';
import { FileText, ShieldCheck, Heart, Scale, Clock, Activity } from '../icons';

interface ImpactDashboardProps {
    stats: HeroStats;
    activity: { id: string; icon: React.ReactNode; label: string; time: string }[];
}

const StatCard: React.FC<{
    label: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    accent: 'emerald' | 'sky' | 'rose' | 'amber';
}> = ({ label, value, icon, accent }) => {
    const ring =
        accent === 'emerald'
            ? 'border-emerald-800/50 hover:border-emerald-600/40'
            : accent === 'sky'
              ? 'border-sky-800/50 hover:border-sky-600/40'
              : accent === 'rose'
                ? 'border-rose-800/50 hover:border-rose-600/40'
                : 'border-amber-800/50 hover:border-amber-600/40';
    const iconWrap =
        accent === 'emerald'
            ? 'border-emerald-800/60 bg-emerald-950/50 text-emerald-400'
            : accent === 'sky'
              ? 'border-sky-800/60 bg-sky-950/50 text-sky-300'
              : accent === 'rose'
                ? 'border-rose-800/60 bg-rose-950/50 text-rose-300'
                : 'border-amber-800/60 bg-amber-950/50 text-amber-300';

    return (
        <div className={`rounded-3xl border-2 bg-stone-900/80 p-6 shadow-lg transition-colors ${ring}`}>
            <div className={`mb-3 inline-block rounded-xl border p-2.5 ${iconWrap}`}>
                {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
            </div>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-stone-50">{value}</p>
            <p className="mt-2 text-[11px] font-medium leading-snug text-stone-500">{label}</p>
        </div>
    );
};

const ImpactDashboard: React.FC<ImpactDashboardProps> = ({ stats, activity }) => {
    return (
        <div className="space-y-10">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
                <StatCard
                    label="Reports you’ve shared"
                    value={stats.reportsSubmitted || 0}
                    icon={<FileText />}
                    accent="sky"
                />
                <StatCard
                    label="Verified with others"
                    value={stats.reportsVerified || 0}
                    icon={<ShieldCheck />}
                    accent="emerald"
                />
                <StatCard
                    label="Neighbors helped (est.)"
                    value={(stats.reportsSubmitted || 0) * 12}
                    icon={<Heart />}
                    accent="rose"
                />
                <StatCard
                    label="Value recovered (est.)"
                    value={`$${((stats.reportsVerified || 0) * 45).toLocaleString()}`}
                    icon={<Scale />}
                    accent="amber"
                />
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-stone-700/80 bg-stone-900/60 p-8 shadow-xl">
                <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-[0.07]">
                    <Activity className="h-32 w-32 text-amber-400" />
                </div>

                <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
                        <Clock className="h-5 w-5 text-amber-400/90" />
                        Recent activity
                    </h3>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500">Your kindness log</span>
                </div>

                <div className="relative z-10 space-y-3">
                    {activity.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-stone-700/60 bg-stone-950/40 px-4 py-4 transition-colors hover:border-amber-900/40"
                        >
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-800/80">
                                    {item.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-stone-100">{item.label}</p>
                                    <p className="mt-0.5 text-[11px] text-stone-500">{item.time}</p>
                                </div>
                            </div>
                            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700/80" />
                        </div>
                    ))}
                    {activity.length === 0 && (
                        <p className="py-10 text-center text-sm text-stone-500">Nothing here yet—your next kind act will show up.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImpactDashboard;
