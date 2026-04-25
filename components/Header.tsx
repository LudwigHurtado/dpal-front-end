
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Shield, User, Coins, Gem, Globe, Maximize2, Search, Monitor, Broadcast, Store, List, Package, Database, Zap, Target, Award, ChevronLeft, ChevronRight, Activity, X, Home, Sparkles, AlertTriangle, Megaphone, Briefcase } from './icons';
import { useTranslations } from '../i18n';
import { type Hero, SubscriptionTier, type Category } from '../types';
import { TextScale, type View, type HeroHubTab, type HubTab } from '../App';
import { isAiEnabled } from '../services/geminiService';

interface HeaderProps {
    onNavigateToHeroHub: () => void;
    onNavigateHome: () => void;
    onNavigateToReputationAndCurrency: () => void;
    onNavigateMissions: () => void;
    onNavigate: (view: View, category?: Category, tab?: HeroHubTab | HubTab) => void;
    hero: Hero;
    textScale: TextScale;
    setTextScale: (scale: TextScale) => void;
}

const AiStatusIndicator: React.FC = () => {
    const [status, setStatus] = useState<'ONLINE' | 'OFFLINE' | 'DEGRADED'>('OFFLINE');

    useEffect(() => {
        const check = () => {
            const enabled = isAiEnabled();
            setStatus(enabled ? 'ONLINE' : 'OFFLINE');
        };
        check();
        const interval = setInterval(check, 10000);
        return () => clearInterval(interval);
    }, []);

    const config = {
        ONLINE: { label: 'Here', color: 'text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-950/20', border: 'border-emerald-500/30' },
        OFFLINE: { label: 'Rest', color: 'text-[var(--dpal-text-muted)]', dot: 'bg-[var(--dpal-surface-alt)]', bg: 'bg-[var(--dpal-panel)]', border: 'border-[color:var(--dpal-border)]' },
        DEGRADED: { label: 'Limited', color: 'text-rose-400', dot: 'bg-rose-500', bg: 'bg-rose-950/20', border: 'border-rose-500/30' }
    }[status];

    return (
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all duration-500 ${config.bg} ${config.border}`}>
            <div className="relative flex items-center justify-center">
                <div className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status !== 'OFFLINE' ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''}`}></div>
                {status === 'ONLINE' && <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>}
            </div>
            <span className={`text-[8px] font-semibold tracking-wide ${config.color}`} title={status === 'ONLINE' ? 'Assistant available' : status === 'OFFLINE' ? 'Assistant paused' : 'Assistant limited'}>
                {config.label}
            </span>
            {status === 'ONLINE' ? <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> : <AlertTriangle className={`w-2.5 h-2.5 ${config.color}`} />}
        </div>
    );
};

const DualCometBorder: React.FC<{ color: string }> = ({ color }) => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
        <rect 
            x="0" y="0" width="100%" height="100%" 
            rx="0.75rem" fill="none" 
            stroke={color} strokeWidth="2.5"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-border-trace-cw-fast"
            style={{ 
                filter: `drop-shadow(0 0 8px ${color})`,
                strokeDasharray: '40 250'
            }}
        />
        <rect 
            x="0" y="0" width="100%" height="100%" 
            rx="0.75rem" fill="none" 
            stroke={color} strokeWidth="1.5"
            className="opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-border-trace-ccw-fast"
            style={{ 
                filter: `drop-shadow(0 0 12px ${color})`,
                strokeDasharray: '60 300'
            }}
        />
    </svg>
);

