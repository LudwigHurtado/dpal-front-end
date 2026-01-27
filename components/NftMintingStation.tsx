import React, { useState, useMemo, useEffect } from 'react';
import { Category, type Hero, type Report, type NftTheme } from '../types';
import { FORGE_TRAITS, NFT_THEMES, getApiBase } from '../constants';
import { Gem, Coins, Loader, Check, Sparkles, Database, Target, Zap, ShieldCheck, FileText, ArrowRight, RefreshCw, X, Broadcast, Activity, Box, Fingerprint, Activity as ActivityIcon, User, Monitor, ArrowLeft } from './icons';
import NftCard from './NftCard';
import { generateNftPromptIdeas } from '../services/geminiService';

interface NftMintingStationProps {
  hero: Hero;
  setHero: React.Dispatch<React.SetStateAction<Hero>>;
  onMintNft: (prompt: string, theme: NftTheme, dpalCategory: Category, extra?: any) => Promise<Report>;
  reports: Report[];
}

type ForgeStep = 'FRAMEWORK' | 'INFERENCE' | 'AUGMENT' | 'FORGING' | 'SUCCESS';

const NftMintingStation: React.FC<NftMintingStationProps> = ({ hero, setHero }) => {
  const [activeStep, setActiveStep] = useState<ForgeStep>('FRAMEWORK');
  const [theme, setTheme] = useState<NftTheme | ''>('');
  const [dpalCategory, setDpalCategory] = useState<Category | ''>('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [isSyncingConcepts, setIsSyncingConcepts] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintedReport, setMintedReport] = useState<Report | null>(null);
  const [conceptPreviews, setConceptPreviews] = useState<Record<number, string>>({});
  const [generatingPreviews, setGeneratingPreviews] = useState<Set<number>>(new Set());

  const apiBase = getApiBase();

  const MINT_BASE_COST = 500;
  const traitsCost = useMemo(() => 
    selectedTraits.reduce((acc, tid) => acc + (FORGE_TRAITS.find(t => t.id === tid)?.cost || 0), 0)
  , [selectedTraits]);
  
  const totalCost = MINT_BASE_COST + traitsCost;
  const canAfford = hero.heroCredits >= totalCost;

  const syncOracleVisions = async () => {
    if (!theme || !dpalCategory) return;
    setIsSyncingConcepts(true);
    setConceptPreviews({});
    setGeneratingPreviews(new Set());
    try {
        const ideas = await generateNftPromptIdeas(hero, theme as NftTheme, dpalCategory as Category);
        setConcepts(ideas);
        setActiveStep('INFERENCE');
        
        // Generate preview images for each concept in the background
        const { generateNftImage } = await import('../services/geminiService');
        ideas.forEach((concept, index) => {
          setGeneratingPreviews(prev => new Set([...prev, index]));
          generateNftImage(hero, null, concept, theme as NftTheme)
            .then(previewUrl => {
              setConceptPreviews(prev => ({ ...prev, [index]: previewUrl }));
            })
            .catch(err => {
              console.warn(`Preview generation failed for concept ${index}:`, err);
            })
            .finally(() => {
              setGeneratingPreviews(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
              });
            });
        });
    } catch (e: any) {
        console.error("[FORGE] Oracle vision sync failed:", e);
        // Check if AI is enabled
        const { isAiEnabled } = await import('../services/geminiService');
        if (!isAiEnabled()) {
            alert("AI key not configured. Please set VITE_GEMINI_API_KEY in your environment or enable offline mode.");
        } else if (e?.message?.includes("RATE_LIMITED") || e?.message?.includes("429")) {
            alert("API rate limit reached. Please wait a moment and try again.");
        } else if (e?.message?.includes("API_KEY_INVALID") || e?.message?.includes("NOT_CONFIGURED")) {
            alert("AI key is invalid. Please check your VITE_GEMINI_API_KEY configuration.");
        } else {
            alert(`Neural link unstable: ${e?.message || 'Connection failed'}. Check your network connection and try again.`);
        }
    } finally {
        setIsSyncingConcepts(false);
    }
  };

  const handleFinalSynthesis = async () => {
    if (!selectedConcept || !canAfford || isMinting) return;
    
    console.log("[FORGE] Initializing Ledger Commit for Operative #" + hero.operativeId);
    setIsMinting(true);
    setActiveStep('FORGING');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); 

    try {
      const timestamp = Date.now();
      // Generate a truly unique nonce using crypto API for better uniqueness
      const nonce = crypto.randomUUID ? crypto.randomUUID() : 
        `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
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
        }))
      };

      // ATTEMPT 1: Try relative path first (leveraging Vercel Proxy)
      let response;
      try {
        response = await fetch('/api/nft/mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
      } catch (e) {
        console.warn("[FORGE] Relative dispatch failed, falling back to absolute node.");
        // ATTEMPT 2: Fallback to absolute Railway URL
        response = await fetch(`${apiBase}/api/nft/mint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to parse error response as JSON
        let errorData: any = {};
        try {
          const errorText = await response.text();
          errorData = JSON.parse(errorText);
        } catch {
          // If parsing fails, use status code
          errorData = { error: 'unknown', message: `HTTP ${response.status}` };
        }

        // Create error with status code and message
        const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        (error as any).status = response.status;
        (error as any).errorCode = errorData.error;
        throw error;
      }

      const receipt = await response.json();
      
      setHero(prev => ({
          ...prev,
          heroCredits: prev.heroCredits - (receipt.priceCredits || totalCost)
      }));

      const resolvedImageUrl = receipt.imageUrl.startsWith('/') 
        ? `${apiBase}${receipt.imageUrl}` 
        : receipt.imageUrl;

      const finalReport: Report = {
          id: receipt.tokenId,
          title: selectedConcept,
          description: `Cryptographic Shard #G1 materialized via Gemini Oracle. Theme: ${theme}. Index: ${receipt.tokenId}`,
          category: dpalCategory as Category,
          location: 'Vanguard_Ledger_Forge',
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
              imageUrl: resolvedImageUrl, 
              mintCategory: dpalCategory as Category,
              blockNumber: 6843021,
              txHash: receipt.txHash,
              rarity: 'Rare' as any,
              grade: 'S'
          }
      };

      setMintedReport(finalReport);
      setActiveStep('SUCCESS');
      
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error("[FORGE_ERR]", e);
      setActiveStep('AUGMENT'); 
      
      // Handle specific error types
      if (e.name === 'AbortError') {
        alert("⏱️ Synthesis Timed Out (60s). The Forge node is busy. Please try again.");
        return;
      }

      // Handle network/connection errors
      if (e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError") || e.name === "TypeError") {
        alert("🌐 Network Connection Failed\n\nThis could be due to:\n1. Backend server is not running\n2. CORS configuration issue\n3. Internet connectivity problems\n\nPlease check your network connection and ensure the backend server is running.");
        return;
      }

      // Handle specific HTTP status codes from backend
      const status = e.status || (e.message?.match(/HTTP (\d+)/)?.[1] ? parseInt(e.message.match(/HTTP (\d+)/)?.[1]) : null);
      const errorCode = e.errorCode || e.message?.toLowerCase();

      if (status === 400) {
        // Bad request - validation error
        alert(`❌ Invalid Request\n\n${e.message || 'Please check your input and try again.'}`);
      } else if (status === 402 || errorCode?.includes('insufficient')) {
        // Insufficient balance
        const needed = totalCost;
        const current = hero.heroCredits;
        alert(`💳 Insufficient Credits\n\nRequired: ${needed.toLocaleString()} HC\nYour Balance: ${current.toLocaleString()} HC\n\nYou need ${(needed - current).toLocaleString()} more credits to complete this mint.`);
      } else if (status === 409 || errorCode?.includes('mint_in_progress')) {
        // Mint already in progress
        alert("⏳ Mint Already In Progress\n\nA mint request with this idempotency key is already being processed. Please wait for it to complete or try again with a different request.");
      } else if (status === 500 && (errorCode?.includes('configuration') || e.message?.includes('GEMINI_API_KEY'))) {
        // Configuration error
        alert("⚙️ Server Configuration Error\n\nThe AI service is not properly configured on the backend. Please contact the administrator.");
      } else if (status === 502 || errorCode?.includes('image_generation')) {
        // Image generation failed
        alert("🎨 Image Generation Failed\n\nThe AI image generation service encountered an error. Please try again in a moment.");
      } else if (status && status >= 500) {
        // Other server errors
        alert(`🔴 Server Error (${status})\n\n${e.message || 'The backend server encountered an unexpected error. Please try again later.'}`);
      } else if (status && status >= 400) {
        // Other client errors
        alert(`⚠️ Request Error (${status})\n\n${e.message || 'Your request could not be processed. Please check your input and try again.'}`);
      } else {
        // Generic error
        alert(`❌ Synthesis Disrupted\n\n${e.message || 'An unexpected error occurred. Check terminal network status and try again.'}`);
      }
    } finally {
      setIsMinting(false);
    }
  };

  const resetForge = () => {
    setActiveStep('FRAMEWORK');
    setTheme('');
    setDpalCategory('');
    setSelectedTraits([]);
    setSelectedConcept(null);
    setConcepts([]);
    setMintedReport(null);
  };

  return (
    <div className="bg-black border border-zinc-800 rounded-[3rem] p-8 md:p-16 font-mono relative overflow-hidden min-h-[850px] flex flex-col">
      <style>{`
        .forge-grid { background-image: radial-gradient(#22d3ee 1px, transparent 1px); background-size: 30px 30px; opacity: 0.03; }
        .scan-y { animation: scan-v 4s linear infinite; }
        @keyframes scan-v { 0% { top: 0; } 100% { top: 100%; } }
        .materialize { animation: materialize-anim 2s ease-out forwards; }
        @keyframes materialize-anim { 
            0% { filter: blur(20px) brightness(3); transform: scale(0.9); opacity: 0; } 
            100% { filter: blur(0) brightness(1); transform: scale(1); opacity: 1; } 
        }
        .surgical-scan { animation: s-scan 2s linear infinite; }
        @keyframes s-scan { 0% { top: 0; } 100% { top: 100%; } }
        @keyframes progress {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
        }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
        }
      `}</style>

      <div className="absolute inset-0 forge-grid pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.05),transparent_50%)] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/20 scan-y z-50 pointer-events-none"></div>

      <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
          <div className="flex items-center space-x-6">
              <div className="p-4 bg-cyan-950/40 rounded-3xl border-2 border-cyan-500/30 shadow-2xl">
                  <Gem className="w-10 h-10 text-cyan-400 animate-pulse" />
              </div>
              <div>
                  <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none">Genesis_Forge</h1>
                  <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                      <ActivityIcon className="w-3 h-3"/> Protocol: v2.5_Materialization_Stable
                  </p>
              </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl flex items-center space-x-6 shadow-inner">
               <div className="text-right">
                   <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Resource_Link</p>
                   <div className="flex items-center space-x-2 text-xl font-black text-amber-500 tracking-tighter">
                       <span>{hero.heroCredits.toLocaleString()}</span>
                       <Coins className="w-5 h-5"/>
                   </div>
               </div>
               <div className="w-px h-10 bg-zinc-800"></div>
               <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-800">
                    <User className="w-6 h-6 text-zinc-700" />
               </div>
          </div>
      </header>

      <div className="relative z-10 flex items-center justify-center space-x-8 mb-16">
          {[
              { id: 'FRAMEWORK', icon: <Box />, label: 'Setup' },
              { id: 'INFERENCE', icon: <Sparkles />, label: 'Vision' },
              { id: 'AUGMENT', icon: <Zap />, label: 'Augment' },
              { id: 'FORGING', icon: <Loader />, label: 'Commit' }
          ].map((s, idx) => {
              const isActive = activeStep === s.id;
              const isPast = ['FRAMEWORK', 'INFERENCE', 'AUGMENT', 'FORGING', 'SUCCESS'].indexOf(activeStep) > idx;
              return (
                  <div key={s.id} className="flex items-center space-x-4 group">
                      <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${
                          isActive ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_20px_cyan]' :
                          isPast ? 'bg-emerald-950 border-emerald-500 text-emerald-500' :
                          'bg-zinc-900 border-zinc-800 text-zinc-700'
                      }`}>
                          {isPast ? <Check className="w-6 h-6"/> : React.cloneElement(s.icon as React.ReactElement<any>, { className: "w-6 h-6" })}
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest hidden md:block ${isActive ? 'text-white' : 'text-zinc-700'}`}>{s.label}</span>
                      {idx < 3 && <div className={`w-12 h-0.5 rounded-full ${isPast ? 'bg-emerald-500' : 'bg-zinc-900'}`}></div>}
                  </div>
              )
          })}
      </div>

      <div className="flex-grow relative z-10 flex flex-col">
          {activeStep !== 'SUCCESS' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-fade-in">
                  <div className="lg:col-span-7 space-y-12">
                      {activeStep === 'FRAMEWORK' && (
                          <div className="space-y-12 animate-fade-in">
                              <div className="space-y-6">
                                  <div className="flex items-center space-x-4">
                                      <div className="p-4 bg-cyan-500/20 rounded-3xl border border-cyan-500/30">
                                          <Box className="w-8 h-8 text-cyan-400" />
                                      </div>
                                      <div>
                                          <h2 className="text-4xl font-black uppercase tracking-tighter text-white">Choose_Your_Vision</h2>
                                          <p className="text-sm text-cyan-500 font-bold uppercase leading-relaxed mt-2">Select the aesthetic and category for your artifact</p>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4 group">
                                      <div className="flex items-center space-x-3">
                                          <Monitor className="w-5 h-5 text-cyan-500"/>
                                          <label className="text-sm font-black text-cyan-400 uppercase tracking-widest">Visual_Style</label>
                                      </div>
                                      <select 
                                          value={theme} 
                                          onChange={e => setTheme(e.target.value as NftTheme)} 
                                          className="w-full bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-500/50 focus:border-cyan-500 p-6 rounded-3xl text-sm font-black uppercase text-white outline-none appearance-none transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                                      >
                                          <option value="">Select Style...</option>
                                          {NFT_THEMES.map(t => (
                                              <option key={t.value} value={t.value}>{t.label}</option>
                                          ))}
                                      </select>
                                      {theme && (
                                          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest animate-fade-in">
                                              ✓ {NFT_THEMES.find(t => t.value === theme)?.label} Selected
                                          </p>
                                      )}
                                  </div>
                                  
                                  <div className="space-y-4 group">
                                      <div className="flex items-center space-x-3">
                                          <Database className="w-5 h-5 text-cyan-500"/>
                                          <label className="text-sm font-black text-cyan-400 uppercase tracking-widest">Category</label>
                                      </div>
                                      <select 
                                          value={dpalCategory} 
                                          onChange={e => setDpalCategory(e.target.value as Category)} 
                                          className="w-full bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-500/50 focus:border-cyan-500 p-6 rounded-3xl text-sm font-black uppercase text-white outline-none appearance-none transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                                      >
                                          <option value="">Select Category...</option>
                                          {Object.values(Category).map(c => (
                                              <option key={c} value={c}>{c}</option>
                                          ))}
                                      </select>
                                      {dpalCategory && (
                                          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest animate-fade-in">
                                              ✓ {dpalCategory} Selected
                                          </p>
                                      )}
                                  </div>
                              </div>
                              
                              <div className="pt-6">
                                  <button 
                                      onClick={syncOracleVisions} 
                                      disabled={!theme || !dpalCategory || isSyncingConcepts} 
                                      className={`w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-black py-10 rounded-[2.5rem] uppercase tracking-[0.4em] text-sm shadow-[0_0_40px_rgba(6,182,212,0.4)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-6 border-b-4 border-cyan-700 hover:border-cyan-600 relative overflow-hidden group`}
                                  >
                                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                      {isSyncingConcepts ? (
                                          <>
                                              <Loader className="w-10 h-10 animate-spin relative z-10" />
                                              <span className="relative z-10 text-base">Connecting_To_Oracle...</span>
                                          </>
                                      ) : (
                                          <>
                                              <Sparkles className="w-10 h-10 relative z-10"/>
                                              <span className="relative z-10 text-base">Generate_Unique_Visions</span>
                                          </>
                                      )}
                                  </button>
                                  {(!theme || !dpalCategory) && (
                                      <p className="text-center text-[10px] text-zinc-700 font-black uppercase tracking-widest mt-4">
                                          Select both style and category to continue
                                      </p>
                                  )}
                              </div>
                          </div>
                      )}

                      {activeStep === 'INFERENCE' && (
                          <div className="space-y-12 animate-fade-in">
                              <div className="text-center md:text-left space-y-4">
                                  <div className="flex items-center space-x-4 mb-2">
                                      <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/30">
                                          <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                                      </div>
                                      <div>
                                          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Oracle_Visions</h2>
                                          <p className="text-xs text-cyan-500 font-bold uppercase tracking-[0.4em] mt-1">AI-Generated Concepts</p>
                                      </div>
                                  </div>
                                  <p className="text-sm text-zinc-500 font-bold uppercase leading-relaxed max-w-xl">Select a vision to materialize into your artifact.</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {concepts.map((c, i) => {
                                      const hasPreview = conceptPreviews[i];
                                      const isGenerating = generatingPreviews.has(i);
                                      return (
                                          <button 
                                              key={i} 
                                              onClick={() => { setSelectedConcept(c); setActiveStep('AUGMENT'); }} 
                                              className="group relative flex flex-col bg-zinc-900 border-2 border-zinc-800 rounded-[2.5rem] hover:border-cyan-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all text-left overflow-hidden active:scale-95"
                                          >
                                              {/* Preview Image */}
                                              <div className="relative w-full h-48 bg-zinc-950 overflow-hidden">
                                                  {hasPreview ? (
                                                      <img 
                                                          src={conceptPreviews[i]} 
                                                          alt={c}
                                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                          onError={(e) => {
                                                              (e.target as HTMLImageElement).style.display = 'none';
                                                          }}
                                                      />
                                                  ) : isGenerating ? (
                                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-950/20 to-zinc-950">
                                                          <div className="text-center space-y-3">
                                                              <Loader className="w-8 h-8 text-cyan-500 animate-spin mx-auto" />
                                                              <p className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">Generating_Preview</p>
                                                          </div>
                                                      </div>
                                                  ) : (
                                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-950 to-zinc-900">
                                                          <Sparkles className="w-12 h-12 text-zinc-800 group-hover:text-cyan-500/30 transition-colors" />
                                                      </div>
                                                  )}
                                                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60"></div>
                                              </div>
                                              
                                              {/* Concept Text */}
                                              <div className="p-6 space-y-4">
                                                  <p className="text-base font-black text-white uppercase leading-tight italic group-hover:text-cyan-100 transition-colors line-clamp-2">"{c}"</p>
                                                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                                                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-cyan-600 transition-colors">Select_Concept</span>
                                                      <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
                                                  </div>
                                              </div>
                                              
                                              {/* Hover Glow Effect */}
                                              <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-colors pointer-events-none rounded-[2.5rem]"></div>
                                          </button>
                                      );
                                  })}
                              </div>
                              <div className="flex items-center justify-center space-x-6 pt-4">
                                  <button onClick={() => setActiveStep('FRAMEWORK')} className="text-[10px] font-black text-zinc-700 hover:text-white transition-colors uppercase tracking-[0.4em] flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-zinc-900 border border-zinc-800">
                                      <ArrowLeft className="w-4 h-4"/> 
                                      <span>Back_To_Setup</span>
                                  </button>
                                  <button onClick={syncOracleVisions} disabled={isSyncingConcepts} className="text-[10px] font-black text-cyan-600 hover:text-cyan-400 transition-colors uppercase tracking-[0.4em] flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-cyan-950/20 border border-cyan-800/30 disabled:opacity-50">
                                      <RefreshCw className={`w-4 h-4 ${isSyncingConcepts ? 'animate-spin' : ''}`}/> 
                                      <span>Generate_New_Visions</span>
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeStep === 'AUGMENT' && (
                          <div className="space-y-12 animate-fade-in">
                              <div className="space-y-4">
                                   <div className="flex items-center space-x-4 mb-4">
                                        <button onClick={() => setActiveStep('INFERENCE')} className="p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-xl transition-all border border-zinc-800 hover:border-cyan-500/50">
                                            <ArrowLeft className="w-4 h-4"/>
                                        </button>
                                        <div className="flex-1 bg-zinc-950 px-4 py-2 rounded-full border border-zinc-900">
                                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Selected Vision</p>
                                            <p className="text-sm font-black text-cyan-400 uppercase tracking-tight truncate">"{selectedConcept?.substring(0,40)}..."</p>
                                        </div>
                                   </div>
                                   <div className="flex items-center space-x-4">
                                       <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/30">
                                           <Zap className="w-6 h-6 text-cyan-400" />
                                       </div>
                                       <div>
                                           <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Enhance_With_Traits</h2>
                                           <p className="text-sm text-cyan-500 font-bold uppercase leading-relaxed max-w-xl mt-1">Optional: Add cryptographic modules to increase rarity</p>
                                       </div>
                                   </div>
                              </div>
                              <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-4">
                                   {FORGE_TRAITS.map(trait => {
                                       const isSelected = selectedTraits.includes(trait.id);
                                       return (
                                           <button 
                                               key={trait.id} 
                                               onClick={() => setSelectedTraits(prev => isSelected ? prev.filter(id => id !== trait.id) : [...prev, trait.id])} 
                                               className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between group shadow-xl relative overflow-hidden ${
                                                   isSelected 
                                                       ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 border-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                                                       : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-cyan-500/50 hover:bg-zinc-900'
                                               }`}
                                           >
                                               <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                               <div className="flex items-center space-x-6 text-left relative z-10">
                                                   <div className={`p-4 rounded-2xl transition-all ${isSelected ? 'bg-cyan-500 text-black shadow-[0_0_15px_cyan]' : 'bg-zinc-900 text-zinc-700 group-hover:bg-zinc-800'}`}>
                                                       <Zap className="w-5 h-5"/>
                                                   </div>
                                                   <div>
                                                       <h4 className="text-sm font-black uppercase tracking-tight">{trait.name}</h4>
                                                       <p className="text-[10px] font-bold text-zinc-600 uppercase mt-1">{trait.description}</p>
                                                   </div>
                                               </div>
                                               <div className="flex items-center space-x-4 relative z-10">
                                                   <div className="text-right">
                                                       <p className={`text-[10px] font-black ${isSelected ? 'text-amber-400' : 'text-amber-500'}`}>{trait.cost} HC</p>
                                                   </div>
                                                   {isSelected && (
                                                       <div className="p-2 bg-emerald-500 rounded-full animate-pulse">
                                                           <Check className="w-4 h-4 text-black" />
                                                       </div>
                                                   )}
                                               </div>
                                           </button>
                                       );
                                   })}
                              </div>
                              <div className="space-y-4 pt-4 border-t border-zinc-900">
                                  <div className="flex items-center justify-between text-sm">
                                      <span className="text-zinc-500 font-black uppercase tracking-widest">Total Cost</span>
                                      <span className="text-amber-400 font-black text-xl">{totalCost.toLocaleString()} HC</span>
                                  </div>
                                  <button 
                                      onClick={handleFinalSynthesis} 
                                      disabled={!canAfford || isMinting} 
                                      className={`w-full py-8 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-sm shadow-4xl active:scale-95 transition-all flex items-center justify-center space-x-6 border-b-4 relative overflow-hidden group ${
                                          canAfford 
                                              ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 border-cyan-700 hover:border-cyan-600 text-white shadow-[0_0_40px_rgba(6,182,212,0.4)]' 
                                              : 'bg-zinc-800 border-zinc-900 text-zinc-600 cursor-not-allowed'
                                      }`}
                                  >
                                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                      {isMinting ? (
                                          <>
                                              <Loader className="w-8 h-8 animate-spin relative z-10"/>
                                              <span className="relative z-10">Materializing...</span>
                                          </>
                                      ) : (
                                          <>
                                              <Gem className="w-8 h-8 relative z-10"/>
                                              <span className="relative z-10">{canAfford ? 'Materialize_Shard' : `Need ${(totalCost - hero.heroCredits).toLocaleString()} More HC`}</span>
                                          </>
                                      )}
                                  </button>
                              </div>
                          </div>
                      )}
                      
                      {activeStep === 'FORGING' && (
                          <div className="flex flex-col items-center justify-center py-20 animate-fade-in space-y-12">
                              <div className="relative">
                                  <div className="absolute -inset-20 bg-cyan-500/20 blur-[100px] animate-pulse"></div>
                                  <div className="relative z-10">
                                      <Loader className="w-32 h-32 text-cyan-500 animate-spin" />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                          <Gem className="w-16 h-16 text-cyan-400 animate-pulse" />
                                      </div>
                                  </div>
                              </div>
                              <div className="text-center space-y-6 max-w-md">
                                  <h3 className="text-4xl font-black uppercase tracking-tighter text-white bg-gradient-to-r from-cyan-400 to-white bg-clip-text text-transparent">
                                      Materializing_Shard
                                  </h3>
                                  <div className="space-y-3">
                                      <p className="text-sm font-black text-cyan-500 uppercase tracking-[0.6em] animate-pulse">
                                          Invoking_Gemini_Oracle
                                      </p>
                                      <div className="flex items-center justify-center space-x-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                                          <span>Generating_Photorealistic_Artifact</span>
                                      </div>
                                  </div>
                                  <div className="w-full max-w-xs h-1 bg-zinc-900 rounded-full overflow-hidden mt-8">
                                      <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 animate-[progress_3s_ease-in-out_infinite]"></div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="lg:col-span-5 flex flex-col h-full min-h-[500px]">
                      <div className="bg-zinc-950 border-4 border-zinc-900 rounded-[5rem] flex-grow flex flex-col items-center justify-center p-12 text-center shadow-inner relative overflow-hidden group">
                          {/* THE LIVE PREVIEW / MATERIALIZATION WINDOW */}
                          {mintedReport ? (
                              <div className="animate-materialize space-y-8 w-full">
                                  <NftCard report={mintedReport} />
                                  <div className="space-y-2">
                                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Shard_Secured_v2.5</p>
                                      <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Permanent Index: #{mintedReport.id.slice(-6)}</p>
                                  </div>
                              </div>
                          ) : isMinting ? (
                              <div className="w-full h-full flex flex-col items-center justify-center space-y-8 animate-fade-in">
                                  <div className="w-64 h-80 bg-zinc-900 border-2 border-dashed border-cyan-800/30 rounded-[3rem] relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-full h-1.5 bg-cyan-500 shadow-[0_0_20px_cyan] surgical-scan z-20"></div>
                                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
                                          <Database className="w-20 h-20 text-white" />
                                      </div>
                                  </div>
                                  <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] animate-pulse">Materializing_Artifact...</p>
                              </div>
                          ) : (
                              <div className="space-y-8 relative">
                                  <div className="absolute -inset-10 bg-cyan-500/5 blur-[80px] rounded-full animate-pulse"></div>
                                  <Target className="w-32 h-32 text-zinc-900 group-hover:text-zinc-800 transition-colors mx-auto" />
                                  <div className="space-y-2">
                                      <p className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.4em] group-hover:text-zinc-600 transition-colors">Awaiting_Hardware_Handshake</p>
                                  </div>
                              </div>
                          )}
                          
                          {/* CORNER BRACKETS */}
                          <div className="absolute top-12 left-12 w-10 h-10 border-t-2 border-l-2 border-zinc-900"></div>
                          <div className="absolute top-12 right-12 w-10 h-10 border-t-2 border-r-2 border-zinc-900"></div>
                          <div className="absolute bottom-12 left-12 w-10 h-10 border-b-2 border-l-2 border-zinc-900"></div>
                          <div className="absolute bottom-12 right-12 w-10 h-10 border-b-2 border-r-2 border-zinc-900"></div>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="flex-grow flex flex-col items-center justify-center py-10 animate-fade-in w-full materialize">
                  <div className="flex flex-col items-center space-y-12 max-w-4xl w-full">
                      {/* Success Header with Confetti Effect */}
                      <div className="text-center space-y-6 relative">
                          <div className="absolute -inset-20 bg-emerald-500/10 blur-[120px] animate-pulse rounded-full"></div>
                          <div className="relative z-10 inline-flex items-center space-x-4 bg-emerald-500/20 border-2 border-emerald-500/40 px-8 py-4 rounded-full shadow-[0_0_40px_rgba(16,185,129,0.4)] mb-6 animate-pulse">
                              <ShieldCheck className="w-7 h-7 text-emerald-400 animate-bounce" />
                              <span className="text-sm font-black text-emerald-400 uppercase tracking-[0.4em]">Materialization_Confirmed</span>
                          </div>
                          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none bg-gradient-to-r from-emerald-400 via-cyan-400 to-white bg-clip-text text-transparent relative z-10">
                              Artifact_Secured
                          </h2>
                          <p className="text-sm text-zinc-500 font-bold uppercase tracking-[0.3em] relative z-10">
                              Your unique NFT has been permanently recorded on the ledger
                          </p>
                      </div>

                      {/* NFT Card with Enhanced Presentation */}
                      <div className="relative group w-full max-w-md">
                          <div className="absolute -inset-20 bg-gradient-to-r from-cyan-500/20 via-emerald-500/20 to-cyan-500/20 blur-[100px] animate-pulse rounded-full pointer-events-none"></div>
                          <div className="absolute -inset-4 bg-cyan-500/10 rounded-[3rem] blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
                          <div className="transform transition-transform duration-1000 hover:scale-105 relative z-10">
                              {mintedReport && <NftCard report={mintedReport} />}
                          </div>
                          {/* Floating particles effect */}
                          <div className="absolute inset-0 pointer-events-none">
                              {[...Array(6)].map((_, i) => (
                                  <div 
                                      key={i}
                                      className="absolute w-2 h-2 bg-cyan-400/40 rounded-full animate-[float_3s_ease-in-out_infinite]"
                                      style={{
                                          left: `${20 + i * 15}%`,
                                          top: `${10 + i * 12}%`,
                                          animationDelay: `${i * 0.5}s`
                                      }}
                                  ></div>
                              ))}
                          </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl relative z-10">
                          <button 
                              onClick={resetForge} 
                              className="flex-1 bg-gradient-to-r from-white to-cyan-50 hover:from-cyan-50 hover:to-white text-black font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 transition-all border-b-4 border-zinc-300 hover:border-cyan-400 relative overflow-hidden group"
                          >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                              <span className="relative z-10">Mint_Another</span>
                          </button>
                          <button 
                              onClick={() => (window as any).aistudio?.onNavigate?.('hub', undefined, 'collection')} 
                              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-black py-6 rounded-2xl border-2 border-zinc-800 hover:border-cyan-500/50 uppercase tracking-[0.3em] text-xs shadow-xl active:scale-95 transition-all relative overflow-hidden group"
                          >
                              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                              <span className="relative z-10">View_Collection</span>
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {activeStep !== 'SUCCESS' && (
          <footer className="relative z-10 mt-16 pt-10 border-t border-zinc-900 flex flex-wrap justify-between items-center gap-8 opacity-60">
              <div className="flex items-center space-x-8">
                  <div className="space-y-1">
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">System_Stability</p>
                      <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span>OPTIMAL</span>
                      </div>
                  </div>
                  <div className="space-y-1">
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">API_Node</p>
                      <p className="text-[10px] font-black text-white truncate max-w-[200px]">{apiBase}</p>
                  </div>
              </div>
              <div className="flex items-center space-x-4 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-900 shadow-inner">
                   <ShieldCheck className="w-4 h-4 text-cyan-500/50" />
                   <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em]">Encrypted_Neural_Pathway_Active</span>
              </div>
          </footer>
      )}
    </div>
  );
};

export default NftMintingStation;