import React, { useState } from 'react';
import { type Hero } from '../../types';
import { X, ShieldCheck, Zap, User, Pencil, Check, Loader } from '../icons';

interface EditProfileModalProps {
    hero: Hero;
    onSave: (data: { name: string; handle: string; bio: string; heroOath?: string }) => void;
    onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ hero, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: hero.name,
        handle: hero.handle,
        bio: hero.bio,
        heroOath: hero.heroOath || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        // Simulate ledger commit
        setTimeout(() => {
            onSave(formData);
            setIsSaving(false);
        }, 1000);
    };

    return (
        <div className="dpal-modal-backdrop z-[300] p-4 md:p-10 font-mono animate-fade-in">
            <div className="dpal-modal-dialog max-w-2xl border-2 border-cyan-500/30 rounded-[4rem] shadow-4xl relative">
                <header className="dpal-modal-header p-10 flex justify-between items-center relative z-10">
                    <div className="flex items-center space-x-6">
                        <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/30">
                            <Pencil className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Node_Calibration</h2>
                            <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em]">Updating: Identity_Shard_v2.5</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="dpal-modal-close p-4 rounded-3xl shadow-xl">
                        <X className="w-8 h-8" />
                    </button>
                </header>

                <div className="dpal-modal-body p-10 space-y-8 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black dpal-text-muted uppercase tracking-widest ml-4">Operative_Name</label>
                            <input 
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full dpal-bg-deep border-2 dpal-border-subtle p-5 rounded-2xl text-sm text-white font-bold outline-none focus:border-cyan-600 transition-all shadow-inner"
                                placeholder="Public Name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black dpal-text-muted uppercase tracking-widest ml-4">Handle_Hash</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 dpal-text-muted font-bold">@</span>
                                <input 
                                    value={formData.handle}
                                    onChange={(e) => setFormData({ ...formData, handle: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                                    className="w-full dpal-bg-deep border-2 dpal-border-subtle pl-10 pr-5 py-5 rounded-2xl text-sm text-white font-bold outline-none focus:border-cyan-600 transition-all shadow-inner"
                                    placeholder="handle_id"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black dpal-text-muted uppercase tracking-widest ml-4">Briefing_Bio</label>
                        <textarea 
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full dpal-bg-deep border-2 dpal-border-subtle p-5 rounded-2xl text-sm text-white font-bold outline-none focus:border-cyan-600 transition-all shadow-inner resize-none min-h-[100px]"
                            placeholder="Define your field role..."
                            maxLength={150}
                        />
                        <p className="text-right text-[8px] font-black dpal-text-muted uppercase tracking-widest">{formData.bio.length}/150</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black dpal-text-muted uppercase tracking-widest ml-4">Hero_Oath (Permanent Anchor)</label>
                        <textarea 
                            value={formData.heroOath}
                            onChange={(e) => setFormData({ ...formData, heroOath: e.target.value })}
                            className="w-full dpal-bg-deep border-2 dpal-border-subtle p-5 rounded-2xl text-sm text-white font-bold outline-none focus:border-cyan-600 transition-all shadow-inner resize-none min-h-[120px]"
                            placeholder="I swear to hold power accountable..."
                        />
                    </div>
                </div>

                <footer className="dpal-modal-footer p-8 flex flex-col md:flex-row gap-6">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-8 py-5 dpal-btn-ghost border dpal-border-subtle rounded-2xl font-black uppercase tracking-widest text-[10px]"
                    >
                        Cancel_Abort
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !formData.name || !formData.handle}
                        className="flex-1 px-8 py-5 bg-white text-black hover:bg-cyan-50 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-3 border-b-4 border-[color:var(--dpal-border-strong)]"
                    >
                        {isSaving ? <Loader className="w-4 h-4 animate-spin"/> : <ShieldCheck className="w-4 h-4"/>}
                        <span>{isSaving ? 'Synchronizing...' : 'Commit_To_Identity_Shard'}</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default EditProfileModal;