const SystemTicker: React.FC = () => {
    const messages = [
        "Every report can protect a family — thank you for caring for your community.",
        "Hope grows when neighbors share truth with kindness and show up for each other.",
        "Your contributions build safer streets, stronger schools, and a ledger we can all trust.",
        "Small acts of civic courage add up — keep going; you are making a difference.",
    ];

    return (
        <div className="flex-grow mx-2 md:mx-4 overflow-hidden relative group h-10 flex items-center rounded-xl px-4 min-w-0 bg-[var(--dpal-topbar)] border border-[color:color-mix(in_srgb,var(--dpal-border-strong)_55%,transparent)]">
            <div className="whitespace-nowrap animate-ticker flex items-center space-x-12">
                {[...messages, ...messages].map((msg, idx) => (
                    <div key={idx} className="flex items-center space-x-4">
                        <div
                            className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"
                            style={{ boxShadow: '0 0 10px rgba(59, 130, 246, 0.85)' }}
                        />
                        <span className="text-[9px] font-medium italic text-blue-400 transition-colors duration-500 group-hover:text-blue-300 [text-shadow:0_0_24px_rgba(59,130,246,0.35)]">
                            {msg}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker {
                    animation: ticker 150s linear infinite;
                }
                .animate-ticker:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({ 
    onNavigateToHeroHub, 
    onNavigateHome, 
    onNavigateToReputationAndCurrency, 
    onNavigateMissions,
    onNavigate,
    hero, 
    textScale, 
    setTextScale,
}) => {
  const { language, setLanguage } = useTranslations();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(50);
  const [canScroll, setCanScroll] = useState(false);
  
  const toggleScale = () => {
    if (textScale === 'standard') setTextScale('large');
    else if (textScale === 'large') setTextScale('ultra');
    else if (textScale === 'ultra') setTextScale('magnified');
    else setTextScale('standard');
  };

  /** View / accessibility mode — do not navigate to the report category flow (that path is reserved for “Share a report”). */
  const openViewModeSetup = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('dpal-open-view-mode-setup'));
    }
  };

  const syncScrollState = () => {
    const el = navScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth - clientWidth;
    const scrollable = overflow > 4;
    setCanScroll(scrollable);
    setShowLeftArrow(scrollable && scrollLeft > 10);
    setShowRightArrow(scrollable && scrollLeft < overflow - 10);
    if (scrollable) {
      const tw = Math.max(20, Math.round((clientWidth / scrollWidth) * 100));
      setThumbWidth(tw);
      setScrollPct(Math.round((scrollLeft / overflow) * (100 - tw)));
    }
  };

  const scrollNav = (direction: 'left' | 'right') => {
    const el = navScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  // Drag state for the custom scrollbar thumb
  const thumbDragRef = useRef<{ startX: number; startScroll: number } | null>(null);

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = navScrollRef.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    thumbDragRef.current = { startX: e.clientX, startScroll: el.scrollLeft };
  };

  const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = navScrollRef.current;
    if (!el || !thumbDragRef.current) return;
    const { scrollWidth, clientWidth } = el;
    const trackWidth = (e.currentTarget.parentElement?.clientWidth ?? clientWidth) - (thumbWidth / 100) * (e.currentTarget.parentElement?.clientWidth ?? clientWidth);
    const overflow = scrollWidth - clientWidth;
    const dx = e.clientX - thumbDragRef.current.startX;
    const ratio = overflow / (trackWidth || 1);
    el.scrollLeft = Math.max(0, Math.min(overflow, thumbDragRef.current.startScroll + dx * ratio));
  };

  const onThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    thumbDragRef.current = null;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    // Delay so icons are fully rendered before measuring overflow
    const timer = setTimeout(syncScrollState, 80);
    window.addEventListener('resize', syncScrollState);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', syncScrollState);
        clearTimeout(timer);
    };
  }, []);

  const getTierColor = (tier: SubscriptionTier) => {
      switch(tier) {
          case SubscriptionTier.Oracle: return 'text-emerald-400 border-emerald-500/50';
          case SubscriptionTier.Sentinel: return 'text-amber-400 border-amber-500/50';
          case SubscriptionTier.Guardian: return 'text-cyan-400 border-cyan-500/50';
          default: return 'text-[var(--dpal-text-muted)] border-[color:var(--dpal-border)]';
      }
  };

  return (
    <header className="dpal-topbar sticky top-0 z-[100] font-mono w-full flex flex-col">
      <div className="w-full px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          
          <button onClick={onNavigateHome} className="flex items-center space-x-3 group flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/10 blur-lg group-hover:bg-cyan-400/20 transition-all"></div>
              <div className="relative p-2 bg-[var(--dpal-panel)] border border-cyan-500/30 rounded-xl group-hover:border-cyan-400 transition-all">
                  <ShieldCheck className="h-6 w-6 text-cyan-500" />
              </div>
            </div>
            <div className="text-left leading-none hidden xs:block">
              <h1 className="text-xl font-black text-[var(--dpal-text-primary)] tracking-tighter uppercase">DPAL</h1>
              <p className="text-[7px] font-black text-[var(--dpal-text-muted)] uppercase tracking-[0.3em] mt-1">CORE_V2.5</p>
            </div>
          </button>

          <SystemTicker />

          <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
             <AiStatusIndicator />

             <Link
               to="/account"
               className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[color:var(--dpal-border)] bg-[var(--dpal-panel)] text-[7px] font-black uppercase tracking-widest text-cyan-400/90 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
               title="Account, profile, and sign in"
             >
               <User className="w-3.5 h-3.5 shrink-0" />
               <span className="hidden xs:inline">Account</span>
             </Link>
             
             <div className="hidden lg:flex flex-col items-end mr-2 text-right">
                <span className="text-[9px] font-black text-[var(--dpal-text-primary)] uppercase tracking-tighter leading-none">{hero.name}</span>
                <button 
                    onClick={() => onNavigate('subscription')}
                    className={`text-[7px] font-bold uppercase tracking-widest mt-1 px-2 py-0.5 rounded border bg-[color-mix(in_srgb,var(--dpal-surface-alt)_90%,var(--dpal-purple)_8%)] hover:brightness-95 transition-colors ${getTierColor(hero.subscriptionTier)}`}
                >
                    {hero.subscriptionTier.replace('_', ' ')}
                </button>
             </div>

             <div className="flex items-center bg-[var(--dpal-panel)] border border-[color:var(--dpal-border)] rounded-xl p-1 pr-2 md:pr-3 space-x-2 md:space-x-3 shadow-inner">
                <button 
                    type="button"
                    onClick={onNavigateToHeroHub}
                    title="Hero hub — mint or manage your human hero"
                    aria-label="Open hero hub: mint and profile"
                    className="w-8 h-8 md:w-9 md:h-9 shrink-0 rounded-full overflow-hidden border-2 border-[color:var(--dpal-border)] bg-[var(--dpal-background-secondary)] flex items-center justify-center hover:border-amber-400/70 hover:ring-2 hover:ring-amber-500/25 transition-all"
                >
                    {hero.personas.find(p => p.id === hero.equippedPersonaId)?.imageUrl ? (
                        <img src={hero.personas.find(p => p.id === hero.equippedPersonaId)?.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <User className="w-4 h-4 text-[var(--dpal-text-muted)]" />
                    )}
                </button>
                <button onClick={onNavigateToReputationAndCurrency} className="flex items-center space-x-2 outline-none group">
                    <Coins className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col items-start leading-none">
                        <span className="font-black text-[var(--dpal-text-primary)] text-[9px] md:text-[10px]">{hero.heroCredits.toLocaleString()}</span>
                        <span className="text-[6px] font-bold text-[var(--dpal-text-muted)] uppercase tracking-tighter mt-0.5">$0.005/CREDIT</span>
                    </div>
                </button>
                <div className="hidden sm:block w-px h-5 bg-[var(--dpal-border)] mx-1"></div>
                <button
                    onClick={openViewModeSetup}
                    className="hidden sm:flex items-center space-x-1 text-[var(--dpal-text-muted)] hover:text-cyan-300 transition-colors"
                    title="View Mode Setup"
                >
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="text-[7px] font-black uppercase tracking-widest">Mode</span>
                </button>
                <button onClick={toggleScale} className="hidden sm:block text-[var(--dpal-text-muted)] hover:text-[var(--dpal-text-primary)] transition-colors" title="Interface Scale">
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>
             </div>
          </div>
      </div>

      {/* ── Icon navigation row ── */}
      <div className="w-full border-t border-[color:color-mix(in_srgb,var(--dpal-border)_45%,transparent)] flex flex-col">

        {/* Scroll area with fade edges + arrow buttons */}
        <div className="relative flex items-center overflow-hidden">
          {/* Left fade + arrow */}
          <div className={`absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black/40 to-transparent z-10 pointer-events-none transition-opacity duration-200 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`absolute left-1.5 z-20 transition-all duration-200 ${showLeftArrow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <button
              onClick={() => scrollNav('left')}
              className="p-2 bg-[var(--dpal-panel)] rounded-full border border-[color:var(--dpal-border)] text-[var(--dpal-text-secondary)] hover:text-cyan-400 shadow-lg backdrop-blur-sm active:scale-90 transition-all"
            >
              <ChevronLeft className="w-4 h-4"/>
            </button>
          </div>

          {/* Right fade + arrow */}
          <div className={`absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black/40 to-transparent z-10 pointer-events-none transition-opacity duration-200 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`absolute right-1.5 z-20 transition-all duration-200 ${showRightArrow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <button
              onClick={() => scrollNav('right')}
              className="p-2 bg-[var(--dpal-panel)] rounded-full border border-[color:var(--dpal-border)] text-[var(--dpal-text-secondary)] hover:text-cyan-400 shadow-lg backdrop-blur-sm active:scale-90 transition-all"
            >
              <ChevronRight className="w-4 h-4"/>
            </button>
          </div>

          {/* Scrollable icon list */}
          <div
            ref={navScrollRef}
            onScroll={syncScrollState}
            className="w-full overflow-x-auto dpal-nav-scroll flex justify-start md:justify-center"
          >
            <div className="flex items-center space-x-6 md:space-x-10 py-3 px-10 md:px-12 min-w-max mx-auto">
              <NavIcon label="Home" color="cyan" icon={<Home className="w-5 h-5"/>} onClick={onNavigateHome} />
              <NavIcon label="Share A Report" color="rose" icon={<Megaphone className="w-5 h-5"/>} onClick={() => onNavigate('categorySelection')} />
              <NavIcon label="Public feed" color="blue" icon={<List className="w-5 h-5"/>} onClick={() => onNavigate('hub', undefined, 'work_feed')} />
              <NavIcon label="Public Record" color="emerald" icon={<Database className="w-5 h-5"/>} onClick={() => onNavigate('transparencyDatabase')} />
              <NavIcon label="Missions" title="Mission marketplace — browse and join" color="amber" icon={<Target className="w-5 h-5"/>} onClick={onNavigateMissions} />
              <NavIcon label="Create mission" title="New mission wizard" color="emerald" icon={<Sparkles className="w-5 h-5"/>} onClick={() => onNavigate('createMission')} />
              <NavIcon label="DPAL Lifts" title="DPAL Lifts — Decentralized Public Assistance Lifts" color="emerald" icon={<Shield className="w-5 h-5"/>} onClick={() => onNavigate('dpalLifts')} />
              <NavIcon label="Work Network" title="DPAL Work Network" color="blue" icon={<Briefcase className="w-5 h-5"/>} onClick={() => onNavigate('aiWorkDirectives')} />
              <NavIcon label="Learning lab" color="purple" icon={<Monitor className="w-5 h-5"/>} onClick={() => onNavigate('trainingHolodeck')} />
              <NavIcon label="Private Space" color="cyan" icon={<User className="w-5 h-5"/>} onClick={() => onNavigate('privateHubMenu')} />
              <NavIcon label="Help Center" color="blue" icon={<ShieldCheck className="w-5 h-5"/>} onClick={() => onNavigate('helpCenter')} />
            </div>
          </div>
        </div>

        {/* ── Custom drag scrollbar pill — only shown when content overflows ── */}
        {canScroll && (
          <div className="px-4 pb-2 pt-0.5">
            <div className="relative h-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--dpal-border)_60%,transparent)]">
              <div
                className="absolute top-0 h-full rounded-full bg-cyan-500/60 hover:bg-cyan-400 active:bg-cyan-300 cursor-grab active:cursor-grabbing transition-colors touch-none select-none"
                style={{ width: `${thumbWidth}%`, left: `${scrollPct}%` }}
                onPointerDown={onThumbPointerDown}
                onPointerMove={onThumbPointerMove}
                onPointerUp={onThumbPointerUp}
                onPointerCancel={onThumbPointerUp}
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        .dpal-nav-scroll { scroll-behavior: smooth; -ms-overflow-style: none; scrollbar-width: none; }
        .dpal-nav-scroll::-webkit-scrollbar { display: none; }
        
        @keyframes border-trace-cw-fast {
            0% { stroke-dashoffset: 250; }
            100% { stroke-dashoffset: 0; }
        }
        @keyframes border-trace-ccw-fast {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: 320; }
        }
        .animate-border-trace-cw-fast {
            animation: border-trace-cw-fast 2.2s linear infinite;
        }
        .animate-border-trace-ccw-fast {
            animation: border-trace-ccw-fast 3.2s linear infinite;
        }
        @media (max-width: 400px) {
            .xs\\:block { display: block; }
            .hidden.xs\\:block { display: block; }
        }
      `}</style>
    </header>
  );
};

const NavIcon: React.FC<{ icon: React.ReactNode; label: string; color: string; onClick: () => void; title?: string }> = ({ icon, label, color, onClick, title }) => {
    const colorHex: Record<string, string> = {
        cyan: '#22d3ee',
        emerald: '#10b981',
        amber: '#f59e0b',
        rose: '#f43f5e',
        purple: '#a855f7',
        blue: '#3b82f6'
    };

    return (
        <button 
            type="button"
            title={title ?? label}
            onClick={onClick}
            className="flex flex-col items-center justify-center space-y-2 group transition-all flex-shrink-0 relative px-1 md:px-2"
        >
            <div className="relative p-2.5 md:p-3 rounded-xl bg-[var(--dpal-panel)] border border-[color:var(--dpal-border)] group-hover:bg-[var(--dpal-surface-alt)] transition-all shadow-lg overflow-hidden">
                <DualCometBorder color={colorHex[color]} />
                <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-all duration-700 pointer-events-none z-10 rotate-[35deg] translate-x-[-100%] group-hover:translate-x-[100%]"
                    style={{ 
                        background: `linear-gradient(90deg, transparent, ${colorHex[color]}88, transparent)`,
                        width: '200%'
                    }}
                />
                <div 
                    className="relative transition-all duration-300 transform group-hover:scale-110 z-20"
                    style={{ color: colorHex[color] }}
                >
                    <div style={{ filter: `drop-shadow(0 0 5px ${colorHex[color]}44)` }}>
                        {React.cloneElement(icon as React.ReactElement<any>, { className: `w-5 h-5` })}
                    </div>
                </div>
            </div>
            <span className="max-w-[72px] text-center text-[6px] font-semibold leading-tight tracking-wide text-[var(--dpal-text-muted)] transition-colors group-hover:text-white md:text-[7px] md:max-w-[88px]">
                {label}
            </span>
        </button>
    );
};

export default Header;
