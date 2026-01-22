import React, { useState } from 'react';
import { type Hero, type ProfileSettings } from '../../types';
import { User, ShieldCheck, Broadcast, Zap, Database, Globe, Check, RefreshCw, X, LogOut, Lock, ChevronRight, AlertTriangle } from '../icons';
import { INITIAL_HERO_PROFILE } from '../../constants';

interface SettingsTabsProps {
    hero: Hero;
    setHero: React.Dispatch<React.SetStateAction<Hero>>;
}

const SETTINGS_TABS = [
    { id: 'profile', label: 'Identity', icon: <User/> },
    { id: 'privacy', label: 'Stealth_Ops', icon: <ShieldCheck/> },
    { id: 'notifications', label: 'Broadcast_Alerts', icon: <Broadcast/> },
    { id: 'security', label: 'Ledger_Auth', icon: <Lock/> },
];

const SettingsTabs: React.FC<SettingsTabsProps> = ({ hero, setHero }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);

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
        if (confirm("WARNING: This will reset all local settings and profile data to defaults. Your Operative ID and credits will be preserved. Proceed?")) {
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
                alert("Identity Reconstruction Complete.");
            }, 1500);
        }
    };

    return (
        <div className="bg-zinc-900 border-4 border-zinc-800 rounded-[4rem] overflow-hidden flex flex-col lg:flex-row min-h-[700px] shadow-4xl relative">
            {/* SIDEBAR TABS */}
            <aside className="lg:w-80 bg-zinc-950 border-r border-zinc-800 p-8 space-y-4">
                 {SETTINGS_TABS.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center space-x-6 px-8 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id ? 'bg-cyan-600 text-white shadow-xl scale-[1.02]' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                        }`}
                    >
                        {React.cloneElement(tab.icon as React.ReactElement, { className: "w-5 h-5" })}
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
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{activeTab.toUpperCase()}_CALIBRATION</h2>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-4">Shard: DPAL-S_V2.5 // Node: {hero.operativeId}</p>
                    </div>
                    {isSaving && <div className="flex items-center space-x-3 text-cyan-400 animate-pulse"><RefreshCw className="w-4 h-4 animate-spin"/> <span className="text-[10px] font-black uppercase tracking-widest">Processing...</span></div>}
                 </div>

                 <div className="space-y-10 animate-fade-in">
                    {activeTab === 'profile' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-4">Hero Oath (Identity Anchor)</label>
                                <textarea 
                                    className="w-full bg-black border-2 border-zinc-800 p-6 rounded-[2rem] text-sm text-white font-bold outline-none focus:border-cyan-600 transition-all resize-none min-h-[150px] shadow-inner"
                                    placeholder="I swear to hold power accountable..."
                                    value={hero?.heroOath || ''}
                                    onChange={(e) => setHero(prev => ({...prev, heroOath: e.target.value}))}
                                />
                            </div>
                            <div className="space-y-10">
                                <SettingToggle label="Show Profile Publicly" path="privacy.publicProfile" checked={hero.settings?.privacy?.publicProfile} onToggle={toggleSetting} />
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-4">Terminal Language</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['EN', 'ES', 'KO'].map(lang => (
                                            <button key={lang} className={`py-4 rounded-xl border-2 font-black text-[10px] transition-all ${lang === 'EN' ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-black border-zinc-900 text-zinc-600'}`}>{lang}</button>
                                        ))}
                                    </div>
                                </div>
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
                             <div className="p-8 bg-black rounded-[3rem] border-2 border-zinc-900 space-y-6 shadow-inner">
                                <div className="flex items-center space-x-6">
                                    <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20"><Zap className="w-8 h-8 text-rose-500"/></div>
                                    <div>
                                        <p className="text-lg font-black text-white uppercase tracking-tighter">Biometric_Lock_v4</p>
                                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Enhanced Security Protocol</p>
                                    </div>
                                </div>
                                <button className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Update_Secure_Keyphrase</button>
                             </div>
                             
                             <div className="p-8 bg-zinc-900/40 border-2 border-zinc-800 border-dashed rounded-[3rem] space-y-6">
                                 <div className="flex items-center space-x-4 text-amber-500">
                                     <AlertTriangle className="w-6 h-6" />
                                     <h4 className="text-sm font-black uppercase tracking-tight">Identity_Repair_Protocol</h4>
                                 </div>
                                 <p className="text-[10px] font-bold text-zinc-500 uppercase leading-relaxed tracking-widest">
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
            <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1 group-hover:text-cyan-400 transition-colors">{label}</h4>
            {desc && <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed">{desc}</p>}
        </div>
        <button 
            onClick={() => onToggle(path)}
            className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${checked ? 'bg-cyan-600 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-zinc-950 border border-zinc-800'}`}
        >
            <div className={`absolute top-1 w-5 h-5 rounded-full transition-all duration-500 ${checked ? 'right-1 bg-white shadow-xl' : 'left-1 bg-zinc-800'}`}></div>
        </button>
    </div>
);

export default SettingsTabs;
