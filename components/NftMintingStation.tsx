import React, { useState, useMemo } from 'react';
import { Category, type Hero, type Report, type NftTheme } from '../types';
import { FORGE_TRAITS, NFT_THEMES } from '../constants';
import { Gem, Coins, Loader, Check, Sparkles, Database, Target, Zap, ShieldCheck, FileText, ArrowRight, RefreshCw, X, Broadcast, Activity, Box } from './icons';
import NftCard from './NftCard';

interface NftMintingStationProps {
  hero: Hero;
  setHero: React.Dispatch<React.SetStateAction<Hero>>;
  onMintNft: (prompt: string, theme: NftTheme, dpalCategory: Category, extra?: any) => Promise<Report>;
  reports: Report[];
}

const NftMintingStation: React.FC<NftMintingStationProps> = ({ hero, setHero, reports }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [theme, setTheme] = useState<NftTheme | ''>('');
  const [dpalCategory, setDpalCategory] = useState<Category | ''>('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintedReport, setMintedReport] = useState<Report | null>(null);
  const [revealActive, setRevealActive] = useState(false);

  const MINT_BASE_COST = 500;
  const traitsCost = useMemo(() => 
    selectedTraits.reduce((acc, tid) => acc + (FORGE_TRAITS.find(t => t.id === tid)?.cost || 0), 0)
  , [selectedTraits]);
  
  const totalCost = MINT_BASE_COST + traitsCost;
  const canAfford = hero.heroCredits >= totalCost;

  const handleFinalSynthesis = async () => {
    if (!selectedConcept || !canAfford || isMinting) return;
    
    console.log("Minting NFT...");
    setIsMinting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn("Minting transaction timed out after 60s");
        controller.abort();
    }, 60000); 

    try {
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 15);
      const idempotencyKey = `mint-${hero.operativeId}-${timestamp}-${nonce}`;

      const body = {
        userId: hero.operativeId,
        prompt: selectedConcept,
        theme: theme,
        category: dpalCategory,
        priceCredits: totalCost,
        idempotencyKey,
        nonce,
        timestamp,
        traits: selectedTraits.map(tid => ({
          trait_type: 'Module',
          value: FORGE_TRAITS.find(t => t.id === tid)?.name
        })),
        metadata: {
            operativeId: hero.operativeId,
            rank: hero.rank,
            generation: "GENESIS_01"
        }
      };

      const apiBase = (import.meta as any).env?.VITE_API_BASE || 'https://dpal-backend.up.railway.app';
      
      const response = await fetch(`${apiBase}/api/nft/mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dpal-timestamp': timestamp.toString(),
          'x-dpal-nonce': nonce
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned invalid content-type: ${text.substring(0, 200)}...`);
      }

      const receipt = await response.json();

      if (!response.ok) {
        throw new Error(receipt.message || `MINT_FAILED (${response.status})`);
      }

      setHero(prev => ({
          ...prev,
          heroCredits: prev.heroCredits - (receipt.priceCredits || totalCost)
      }));

      const finalReport: Report = {
          id: receipt.tokenId,
          title: selectedConcept,
          description: `Shard authenticated via DPAL Ledger. Token ID: ${receipt.tokenId}. TX: ${receipt.txHash}`,
          category: dpalCategory as Category,
          location: 'Vanguard_Lab',
          timestamp: new Date(),
          hash: receipt.txHash,
          blockchainRef: receipt.txHash,
          status: 'Resolved',
          trustScore: 100,
          severity: 'Standard',
          isActionable: false,
          earnedNft: {
              source: 'minted',
              title: selectedConcept,
              imageUrl: receipt.imageUrl, 
              mintCategory: dpalCategory as Category,
              blockNumber: 6843021,
              txHash: receipt.txHash,
              rarity: 'Rare' as any,
              grade: 'S'
          }
      };

      setMintedReport(finalReport);
      setRevealActive(true);
      
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        alert("Synthesis timed out (60s). The network node is busy.");
      } else {
        alert(e.message || "Synthesis disrupted. Check terminal connection.");
      }
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 font-mono relative overflow-hidden min-h-[700px]">
      <style>{`
        .scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: rgba(34, 211, 238, 0.2); animation: scan 4s linear infinite; z-index: 50; }
        @keyframes scan { from { top: 0; } to { top: 100%; } }
        .materialize-reveal { animation: materialize 2s ease-out forwards; }
        @keyframes materialize { 0% { opacity: 0; transform: scale(0.8) translateY(20px); filter: blur(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); } }
        .glitch-text { animation: text-glitch 3s infinite; }
        @keyframes text-glitch { 0% { transform: translate(0); } 1% { transform: translate(-2px, 1px); } 2% { transform: translate(2px, -1px); } 3% { transform: translate(0); } 100% { transform: translate(0); } }
        @keyframes blueprint-pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.2; } }
        .blueprint-bg { background-image: radial-gradient(circle, #22d3ee 1px, transparent 1px); background-size: 20px 20px; animation: blueprint-pulse 4s infinite; }
      `}</style>
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.05),transparent_50%)]"></div>
      <div className="scan-line"></div>
      
      {revealActive && mintedReport ? (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="materialize-reveal space-y-12 max-w-2xl w-full">
                  <div className="space-y-4">
                      <div className="flex items-center justify-center space-x-4 mb-2">
                        <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
                        <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter glitch-text">Artifact_Synthesized</h2>
                      </div>
                      <p className="text-cyan-500 font-black uppercase tracking-[0.6em] text-xs">Ledger_Seal_Authenticated</p>
                  </div>

                  <div className="relative group">
                      <div className="absolute -inset-10 bg-cyan-500/10 blur-[80px] animate-pulse"></div>
                      <div className="relative transform hover:scale-105 transition-transform duration-700">
                        <NftCard report={mintedReport} />
                      </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-6 text-left shadow-2xl">
                      <div className="grid grid-cols-2 gap-8">
                          <div>
                              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Token_ID</p>
                              <p className="text-xs font-black text-white truncate">{mintedReport.id}</p>
                          </div>
                          <div>
                              <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">TX_Hash</p>
                              <p className="text-xs font-black text-emerald-500 truncate">{mintedReport.hash}</p>
                          </div>
                      </div>
                      <div className="pt-6 border-t border-zinc-800 flex justify-between items-center">
                          <div className="flex items-center space-x-3 text-cyan-500">
                              <ShieldCheck className="w-5 h-5" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Protocol: Genesis_01</span>
                          </div>
                          <p className="text-[9px] font-mono text-zinc-700">BLOCK_HEIGHT: #6843021</p>
                      </div>
                  </div>

                  <button 
                    onClick={() => { setRevealActive(false); setStep(1); setMintedReport(null); setDpalCategory(''); setTheme(''); setSelectedConcept(null); }}
                    className="bg-white hover:bg-cyan-50 text-black font-black py-6 px-16 rounded-[2rem] uppercase tracking-[0.4em] text-xs shadow-4xl active:scale-95 transition-all"
                  >
                    Dismiss_to_Archive
                  </button>
              </div>
          </div>
      ) : (
          <div className="relative z-10">
            <header className="text-center mb-16">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Ledger_Forge</h2>
                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em]">Authorized Backend Synthesis Mode</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-10">
                    <div className="flex items-center space-x-6 mb-12">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex items-center space-x-4">
                                <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black transition-all ${step >= s ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-700'}`}>{s}</div>
                                {s < 3 && <div className={`w-12 h-1 rounded-full ${step > s ? 'bg-cyan-600' : 'bg-zinc-800'}`}></div>}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-2">Neural_Framework</label>
                                    <select 
                                        value={theme} 
                                        onChange={(e) => setTheme(e.target.value as NftTheme)}
                                        className="w-full bg-zinc-950 border-2 border-zinc-800 p-5 rounded-2xl text-xs font-black uppercase text-white focus:border-cyan-500 outline-none transition-all shadow-inner"
                                    >
                                        <option value="">[SELECT_FRAMEWORK]</option>
                                        {NFT_THEMES.map(t => <option key={t.value} value={t.value}>{t.label.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-2">Ledger_Domain</label>
                                    <select 
                                        value={dpalCategory} 
                                        onChange={(e) => setDpalCategory(e.target.value as Category)}
                                        className="w-full bg-zinc-950 border-2 border-zinc-800 p-5 rounded-2xl text-xs font-black uppercase text-white focus:border-cyan-500 outline-none transition-all shadow-inner"
                                    >
                                        <option value="">[SELECT_DOMAIN]</option>
                                        {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedConcept("Oracle Vision #" + Date.now().toString().slice(-4)); setStep(2); }}
                                disabled={!theme || !dpalCategory}
                                className="w-full bg-white text-black font-black py-6 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-10 transition-all flex items-center justify-center space-x-4"
                            >
                                <span>Initialize_Vision_Sync</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-zinc-900/60 p-10 rounded-[3rem] border-2 border-zinc-800 relative overflow-hidden shadow-inner">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><Broadcast className="w-24 h-24 text-cyan-400"/></div>
                                <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest mb-6 border-b border-zinc-800 pb-4">Oracle_Inference_Result:</p>
                                <p className="text-white font-black text-3xl uppercase tracking-tighter leading-none italic">"{selectedConcept}"</p>
                                <p className="text-zinc-600 text-[9px] font-bold uppercase mt-10 tracking-[0.4em]">Pattern_Match: 99.4% STABLE</p>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="px-10 py-6 bg-zinc-900 text-zinc-500 font-black rounded-2xl uppercase text-[10px] tracking-widest border border-zinc-800 hover:text-white transition-all">Re-Sync</button>
                                <button onClick={() => setStep(3)} className="flex-grow bg-white text-black font-black py-6 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all">Configure_Artifact_Traits</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="bg-zinc-900 border-2 border-zinc-800 rounded-[3rem] p-10 space-y-10 shadow-inner">
                                <div className="flex justify-between items-end border-b border-zinc-800 pb-8">
                                    <div>
                                        <h3 className="text-xs font-black text-zinc-600 uppercase tracking-[0.4em] mb-4">Total_Synthesis_Cost</h3>
                                        <div className="flex items-center space-x-4 text-4xl font-black text-amber-500">
                                            <span>{totalCost}</span><Coins className="w-8 h-8"/>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Operative_Balance</p>
                                        <p className="text-sm font-black text-white">{hero.heroCredits} HC</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3 text-cyan-500/80">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Network_Policies</span>
                                    </div>
                                    <p className="text-[9px] text-zinc-600 font-bold uppercase leading-relaxed max-w-md">
                                        All artifacts are stored on the DPAL production nodes hosted on Railway. Metadata is permanently indexed to the MongoDB cluster.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleFinalSynthesis}
                                    disabled={isMinting || !canAfford}
                                    className={`w-full py-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-xs shadow-4xl active:scale-95 transition-all flex items-center justify-center space-x-6 border-b-8 ${canAfford ? 'bg-cyan-600 hover:bg-cyan-500 border-cyan-800 text-white' : 'bg-zinc-800 border-zinc-900 text-zinc-600 cursor-not-allowed'}`}
                                >
                                    {isMinting ? <Loader className="w-8 h-8 animate-spin"/> : <Zap className="w-8 h-8 text-white"/>}
                                    <span>{isMinting ? 'FORGING_ETERNAL_TRUTH...' : canAfford ? 'Authorize_Ledger_Commit' : 'Insufficient_Resource_Sync'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* THE DYNAMIC VISUALIZER PANEL */}
                <div className="lg:col-span-5 h-full min-h-[500px]">
                    <div className="h-full bg-zinc-950 rounded-[4rem] border-4 border-zinc-900 flex flex-col items-center justify-center p-8 text-center shadow-4xl relative overflow-hidden group">
                        
                        {/* THE REVEAL LOGIC */}
                        {mintedReport ? (
                            <div className="w-full animate-fade-in flex flex-col items-center space-y-8">
                                <div className="relative group/materialized">
                                    <div className="absolute -inset-10 bg-cyan-500/10 blur-[60px] animate-pulse"></div>
                                    <div className="transform hover:scale-105 transition-transform duration-500">
                                        <NftCard report={mintedReport} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="inline-flex items-center space-x-3 px-4 py-1.5 bg-emerald-950/20 border border-emerald-500/30 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Materialized_Shard_v1.0</span>
                                    </div>
                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Shard indexed successfully to Railway Node</p>
                                </div>
                            </div>
                        ) : isMinting ? (
                            <div className="flex flex-col items-center justify-center space-y-8 relative z-10 animate-fade-in">
                                <div className="relative">
                                    <div className="absolute -inset-10 bg-cyan-500/5 blur-3xl animate-pulse"></div>
                                    <Loader className="w-32 h-32 text-cyan-500 animate-spin" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xl font-black uppercase tracking-tighter text-white">Synthesizing_Matter</p>
                                    <div className="flex items-center justify-center space-x-3 text-cyan-400 font-black uppercase text-[10px] tracking-[0.3em]">
                                        <Activity className="w-4 h-4" />
                                        <span>Pattern_Commit: 0x{Math.random().toString(16).slice(2, 10)}</span>
                                    </div>
                                </div>
                                <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 animate-[loading-bar_60s_linear_forwards]"></div>
                                </div>
                            </div>
                        ) : selectedConcept ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 relative animate-fade-in">
                                <div className="absolute inset-0 blueprint-bg opacity-10"></div>
                                <div className="relative z-10 space-y-10">
                                    <div className="w-48 h-48 bg-zinc-900/60 rounded-[3rem] border-2 border-dashed border-cyan-800/50 flex flex-center items-center justify-center mx-auto shadow-inner group-hover:border-cyan-600 transition-all duration-700">
                                        <Box className="w-24 h-24 text-cyan-900 group-hover:text-cyan-600 transition-all duration-700 animate-pulse" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-cyan-950/20 border border-cyan-800/30 rounded-full">
                                            <span className="text-[10px] font-black uppercase text-cyan-500 tracking-widest">Protocol: Blueprint_v2</span>
                                        </div>
                                        <h4 className="text-2xl font-black uppercase tracking-tighter text-zinc-500 leading-none">
                                            {selectedConcept}
                                        </h4>
                                        <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-[0.4em] max-w-[250px] mx-auto leading-relaxed">
                                            Awaiting ledger commit to materialize visual artifact components.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative z-10 space-y-8 animate-fade-in">
                                <div className="w-40 h-40 bg-zinc-950 rounded-[3rem] border border-zinc-800 flex items-center justify-center mx-auto shadow-inner group-hover:border-cyan-900 transition-colors">
                                    <Gem className="w-20 h-20 text-zinc-900 group-hover:text-cyan-600 transition-all duration-700" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black uppercase tracking-tighter text-zinc-700 group-hover:text-zinc-500 transition-colors">Awaiting_Neural_Handshake</h4>
                                    <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-[0.4em] mt-2">Forge Shards from Field Directives</p>
                                </div>
                            </div>
                        )}
                        
                        {/* DECORATIVE CORNER BRACKETS */}
                        <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-zinc-900"></div>
                        <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-zinc-900"></div>
                        <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-zinc-900"></div>
                        <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-zinc-900"></div>
                    </div>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default NftMintingStation;