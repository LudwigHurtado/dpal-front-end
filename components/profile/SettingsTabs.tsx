import React, { useState } from 'react';
import { type Hero, type ProfileSettings } from '../../types';
import { User, ShieldCheck, Broadcast, Zap, Check, RefreshCw, LogOut, Lock, AlertTriangle, Sparkles } from '../icons';
import { INITIAL_HERO_PROFILE } from '../../constants';
import {
  MATERIAL_PALETTE_OPTIONS,
  type MaterialPaletteId,
  applyMaterialPalette,
  getStoredMaterialPaletteId,
} from '../../utils/materialPalette';

interface SettingsTabsProps {
    hero: Hero;
    setHero: React.Dispatch<React.SetStateAction<Hero>>;
}

const SETTINGS_TABS = [
    { id: 'profile', label: 'You & family', icon: <User/> },
    { id: 'appearance', label: 'Look & feel', icon: <Sparkles/> },
    { id: 'privacy', label: 'Privacy', icon: <ShieldCheck/> },
    { id: 'notifications', label: 'Updates', icon: <Broadcast/> },
    { id: 'security', label: 'Sign-in & safety', icon: <Lock/> },
];

/** Preview swatches for palette cards (Material hues, dark-surface friendly). */
const PALETTE_PREVIEW: Record<MaterialPaletteId, { primary: string; secondary: string }> = {
  teal: { primary: '#0d9488', secondary: '#22d3ee' },
  green: { primary: '#81c784', secondary: '#4dd0e1' },
  blue: { primary: '#64b5f6', secondary: '#80cbc4' },
  bluegrey: { primary: '#90a4ae', secondary: '#81d4fa' },
  purple: { primary: '#b39ddb', secondary: '#f48fb1' },
  orange: { primary: '#ffb74d', secondary: '#aed581' },
};

