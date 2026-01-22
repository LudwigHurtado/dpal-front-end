import React from 'react';
import { type Hero } from '../../types';
import { X, Database, ShieldCheck, Activity, Hash, ArrowRight } from '../icons';

interface AuditLogModalProps {
    hero: Hero;
    onClose: () => void;
}

const AuditLogModal: React.FC<AuditLogModalProps> = ({ hero, onClose }) => {
    // Mock ledger events
    const events = [
        { id: '1', type: 'MISSION_COMPLETED', amount: 500, label: 'Metro North Pothole Audit', hash: '0x8f2d', ts: Date.now() - 1000000 },
        { id: '2', type: 'CREDIT_SPEND', amount: -150, label: 'Artifact Materialization #G1', hash: '0xA129', ts: Date.now() - 4000000 },
        { id: '3', type: 'PURCHASE_CONFIRMED', amount: 2000, label: 'Store Package: Chest of Credits', hash: '0x992B', ts: Date.now() - 86400000 },
    ];

    return (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 font-mono animate-fade-in">
             <div className="bg-zinc-900 border-2 border-emerald-500/30 rounded-[4rem] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-4xl relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30 animate-scan-y"></div>
                
                <header className="bg-zinc-950 border-b border-zinc-800 p-10 flex justify-between items-center relative z-10">
                    <div className="flex items-center space-x-8">
                         <div className="p-5 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/30">
                            <Database className="w-10 h-10 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Public_Audit_Log</h2>
                            <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-[0.4em]">Node ID: {hero.operativeId} // Cluster: PROD-MAIN</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-3xl transition-all shadow-xl"><X className="w-8 h-8"/></button>
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-10 space-y-4">
                    {events.map(event => (
                        <div key={event.id} className="group flex items-center justify-between p-6 bg-zinc-950/40 border border-zinc-800 hover:border-emerald-500/30 transition-all rounded-[2rem] shadow-inner relative overflow-hidden">
                             <div className="flex items-center space-x-8 relative z-10">
                                <div className="text-center w-24">
                                    <p className={`text-sm font-black ${event.amount > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                        {event.amount > 0 ? '+' : ''}{event.amount} HC
                                    </p>
                                    <p className="text-[7px] font-bold text-zinc-600 uppercase mt-1">TRANSACTION</p>
                                </div>
                                <div className="h-10 w-px bg-zinc-800"></div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-tight">{event.label}</p>
                                    <div className="flex items-center space-x-3 mt-1.5">
                                        <span className="text-[8px] font-black bg-black border border-zinc-800 px-2 py-0.5 rounded text-zinc-500">{event.type}</span>
                                        <span className="text-[8px] font-mono text-zinc-700 tracking-tighter">SIG_{event.hash}</span>
                                    </div>
                                </div>
                             </div>
                             <div className="text-right relative z-10">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{new Date(event.ts).toLocaleDateString()}</p>
                                <p className="text-[8px] font-mono text-zinc-800 mt-1 uppercase">{new Date(event.ts).toLocaleTimeString([], { hour12: false })}</p>
                             </div>
                        </div>
                    ))}
                </div>

                <footer className="bg-zinc-950 border-t border-zinc-800 p-8 flex justify-between items-center no-print">
                     <div className="flex items-center space-x-4 text-zinc-600">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">Record_History_Verified_By_P2P_Nodes</span>
                     </div>
                     <button onClick={() => window.print()} className="bg-white text-black font-black py-4 px-10 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-50 transition-all active:scale-95 flex items-center gap-3">
                         <Activity className="w-4 h-4" /> Export_Ledger_History
                     </button>
                </footer>
             </div>
        </div>
    );
};

export default AuditLogModal;