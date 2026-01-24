
import React, { useMemo, useState, useEffect } from 'react';
import type { Report, Hero } from '../types';
import { useTranslations } from '../i18n';
import NftCard from './NftCard';
import { ArrowLeft, Award, Coins, Gem, Loader, RefreshCw, Database, Search, ShieldCheck } from './icons';

interface CollectionCodexProps {
  reports: Report[];
  hero: Hero;
  onReturn: () => void;
}

const CollectionCodex: React.FC<CollectionCodexProps> = ({ reports, hero, onReturn }) => {
    const { t } = useTranslations();
    const [activeTab, setActiveTab] = useState<'rewards' | 'badges' | 'legends'>('rewards');
    const [dbNfts, setDbNfts] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchCollection = async () => {
        setIsLoading(true);
        try {
            const apiBase = (import.meta as any).env?.VITE_API_BASE || 'https://dpal-ai-server-production.up.railway.app';
            // Try relative path first (for Vercel proxy), fallback to absolute
            let response;
            try {
                response = await fetch('/api/nft/receipts');
            } catch {
                response = await fetch(`${apiBase}/api/nft/receipts`);
            }
            
            if (response.ok) {
                const data = await response.json();
                // Map DB receipts back to Report structure for the UI
                const mapped: Report[] = data.map((receipt: any) => ({
                    id: receipt.tokenId,
                    title: receipt.tokenId,
                    description: `Shard authenticated via Railway node. Hash: ${receipt.txHash}`,
                    category: receipt.category || 'Other',
                    location: 'Ledger_Node',
                    timestamp: new Date(receipt.createdAt),
                    hash: receipt.txHash,
                    blockchainRef: receipt.txHash,
                    status: 'Resolved',
                    trustScore: 100,
                    severity: 'Standard',
                    isActionable: false,
                    earnedNft: {
                        source: 'minted',
                        title: receipt.tokenId,
                        imageUrl: receipt.imageUri || (receipt.imageUrl?.startsWith('/') 
                            ? `${apiBase}${receipt.imageUrl}` 
                            : receipt.imageUrl) || `https://api.dpal.net/v1/assets/${receipt.tokenId}.png`,
                        mintCategory: receipt.category || 'Other',
                        blockNumber: 6843021,
                        txHash: receipt.txHash,
                        rarity: 'Rare' as any,
                        grade: 'S'
                    }
                }));
                setDbNfts(mapped);
            } else {
                // Handle error response
                let errorData: any = {};
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: `HTTP ${response.status}`, error: 'unknown' };
                }
                console.error("Failed to fetch receipts:", errorData.message || errorData.error || `HTTP ${response.status}`);
                // Don't show alert for collection fetch - just log and continue with empty collection
            }
        } catch (e: any) {
            console.error("DB Fetch Failed", e);
            // Network errors - silently fail, user can retry by refreshing
            if (e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError")) {
                console.warn("Network error fetching collection - backend may be unavailable");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCollection();
    }, []);

    const allNfts = useMemo(() => {
        // Merge local reports with backend data, removing duplicates by ID
        const local = reports.filter(r => r.isAuthor && r.earnedNft);
        const combined = [...local, ...dbNfts];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        
        return unique
            .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [reports, dbNfts, searchQuery]);

    return (
        <div className="animate-fade-in font-mono text-white pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <button
                    onClick={onReturn}
                    className="inline-flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-cyan-400 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    <span>TERMINAL_RETURN</span>
                </button>
                <div className="flex items-center space-x-4">
                    <div className="bg-zinc-900 border border-zinc-800 px-6 py-2 rounded-2xl flex items-center space-x-3">
                         <Database className="w-4 h-4 text-emerald-500" />
                         <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Railway_Node: CONNECTED</span>
                    </div>
                    <button onClick={fetchCollection} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:text-cyan-400 transition-all active:scale-95">
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <header className="mb-16 text-center space-y-4">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">Asset_Archive</h1>
                <p className="text-zinc-500 text-xs font-bold tracking-[0.4em] uppercase">Materialized Intelligence Shards & Civic Artifacts</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
                 <div className="lg:col-span-8 flex items-center bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] px-8 py-2 group focus-within:border-cyan-500 transition-all shadow-inner">
                    <Search className="w-6 h-6 text-zinc-700 group-focus-within:text-cyan-500 transition-colors" />
                    <input 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="FILTER_SHARDS_BY_IDENTIFIER..."
                        className="w-full bg-transparent border-none p-5 text-lg font-black uppercase tracking-widest text-white outline-none placeholder:text-zinc-800"
                    />
                 </div>

                 <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex flex-col justify-center shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><Coins className="w-10 h-10 text-amber-500"/></div>
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Shard_Balance</p>
                        <p className="text-2xl font-black text-white">{allNfts.length}</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex flex-col justify-center shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck className="w-10 h-10 text-cyan-500"/></div>
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">System_Trust</p>
                        <p className="text-2xl font-black text-emerald-500">100%</p>
                    </div>
                 </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {isLoading && allNfts.length === 0 ? (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center space-y-6 text-zinc-800 opacity-20">
                        <Loader className="w-16 h-16 animate-spin" />
                        <p className="text-xl font-black uppercase tracking-[0.5em]">Synchronizing_Database...</p>
                    </div>
                ) : allNfts.length > 0 ? (
                    allNfts.map((report) => (
                        <div key={report.id} className="animate-fade-in-fast hover:z-20 transform hover:scale-105 transition-all duration-500">
                            <NftCard report={report} />
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-40 text-center border-4 border-dashed border-zinc-900 rounded-[5rem] bg-zinc-950/40">
                        <Award className="w-24 h-24 text-zinc-900 mx-auto mb-8 opacity-30" />
                        <h3 className="text-2xl font-black text-zinc-700 uppercase tracking-widest">No_Assets_Synchronized</h3>
                        <p className="mt-4 text-[10px] font-bold text-zinc-800 uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">
                            Initialize the MINT protocol to materialize field dispatches into unique ledger artifacts.
                        </p>
                    </div>
                )}
            </div>
            
            <style>{`
                .animate-fade-in-fast { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default CollectionCodex;
