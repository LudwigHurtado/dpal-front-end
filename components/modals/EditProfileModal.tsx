import React, { useState } from 'react';
import { type Hero } from '../../types';
import { X, Heart, Pencil, Check, Loader } from '../icons';

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
        heroOath: hero.heroOath || '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            onSave(formData);
            setIsSaving(false);
        }, 600);
    };

    return (
        <div className="dpal-modal-backdrop z-[300] animate-fade-in p-4 font-sans md:p-10">
            <div className="dpal-modal-dialog relative max-w-2xl rounded-3xl border-2 border-amber-800/40 shadow-2xl">
                <header className="dpal-modal-header relative z-10 flex items-center justify-between p-8 md:p-10">
                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/40 p-3">
                            <Pencil className="h-7 w-7 text-amber-300" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-white">Edit your profile</h2>
                            <p className="mt-1 text-xs font-medium text-stone-400">Share what feels right for you and your family</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="dpal-modal-close rounded-2xl p-3 shadow-lg">
                        <X className="h-6 w-6" />
                    </button>
                </header>

                <div className="custom-scrollbar dpal-modal-body max-h-[60vh] space-y-6 overflow-y-auto p-8 md:p-10">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="ml-1 text-xs font-medium text-stone-400">Name</label>
                            <input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="dpal-bg-deep dpal-border-subtle w-full rounded-2xl border-2 p-4 text-sm font-medium text-white shadow-inner outline-none transition-all focus:border-amber-600/50"
                                placeholder="How you’d like to be called"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="ml-1 text-xs font-medium text-stone-400">Username</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-stone-500">@</span>
                                <input
                                    value={formData.handle}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            handle: e.target.value.replace(/\s+/g, '_').toLowerCase(),
                                        })
                                    }
                                    className="dpal-bg-deep dpal-border-subtle w-full rounded-2xl border-2 py-4 pl-9 pr-4 text-sm font-medium text-white shadow-inner outline-none transition-all focus:border-amber-600/50"
                                    placeholder="neighbor_name"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="ml-1 text-xs font-medium text-stone-400">A few words about you</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="dpal-bg-deep dpal-border-subtle min-h-[100px] w-full resize-none rounded-2xl border-2 p-4 text-sm font-medium text-white shadow-inner outline-none transition-all focus:border-amber-600/50"
                            placeholder="Family, neighborhood, what you care about…"
                            maxLength={150}
                        />
                        <p className="text-right text-[10px] font-medium text-stone-500">{formData.bio.length}/150</p>
                    </div>

                    <div className="space-y-2">
                        <label className="ml-1 text-xs font-medium text-stone-400">Your promise (optional)</label>
                        <textarea
                            value={formData.heroOath}
                            onChange={(e) => setFormData({ ...formData, heroOath: e.target.value })}
                            className="dpal-bg-deep dpal-border-subtle min-h-[100px] w-full resize-none rounded-2xl border-2 p-4 text-sm font-medium text-white shadow-inner outline-none transition-all focus:border-amber-600/50"
                            placeholder="I choose to be honest, kind, and to stand with my neighbors…"
                        />
                    </div>
                </div>

                <footer className="dpal-modal-footer flex flex-col gap-3 p-6 md:flex-row md:gap-4 md:p-8">
                    <button
                        type="button"
                        onClick={onClose}
                        className="dpal-btn-ghost dpal-border-subtle flex-1 rounded-2xl border px-6 py-4 text-sm font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !formData.name || !formData.handle}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-amber-900 bg-amber-500 px-6 py-4 text-sm font-semibold text-stone-900 shadow-lg transition-all hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50"
                    >
                        {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                        {isSaving ? 'Saving…' : 'Save profile'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default EditProfileModal;