const SettingsTabs: React.FC<SettingsTabsProps> = ({ hero, setHero }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [materialPalette, setMaterialPalette] = useState<MaterialPaletteId>(() => getStoredMaterialPaletteId());

    const selectMaterialPalette = (id: MaterialPaletteId) => {
        applyMaterialPalette(id);
        setMaterialPalette(id);
        try {
            window.dispatchEvent(new Event('dpal-material-palette'));
        } catch {
            /* ignore */
        }
    };

    const toggleSetting = (path: string) => {
        setIsSaving(true);
        const [category, key] = path.split('.') as [keyof ProfileSettings, string];
        
        setHero(prev => {
            const currentSettings = prev.settings || INITIAL_HERO_PROFILE.settings;
            
            return {
                ...prev,
                settings: {
                    ...currentSettings,
                    [category]: {
                        ...currentSettings[category],
                        [key]: !(currentSettings[category] as any)[key]
                    }
                }
            };
        });
        
        setTimeout(() => setIsSaving(false), 800);
    };

    const handleNodeReconstruction = () => {
        if (confirm("This will reset local settings and profile details to defaults. Your member ID and credits stay. Continue?")) {
            setIsSaving(true);
            setHero(prev => ({
                ...INITIAL_HERO_PROFILE,
                operativeId: prev.operativeId,
                heroCredits: prev.heroCredits,
                reputation: prev.reputation,
                xp: prev.xp,
                personas: prev.personas,
                inventory: prev.inventory
            }));
            setTimeout(() => {
                setIsSaving(false);
                alert("Settings restored to defaults.");
            }, 1500);
        }
    };

    return (
        <div className="bg-[var(--dpal-panel)] border-4 border-[color:var(--dpal-border)] rounded-[var(--dpal-radius-3xl)] overflow-hidden flex flex-col lg:flex-row min-h-[700px] shadow-[var(--dpal-shadow-lg)] relative">
            {/* SIDEBAR TABS */}
            <aside className="lg:w-80 bg-[var(--dpal-background-secondary)] border-r border-[color:var(--dpal-border)] p-8 space-y-4">
                 {SETTINGS_TABS.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center space-x-6 px-8 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id ? 'bg-[var(--dpal-support-cyan)] text-white shadow-[var(--dpal-shadow-md)] scale-[1.02]' : 'text-[var(--dpal-text-muted)] hover:bg-[var(--dpal-panel)] hover:text-[var(--dpal-text-secondary)]'
                        }`}
                    >
                        {React.cloneElement(tab.icon as React.ReactElement<{ className?: string }>, { className: "w-5 h-5" })}
                        <span>{tab.label}</span>
                    </button>
                 ))}
                 
                 <div className="pt-20">
                     <button className="w-full flex items-center space-x-6 px-8 py-5 rounded-2xl text-rose-600 hover:bg-rose-950/20 text-[10px] font-black uppercase tracking-widest transition-all">
                        <LogOut className="w-5 h-5" />
                        <span>Sign_Out</span>
                     </button>
                 </div>
            </aside>

            {/* CONTENT AREA */}
            <main className="flex-grow p-10 md:p-16 relative">
                 <div className="flex justify-between items-start mb-16">
                    <div>
                        <h2 className="text-3xl font-bold text-[var(--dpal-text-primary)] leading-tight tracking-tight">
                            {SETTINGS_TABS.find((t) => t.id === activeTab)?.label ?? 'Settings'}
                        </h2>
                        <p className="mt-2 text-xs font-medium text-[var(--dpal-text-muted)]">Member ID: {hero.operativeId}</p>
                    </div>
                    {isSaving && <div className="flex items-center space-x-3 text-[var(--dpal-support-cyan-bright)] animate-pulse"><RefreshCw className="w-4 h-4 animate-spin"/> <span className="text-[10px] font-black uppercase tracking-widest">Processing...</span></div>}
                 </div>

                 <div className="space-y-10 animate-fade-in">
                    {activeTab === 'profile' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-[var(--dpal-text-muted)] uppercase tracking-widest ml-4">Hero Oath (Identity Anchor)</label>
                                <textarea 
                                    className="w-full bg-[var(--dpal-background)] border-2 border-[color:var(--dpal-border)] p-6 rounded-[var(--dpal-radius-2xl)] text-sm text-[var(--dpal-text-primary)] font-bold outline-none focus:border-[var(--dpal-support-cyan)] transition-all resize-none min-h-[150px] shadow-[var(--dpal-shadow-inset)]"
                                    placeholder="I swear to hold power accountable..."
                                    value={hero?.heroOath || ''}
                                    onChange={(e) => setHero(prev => ({...prev, heroOath: e.target.value}))}
                                />
                            </div>
                            <div className="space-y-10">
                                <SettingToggle label="Show Profile Publicly" path="privacy.publicProfile" checked={hero.settings?.privacy?.publicProfile} onToggle={toggleSetting} />
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-[var(--dpal-text-muted)] uppercase tracking-widest ml-4">Terminal Language</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['EN', 'ES', 'KO'].map(lang => (
                                            <button key={lang} className={`py-4 rounded-[var(--dpal-radius-xl)] border-2 font-black text-[10px] transition-all ${lang === 'EN' ? 'bg-[var(--dpal-support-cyan)] text-white border-[color:var(--dpal-support-cyan-bright)]' : 'bg-[var(--dpal-background)] border-[color:var(--dpal-border)] text-[var(--dpal-text-muted)]'}`}>{lang}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="max-w-3xl space-y-6">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-[var(--dpal-text-primary)] mb-2">
                                    Material Design topic
                                </h3>
                                <p className="text-[9px] font-bold text-[var(--dpal-text-muted)] uppercase tracking-widest leading-relaxed">
                                    Chooses primary and secondary accents (--md-sys-color-*). Surfaces stay neutral; matches DPAL token rules in styles/dpal-theme.css.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {MATERIAL_PALETTE_OPTIONS.map((opt) => {
                                    const active = materialPalette === opt.id;
                                    const sw = PALETTE_PREVIEW[opt.id];
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => selectMaterialPalette(opt.id)}
                                            className={`text-left rounded-[var(--dpal-radius-2xl)] border-2 p-5 transition-all ${
                                                active
                                                    ? 'border-[var(--md-sys-color-primary)] bg-[color-mix(in_srgb,var(--md-sys-color-primary-container)_35%,transparent)] shadow-[var(--dpal-shadow-md)]'
                                                    : 'border-[color:var(--dpal-border)] bg-[var(--dpal-background)] hover:border-[var(--md-sys-color-outline)]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <span
                                                    className="h-10 w-10 shrink-0 rounded-xl border border-white/10 shadow-inner"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${sw.primary} 55%, ${sw.secondary} 100%)`,
                                                    }}
                                                    aria-hidden
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black uppercase tracking-wide text-[var(--dpal-text-primary)] truncate">
                                                        {opt.label}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-[var(--dpal-text-muted)] uppercase tracking-wider">{opt.hint}</p>
                                                </div>
                                                {active && (
                                                    <Check className="w-5 h-5 shrink-0 text-[var(--md-sys-color-primary)] ml-auto" aria-hidden />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="max-w-2xl space-y-8">
                            <SettingToggle label="Anonymous Reporting Default" path="privacy.anonymousReporting" checked={hero.settings?.privacy?.anonymousReporting} onToggle={toggleSetting} desc="File reports without attaching your operative ID to the block." />
                            <SettingToggle label="Show Collective Inventory" path="privacy.showInventory" checked={hero.settings?.privacy?.showInventory} onToggle={toggleSetting} desc="Allow peers to view your earned shards and badges." />
                            <SettingToggle label="Impact Stats Public" path="privacy.showStats" checked={hero.settings?.privacy?.showStats} onToggle={toggleSetting} desc="Share your dollar-recovery and help-scores with the network." />
                            <SettingToggle label="Allow Peer Direct Comms" path="privacy.allowDms" checked={hero.settings?.privacy?.allowDms} onToggle={toggleSetting} desc="Enable P2P messaging with verified guardians." />
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="max-w-2xl space-y-8">
                            <SettingToggle label="Daily Challenge Reminders" path="notifications.dailyChallenge" checked={hero.settings?.notifications?.dailyChallenge} onToggle={toggleSetting} />
                            <SettingToggle label="Regional Mission Alerts" path="notifications.missionAvailable" checked={hero.settings?.notifications?.missionAvailable} onToggle={toggleSetting} />
                            <SettingToggle label="Peer Verification Requests" path="notifications.verificationRequests" checked={hero.settings?.notifications?.verificationRequests} onToggle={toggleSetting} />
                            <SettingToggle label="Ledger Commit Receipts" path="notifications.mintConfirmations" checked={hero.settings?.notifications?.mintConfirmations} onToggle={toggleSetting} />
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="max-w-2xl space-y-12">
                             <div className="p-8 bg-[var(--dpal-background)] rounded-[var(--dpal-radius-3xl)] border-2 border-[color:var(--dpal-border)] space-y-6 shadow-[var(--dpal-shadow-inset)]">
                                <div className="flex items-center space-x-6">
                                    <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20"><Zap className="w-8 h-8 text-rose-500"/></div>
                                    <div>
                                        <p className="text-lg font-black text-white uppercase tracking-tighter">Biometric_Lock_v4</p>
                                        <p className="text-[10px] font-bold text-[var(--dpal-text-muted)] uppercase tracking-widest">Enhanced Security Protocol</p>
                                    </div>
                                </div>
                                <button className="w-full py-4 bg-[var(--dpal-surface-alt)] hover:bg-[var(--dpal-panel)] text-[var(--dpal-text-primary)] rounded-[var(--dpal-radius-xl)] font-black uppercase tracking-widest text-[10px] transition-all border border-[color:var(--dpal-border)]">Update_Secure_Keyphrase</button>
                             </div>
                             
                             <div className="p-8 bg-[color-mix(in_srgb,var(--dpal-panel)_40%,transparent)] border-2 border-[color:var(--dpal-border)] border-dashed rounded-[var(--dpal-radius-3xl)] space-y-6">
                                 <div className="flex items-center space-x-4 text-amber-500">
                                     <AlertTriangle className="w-6 h-6" />
                                     <h4 className="text-sm font-black uppercase tracking-tight">Identity_Repair_Protocol</h4>
                                 </div>
                                 <p className="text-[10px] font-bold text-[var(--dpal-text-muted)] uppercase leading-relaxed tracking-widest">
                                     IF YOUR IDENTITY SHARD IS CORRUPTED OR UI PARAMETERS ARE FAILING TO RENDER, INITIALIZE NODE RECONSTRUCTION. THIS REBUILDS SYSTEM FIELDS FROM ORIGIN WITHOUT DELETING EARNED CREDITS.
                                 </p>
                                 <button 
                                    onClick={handleNodeReconstruction}
                                    className="w-full py-4 bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-black border border-amber-600/30 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                                 >
                                     Run_Node_Reconstruction
                                 </button>
                             </div>
                        </div>
                    )}
                 </div>
            </main>
        </div>
    );
};

const SettingToggle: React.FC<{ label: string; path: string; checked?: boolean; onToggle: (p: string) => void; desc?: string }> = ({ label, path, checked = false, onToggle, desc }) => (
    <div className="flex items-start justify-between gap-10 group">
        <div className="flex-grow min-w-0">
            <h4 className="text-sm font-black text-[var(--dpal-text-primary)] uppercase tracking-tight mb-1 group-hover:text-[var(--dpal-support-cyan-bright)] transition-colors">{label}</h4>
            {desc && <p className="text-[9px] font-bold text-[var(--dpal-text-muted)] uppercase tracking-widest leading-relaxed">{desc}</p>}
        </div>
        <button 
            onClick={() => onToggle(path)}
            className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${checked ? 'bg-[var(--dpal-support-cyan)] border border-[color:var(--dpal-support-cyan-bright)] shadow-[0_0_15px_var(--dpal-support-cyan-glow)]' : 'bg-[var(--dpal-background-secondary)] border border-[color:var(--dpal-border)]'}`}
        >
            <div className={`absolute top-1 w-5 h-5 rounded-full transition-all duration-500 ${checked ? 'right-1 bg-white shadow-[var(--dpal-shadow-md)]' : 'left-1 bg-[var(--dpal-surface-alt)]'}`}></div>
        </button>
    </div>
);

export default SettingsTabs;
