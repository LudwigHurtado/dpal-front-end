import React from 'react';
import { Target, Gem, Megaphone, ShieldCheck, Box, UserCircle } from '../icons';
import { type View, type HeroHubTab, type HubTab } from '../../App';
import { type Category } from '../../types';

interface QuickActionsRowProps {
    onNavigate: (view: View, category?: Category, targetTab?: HeroHubTab | HubTab) => void;
    missionCount: number;
    mintReady: boolean;
}

const QuickActionsRow: React.FC<QuickActionsRowProps> = ({ onNavigate, missionCount, mintReady }) => {
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            <ActionTile
                label="Ways to help"
                status={`${missionCount} near you`}
                icon={<Target className="h-6 w-6 text-amber-400" />}
                borderHover="hover:border-amber-500/50"
                iconBg="bg-amber-500/15"
                onClick={() => onNavigate('liveIntelligence')}
            />
            <ActionTile
                label="Share something"
                status={mintReady ? 'Ready' : 'Set up first'}
                icon={<Gem className="h-6 w-6 text-sky-400" />}
                borderHover="hover:border-sky-500/50"
                iconBg="bg-sky-500/15"
                onClick={() => onNavigate('heroHub', undefined, 'mint')}
            />
            <ActionTile
                label="File a report"
                status="Speak up safely"
                icon={<Megaphone className="h-6 w-6 text-rose-300" />}
                borderHover="hover:border-rose-400/40"
                iconBg="bg-rose-500/10"
                onClick={() => onNavigate('categorySelection')}
            />
            <ActionTile
                label="Verify & support"
                status="Stand with others"
                icon={<ShieldCheck className="h-6 w-6 text-emerald-400" />}
                borderHover="hover:border-emerald-500/50"
                iconBg="bg-emerald-500/15"
                onClick={() => onNavigate('transparencyDatabase')}
            />
            <ActionTile
                label="Saved items"
                status="Your collection"
                icon={<Box className="h-6 w-6 text-blue-300" />}
                borderHover="hover:border-blue-400/40"
                iconBg="bg-blue-500/10"
                onClick={() => onNavigate('heroHub', undefined, 'collection')}
            />
            <ActionTile
                label="Family & team"
                status="Connect"
                icon={<UserCircle className="h-6 w-6 text-violet-300" />}
                borderHover="hover:border-violet-400/40"
                iconBg="bg-violet-500/10"
                onClick={() => onNavigate('teamOps')}
            />
        </div>
    );
};

const ActionTile: React.FC<{
    label: string;
    status: string;
    icon: React.ReactNode;
    borderHover: string;
    iconBg: string;
    onClick: () => void;
}> = ({ label, status, icon, borderHover, iconBg, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center justify-center rounded-3xl border border-stone-700/80 bg-stone-900/90 p-5 shadow-md transition-all active:scale-[0.98] ${borderHover} hover:bg-stone-800/90`}
    >
        <div className={`mb-3 rounded-2xl p-3 transition-transform group-hover:scale-105 ${iconBg}`}>{icon}</div>
        <p className="w-full truncate text-center text-xs font-semibold text-stone-100">{label}</p>
        <span className="mt-1 text-center text-[10px] font-medium text-stone-500">{status}</span>
    </button>
);

export default QuickActionsRow;
