import React from 'react';
import { Target, Gem, Megaphone, ShieldCheck, Box, UserCircle } from '../icons';

interface QuickActionsRowProps {
    onNavigate: (view: any, cat?: any, tab?: any) => void;
    missionCount: number;
    mintReady: boolean;
}

const QuickActionsRow: React.FC<QuickActionsRowProps> = ({ onNavigate, missionCount, mintReady }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <ActionTile 
                label="Start Mission" 
                status={`${missionCount} Available`} 
                icon={<Target />} 
                color="amber" 
                onClick={() => onNavigate('liveIntelligence')} 
            />
            <ActionTile 
                label="Forge Shard" 
                status={mintReady ? 'Mint Ready' : 'Sync Required'} 
                icon={<Gem />} 
                color="cyan" 
                onClick={() => onNavigate('heroHub', undefined, 'mint')} 
            />
            <ActionTile 
                label="File Report" 
                status="Active Feed" 
                icon={<Megaphone />} 
                color="rose" 
                onClick={() => onNavigate('categorySelection')} 
            />
            <ActionTile 
                label="Verify Proof" 
                status="3 Pending" 
                icon={<ShieldCheck />} 
                color="emerald" 
                onClick={() => onNavigate('transparencyDatabase')} 
            />
            <ActionTile 
                label="Inventory" 
                status="View Archive" 
                icon={<Box />} 
                color="blue" 
                onClick={() => onNavigate('heroHub', undefined, 'collection')} 
            />
            <ActionTile 
                label="Team Comms" 
                status="Global Pulse" 
                icon={<UserCircle />} 
                color="purple" 
                onClick={() => onNavigate('teamOps')} 
            />
        </div>
    );
};

const ActionTile: React.FC<{ label: string; status: string; icon: React.ReactNode; color: string; onClick: () => void }> = ({ label, status, icon, color, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-6 rounded-[2rem] bg-zinc-900 border border-zinc-800 hover:border-${color}-500/50 transition-all group shadow-xl active:scale-95`}
    >
        <div className={`p-4 bg-${color}-500/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform text-${color}-400`}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
        </div>
        <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate w-full">{label}</p>
        <span className={`text-[7px] font-bold uppercase tracking-widest mt-1 text-${color}-500/70 group-hover:text-${color}-500`}>{status}</span>
    </button>
);

export default QuickActionsRow;