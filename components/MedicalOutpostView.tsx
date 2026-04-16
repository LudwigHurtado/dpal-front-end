
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { type Hero, type HealthRecord } from '../types';
import { ArrowLeft, Activity, ShieldCheck, Plus, Database, Cloud, X, QrCode, User, Heart, Trash2, Printer, Pill, Smile, FileCode, Check, Pencil, Globe, Target, Camera, Sparkles, Monitor, RefreshCw, Send, Link } from './icons';
import { anchorQrPayloadOnChain } from '../services/qrBlockchainService';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/chips/assist-chip.js';

interface MedicalOutpostViewProps {
    onReturn: () => void;
    hero: Hero;
    records: HealthRecord[];
    setRecords: React.Dispatch<React.SetStateAction<HealthRecord[]>>;
}

type FolderCategory = 'EMERGENCY' | 'CHRONIC' | 'IMAGING' | 'LABS' | 'RX' | 'DOCUMENTS';

const MEDICAL_FOLDERS: { id: FolderCategory, label: string, icon: React.ReactNode }[] = [
    { id: 'EMERGENCY', label: 'Emergency Profile', icon: <Heart className="w-5 h-5"/> },
    { id: 'CHRONIC', label: 'Chronic Conditions', icon: <User className="w-5 h-5"/> },
    { id: 'IMAGING', label: 'Imaging / Radiology', icon: <Activity className="w-5 h-5"/> },
    { id: 'LABS', label: 'Lab Results', icon: <FileCode className="w-5 h-5"/> },
    { id: 'RX', label: 'Prescriptions', icon: <Pill className="w-5 h-5"/> },
    { id: 'DOCUMENTS', label: 'Provider Documents', icon: <Target className="w-5 h-5"/> },
];

const MEDICAL_HERO_IMAGES = [
    '/main-screen/medical-qr-flow-en.png',
    '/main-screen/medical-qr-flow-es.png',
];
const MEDICAL_HERO_FALLBACK = '/main-screen/qr-live-saver.png';

const MedicalOutpostView: React.FC<MedicalOutpostViewProps> = ({ onReturn, hero, records, setRecords }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [activeFolder, setActiveFolder] = useState<FolderCategory | 'PROFILE'>('PROFILE');
    const [language, setLanguage] = useState<'EN' | 'ES'>('EN');
    const [qrAnchorState, setQrAnchorState] = useState<{ status: 'idle' | 'sealing' | 'anchored' | 'failed'; blockIndex?: number }>({ status: 'idle' });
    const [windowSizeClass, setWindowSizeClass] = useState<'compact' | 'medium' | 'expanded' | 'large' | 'extra-large'>('expanded');
    const [heroImageIndex, setHeroImageIndex] = useState(0);
    const [heroImageErrors, setHeroImageErrors] = useState<Record<string, boolean>>({});
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const [shareFeedback, setShareFeedback] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const visibleHeroImages = useMemo(() => {
        const ok = MEDICAL_HERO_IMAGES.filter((src) => !heroImageErrors[src]);
        return ok.length > 0 ? ok : [MEDICAL_HERO_FALLBACK];
    }, [heroImageErrors]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setHeroImageIndex((prev) => (prev + 1) % visibleHeroImages.length);
        }, 5000);
        return () => window.clearInterval(interval);
    }, [visibleHeroImages.length]);

    useEffect(() => {
        setHeroImageIndex((prev) => (prev >= visibleHeroImages.length ? 0 : prev));
    }, [visibleHeroImages.length]);

    useEffect(() => {
        const computeWindowClass = () => {
            const w = window.innerWidth;
            if (w < 600) return setWindowSizeClass('compact');
            if (w < 840) return setWindowSizeClass('medium');
            if (w < 1200) return setWindowSizeClass('expanded');
            if (w < 1600) return setWindowSizeClass('large');
            return setWindowSizeClass('extra-large');
        };
        computeWindowClass();
        window.addEventListener('resize', computeWindowClass);
        return () => window.removeEventListener('resize', computeWindowClass);
    }, []);

    const [formRecord, setFormRecord] = useState({
        ownerName: '',
        relationship: 'Self',
        bloodType: '',
        dob: '',
        allergies: '',
        medications: '',
        emergencyContact: '',
        sharedFolderUri: '',
        criticalNotes: '',
        profilePicture: '' as string
    });

    const handleOpenEdit = (rec: HealthRecord) => {
        setFormRecord({
            ownerName: rec.ownerName,
            relationship: rec.relationship || 'Family',
            bloodType: rec.bloodType,
            dob: (rec as any).dob || '',
            allergies: rec.allergies.join(', '),
            medications: rec.medications.join(', '),
            emergencyContact: rec.emergencyContact,
            sharedFolderUri: rec.sharedFolderUri || '',
            criticalNotes: rec.criticalNotes || '',
            profilePicture: (rec as any).profilePicture || ''
        });
        setEditingRecordId(rec.id);
        setIsCreating(true);
    };

    const handleCreateOrUpdate = () => {
        if (!formRecord.ownerName) return;
        
        if (editingRecordId) {
            setRecords(prev => prev.map(r => r.id === editingRecordId ? {
                ...r,
                ownerName: formRecord.ownerName,
                relationship: formRecord.relationship,
                bloodType: formRecord.bloodType,
                dob: formRecord.dob,
                allergies: formRecord.allergies.split(',').map(s => s.trim()).filter(Boolean),
                medications: formRecord.medications.split(',').map(s => s.trim()).filter(Boolean),
                emergencyContact: formRecord.emergencyContact,
                sharedFolderUri: formRecord.sharedFolderUri,
                criticalNotes: formRecord.criticalNotes,
                profilePicture: formRecord.profilePicture
            } as any : r));
        } else {
            const record: HealthRecord = {
                id: `MED-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
                ownerName: formRecord.ownerName,
                relationship: formRecord.relationship,
                bloodType: formRecord.bloodType,
                dob: formRecord.dob,
                allergies: formRecord.allergies.split(',').map(s => s.trim()).filter(Boolean),
                medications: formRecord.medications.split(',').map(s => s.trim()).filter(Boolean),
                emergencyContact: formRecord.emergencyContact,
                sharedFolderUri: formRecord.sharedFolderUri,
                criticalNotes: formRecord.criticalNotes,
                profilePicture: formRecord.profilePicture,
                isCloudSynced: false,
                timestamp: Date.now()
            } as any;
            setRecords(prev => [record, ...prev]);
        }
        
        setFormRecord({ ownerName: '', relationship: 'Family', bloodType: '', dob: '', allergies: '', medications: '', emergencyContact: '', sharedFolderUri: '', criticalNotes: '', profilePicture: '' });
        setIsCreating(false);
        setEditingRecordId(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Confirm deletion of this medical identity?")) {
            setRecords(prev => prev.filter(r => r.id !== id));
            if (editingRecordId === id) setEditingRecordId(null);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFormRecord(prev => ({ ...prev, profilePicture: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const loadDemoData = () => {
        const demo: HealthRecord = {
            id: 'MED-DEMO-001',
            ownerName: 'Alejandro Martinez',
            relationship: 'Self',
            bloodType: 'O+',
            dob: '1988-05-14',
            allergies: ['Penicillin'],
            medications: ['Lisinopril'],
            emergencyContact: '+1 555 0199',
            sharedFolderUri: 'https://drive.google.com/demo',
            profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alejandro',
            isCloudSynced: true,
            timestamp: Date.now()
        } as any;
        setRecords(prev => [demo, ...prev]);
    };

    const activeRecord = useMemo(() => records.find(r => r.id === editingRecordId), [records, editingRecordId]);

    const getQrValue = (_cat: FolderCategory | 'PROFILE') => {
        if (!activeRecord) return '';
        return activeRecord.sharedFolderUri || '';
    };

    const qrImageUrl = (val: string) => `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(val)}&bgcolor=ffffff&color=0f172a&margin=10`;

    const getRemoteConnectUrl = () => {
        if (!activeRecord) return '';
        const url = new URL('/medical', window.location.origin);
        url.searchParams.set('record', activeRecord.id);
        url.searchParams.set('folder', activeFolder);
        url.searchParams.set('medQr', getQrValue(activeFolder));
        return url.toString();
    };

    const setShareStatus = (message: string) => {
        setShareFeedback(message);
        window.setTimeout(() => setShareFeedback(''), 2200);
    };

    const handleNativeShare = async () => {
        if (!activeRecord) return;
        const shareUrl = getRemoteConnectUrl();
        const text = `Medical QR for ${activeRecord.ownerName}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'DPAL Medical QR', text, url: shareUrl });
                setShareStatus('Shared successfully');
            } else {
                await navigator.clipboard.writeText(shareUrl);
                setShareStatus('Link copied');
            }
        } catch {
            setShareStatus('Share cancelled');
        } finally {
            setIsShareMenuOpen(false);
        }
    };

    const handleCopyAppLink = async () => {
        try {
            await navigator.clipboard.writeText(getRemoteConnectUrl());
            setShareStatus('App link copied');
        } catch {
            setShareStatus('Could not copy link');
        } finally {
            setIsShareMenuOpen(false);
        }
    };

    const handleCopyQrPayload = async () => {
        try {
            await navigator.clipboard.writeText(getQrValue(activeFolder));
            setShareStatus('QR payload copied');
        } catch {
            setShareStatus('Could not copy payload');
        } finally {
            setIsShareMenuOpen(false);
        }
    };

    const handleDownloadQr = async () => {
        try {
            const src = qrImageUrl(getQrValue(activeFolder));
            const response = await fetch(src);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `medical-qr-${activeFolder.toLowerCase()}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setShareStatus('QR downloaded');
        } catch {
            setShareStatus('Could not download QR');
        } finally {
            setIsShareMenuOpen(false);
        }
    };

    useEffect(() => {
        if (!activeRecord) {
            setQrAnchorState({ status: 'idle' });
            return;
        }
        const qrPayload = getQrValue(activeFolder);
        let active = true;
        setQrAnchorState({ status: 'sealing' });
        void anchorQrPayloadOnChain({
            scope: `medical-${activeFolder.toLowerCase()}`,
            id: activeRecord.id,
            title: `Medical QR ${activeFolder}`,
            description: `Medical record QR for ${activeRecord.ownerName}: ${qrPayload}`,
            location: 'Medical Outpost',
            trustScore: 97,
        }).then((result) => {
            if (!active) return;
            if (result.ok && result.block) {
                setQrAnchorState({ status: 'anchored', blockIndex: result.block.index });
            } else {
                setQrAnchorState({ status: 'failed' });
            }
        });
        return () => {
            active = false;
        };
    }, [activeFolder, activeRecord]);

    return (
        <div className="min-h-[92vh] rounded-[3rem] shadow-2xl animate-fade-in font-mono overflow-hidden flex flex-col relative text-zinc-100 border border-slate-600/70 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-700">
            <style>{`
                .qr-fixed-square { aspect-ratio: 1/1; width: 100%; display: flex; align-items: center; justify-content: center; background: white; border-radius: 2rem; position: relative; overflow: hidden; }
                .qr-img-large { width: 100%; height: 100%; object-fit: contain; flex-shrink: 0; }
                .qr-profile-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 22%; height: 22%; border-radius: 20%; border: 4px solid white; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 10; overflow: hidden; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
                /* ── Print styles ────────────────────────────────── */
                @media screen { .print-only { display: none !important; } }
                @media print {
                  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  body, html { background: white !important; color: #111 !important; }
                  .no-print { display: none !important; }
                  .print-only { display: block !important; }
                  .print-only-flex { display: flex !important; }
                  /* Reset dark container for print */
                  .min-h-\\[92vh\\], .bg-gradient-to-b, .bg-slate-700\\/20, .bg-slate-700\\/60 {
                    background: white !important; border: none !important; border-radius: 0 !important; box-shadow: none !important;
                  }
                  /* Force all text dark */
                  [class*="text-"] { color: #111 !important; }
                  /* Remove dark card backgrounds */
                  [class*="bg-slate-"], [class*="bg-zinc-"], [class*="bg-cyan-"] { background: white !important; }
                  /* Keep borders subtle */
                  [class*="border-slate-"], [class*="border-zinc-"] { border-color: #ccc !important; }
                  /* SVG icon strokes */
                  svg { stroke: #111 !important; }
                  /* Page setup */
                  @page { margin: 18mm; size: A4; }
                }
            `}</style>

            <header className="bg-slate-700/95 border-b border-slate-500 px-12 py-8 flex justify-between items-center z-30 shadow-sm no-print backdrop-blur">
                <div className="flex items-center space-x-8">
                    <div className="p-4 bg-cyan-600 rounded-3xl shadow-2xl shadow-cyan-900/20">
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">DPAL Medical Records</h1>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-2">Validated Health Identity Layer</p>
                    </div>
                </div>

                <div className="flex items-center space-x-8">
                    <div className="flex bg-slate-800/70 p-1.5 rounded-2xl border border-slate-500">
                        <button onClick={() => setLanguage('EN')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${language === 'EN' ? 'bg-slate-600 text-cyan-200' : 'text-slate-300'}`}>EN</button>
                        <button onClick={() => setLanguage('ES')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${language === 'ES' ? 'bg-slate-600 text-cyan-200' : 'text-slate-300'}`}>ES</button>
                    </div>
                    <button onClick={onReturn} className="p-4 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white">
                        <ArrowLeft className="w-8 h-8" />
                    </button>
                </div>
            </header>

            <div className="relative w-full shrink-0 overflow-hidden border-b border-slate-500 bg-slate-100 no-print">
                <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 h-56 sm:h-60 md:h-64 lg:h-52 xl:h-56 max-h-[min(42vh,300px)] lg:max-h-[min(32vh,240px)]">
                    {visibleHeroImages.map((src, idx) => (
                        <img
                            key={src}
                            src={src}
                            alt=""
                            className="absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-1000"
                            loading="eager"
                            style={{ opacity: idx === heroImageIndex ? 1 : 0 }}
                            onError={() => setHeroImageErrors((prev) => ({ ...prev, [src]: true }))}
                            draggable={false}
                        />
                    ))}
                </div>
            </div>

            <main className={`flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-hidden ${windowSizeClass === 'compact' ? 'p-4 gap-4' : windowSizeClass === 'medium' ? 'p-6 gap-6' : 'p-8 lg:p-12 gap-12'} bg-slate-700/20`}>
                <aside className="lg:col-span-3 space-y-10 no-print">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Active Records</h2>
                        <button onClick={loadDemoData} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all" title="Load Demo Data">
                            <Sparkles className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-4">
                        {records.length === 0 ? (
                            <div className="bg-slate-800/60 border-2 border-dashed border-slate-600 rounded-[2.5rem] p-12 text-center space-y-4 shadow-inner">
                                <User className="w-16 h-16 text-slate-500 mx-auto" />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Zero Members</p>
                            </div>
                        ) : (
                            records.map(rec => (
                                <button 
                                    key={rec.id}
                                    onClick={() => { setEditingRecordId(rec.id); setActiveFolder('PROFILE'); setIsCreating(false); }}
                                    className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all flex items-center space-x-4 ${editingRecordId === rec.id ? 'bg-slate-800 border-cyan-500 shadow-xl scale-[1.02]' : 'bg-slate-900/70 border-slate-700 opacity-80 hover:opacity-100 hover:border-slate-500'}`}
                                >
                                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-800 flex-shrink-0">
                                        <img src={(rec as any).profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.ownerName}`} alt="P" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-white truncate uppercase tracking-tight">{rec.ownerName}</p>
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{rec.relationship}</p>
                                    </div>
                                </button>
                            ))
                        )}
                        <md-outlined-button
                            type="button"
                            onClick={() => { setEditingRecordId(null); setIsCreating(true); }}
                            className="w-full [&::part(container)]:min-h-[56px]"
                        >
                            New member
                        </md-outlined-button>
                    </div>
                </aside>

                <div className="lg:col-span-9 bg-slate-700/60 rounded-[4rem] border border-slate-500/80 overflow-y-auto custom-scrollbar p-8 lg:p-16 relative backdrop-blur-sm">
                    {isCreating ? (
                        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in no-print">
                            <header className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">{editingRecordId ? 'Update Record' : 'Create Record'}</h2>
                                    <p className="text-zinc-500 font-bold mt-4 tracking-widest uppercase text-[10px]">Enter patient information and optional cloud folder link</p>
                                </div>
                                <button onClick={() => setIsCreating(false)} className="p-4 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all"><X className="w-8 h-8 text-slate-300"/></button>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                                <div className="md:col-span-4 space-y-6">
                                     <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-full aspect-square rounded-[3.5rem] bg-slate-900 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 transition-all overflow-hidden group shadow-inner"
                                    >
                                        {formRecord.profilePicture ? (
                                            <img src={formRecord.profilePicture} alt="Profile" className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                                        ) : (
                                            <div className="text-center p-8 space-y-4">
                                                <Camera className="w-12 h-12 text-slate-500 mx-auto" />
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Clinical Portrait</p>
                                            </div>
                                        )}
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                    </div>
                                    <p className="text-[8px] text-center text-zinc-600 font-bold uppercase tracking-widest italic">Verification photo required</p>
                                </div>

                                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-4">Legal Name</label>
                                        <input value={formRecord.ownerName} onChange={e => setFormRecord({...formRecord, ownerName: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-600 rounded-2xl p-5 outline-none focus:border-cyan-500 transition-all shadow-inner font-bold text-white uppercase text-sm" placeholder="Full Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-4">Date of Birth</label>
                                        <input type="date" value={formRecord.dob} onChange={e => setFormRecord({...formRecord, dob: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-600 rounded-2xl p-5 outline-none focus:border-cyan-500 transition-all shadow-inner font-bold text-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-4">Blood Group</label>
                                        <input value={formRecord.bloodType} onChange={e => setFormRecord({...formRecord, bloodType: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-600 rounded-2xl p-5 outline-none focus:border-cyan-500 transition-all shadow-inner font-bold text-white uppercase text-sm" placeholder="O+, A-, etc." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-4">Emergency Contact</label>
                                        <input value={formRecord.emergencyContact} onChange={e => setFormRecord({...formRecord, emergencyContact: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-600 rounded-2xl p-5 outline-none focus:border-cyan-500 transition-all shadow-inner font-bold text-white text-sm" placeholder="Emergency phone number" />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest ml-4 flex items-center space-x-3">
                                            <Cloud className="w-4 h-4 text-cyan-500"/>
                                            <span>Cloud Vault (Record Link)</span>
                                        </label>
                                        <input value={formRecord.sharedFolderUri} onChange={e => setFormRecord({...formRecord, sharedFolderUri: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-600 rounded-2xl p-5 outline-none focus:border-cyan-500 transition-all shadow-inner font-mono text-xs text-cyan-300" placeholder="https://drive.google.com/..." />
                                    </div>
                                </div>
                            </div>

                            <md-filled-button
                                type="button"
                                onClick={handleCreateOrUpdate}
                                className="w-full [&::part(container)]:min-h-[56px]"
                            >
                                {editingRecordId ? 'Update medical record' : 'Save medical record'}
                            </md-filled-button>
                        </div>
                    ) : activeRecord ? (
                        <div className="animate-fade-in space-y-16 pb-16">
                            <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-700 pb-12">
                                <div className="flex items-center space-x-10">
                                    <div className="relative">
                                        <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-4 border-slate-700 shadow-3xl relative z-10 bg-slate-800">
                                            <img src={(activeRecord as any).profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRecord.ownerName}`} alt="Profile" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="absolute -bottom-3 -right-3 bg-cyan-600 p-4 rounded-2xl shadow-xl z-20 border-4 border-slate-900">
                                            <ShieldCheck className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">{activeRecord.ownerName}</h2>
                                        <div className="flex flex-wrap items-center gap-8 mt-6">
                                            <span className="bg-cyan-950/40 text-cyan-400 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-900/50">{activeRecord.relationship}</span>
                                            <div className="flex items-center space-x-3">
                                                <Heart className="w-5 h-5 text-rose-500" />
                                                <span className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">BLOOD: {activeRecord.bloodType || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Monitor className="w-5 h-5 text-cyan-500" />
                                                <span className="text-zinc-500 font-black text-[10px] uppercase tracking-widest">DOB: {(activeRecord as any).dob || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 relative">
                                    <button onClick={() => window.print()} className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition-all border border-slate-700"><Printer className="w-6 h-6"/></button>
                                    <button onClick={() => handleOpenEdit(activeRecord)} className="p-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition-all border border-slate-700"><Pencil className="w-6 h-6"/></button>
                                    <button onClick={() => handleDelete(activeRecord.id)} className="p-4 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 rounded-2xl transition-all border border-slate-700"><Trash2 className="w-6 h-6"/></button>
                                    <button onClick={() => setIsShareMenuOpen((v) => !v)} className="p-4 bg-cyan-900/60 hover:bg-cyan-700/70 text-cyan-200 hover:text-white rounded-2xl transition-all border border-cyan-700">
                                        <Send className="w-6 h-6"/>
                                    </button>
                                    {isShareMenuOpen && (
                                        <div className="absolute top-20 right-0 z-40 w-64 rounded-2xl border border-slate-600 bg-slate-900/95 shadow-2xl p-2 backdrop-blur">
                                            <button type="button" onClick={handleNativeShare} className="w-full px-4 py-3 rounded-xl hover:bg-slate-800 text-left text-sm text-slate-100 flex items-center gap-3">
                                                <Send className="w-4 h-4 text-cyan-300" />
                                                <span>Share now</span>
                                            </button>
                                            <button type="button" onClick={handleCopyAppLink} className="w-full px-4 py-3 rounded-xl hover:bg-slate-800 text-left text-sm text-slate-100 flex items-center gap-3">
                                                <Link className="w-4 h-4 text-cyan-300" />
                                                <span>Copy app link</span>
                                            </button>
                                            <button type="button" onClick={handleCopyQrPayload} className="w-full px-4 py-3 rounded-xl hover:bg-slate-800 text-left text-sm text-slate-100 flex items-center gap-3">
                                                <QrCode className="w-4 h-4 text-cyan-300" />
                                                <span>Copy QR payload</span>
                                            </button>
                                            <button type="button" onClick={handleDownloadQr} className="w-full px-4 py-3 rounded-xl hover:bg-slate-800 text-left text-sm text-slate-100 flex items-center gap-3">
                                                <Printer className="w-4 h-4 text-cyan-300" />
                                                <span>Download QR image</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {shareFeedback ? (
                                <p className="no-print -mt-8 text-xs font-bold uppercase tracking-widest text-cyan-300">{shareFeedback}</p>
                            ) : null}

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                                <div className="lg:col-span-7 space-y-16">
                                    <section className="space-y-8">
                                        <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.4em] flex items-center space-x-4">
                                            <Database className="w-6 h-6 text-cyan-600"/>
                                            <span>Medical Category Vaults</span>
                                        </h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            {MEDICAL_FOLDERS.map(folder => (
                                                <button 
                                                    key={folder.id} 
                                                    onClick={() => setActiveFolder(folder.id)}
                                                    className={`p-8 rounded-[2.5rem] border-2 text-left transition-all flex flex-col items-start space-y-6 relative group ${activeFolder === folder.id ? 'bg-cyan-600 text-white border-cyan-500 shadow-2xl scale-[1.03]' : 'bg-slate-800 border-slate-700 hover:border-slate-500 shadow-sm'}`}
                                                >
                                                    <div className={`p-4 rounded-2xl transition-colors ${activeFolder === folder.id ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-300 border border-slate-700'}`}>{folder.icon}</div>
                                                    <span className={`text-xs font-black uppercase tracking-widest block ${activeFolder === folder.id ? 'text-white' : 'text-zinc-400'}`}>{folder.label}</span>
                                                    {activeFolder === folder.id && <div className="absolute top-6 right-6 w-2 h-2 bg-white rounded-full animate-ping"></div>}
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-10">
                                        <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.4em] flex items-center space-x-4">
                                            <Cloud className="w-6 h-6 text-cyan-600"/>
                                            <span>Medical Sync</span>
                                        </h3>
                                        <div className="bg-slate-800 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-700">
                                            <div className="absolute top-0 right-0 p-10 opacity-5"><Cloud className="w-80 h-80"/></div>
                                            <div className="relative z-10">
                                                <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-6">P2P Vault Pointer</p>
                                                <p className="text-sm font-mono text-slate-200 break-all mb-10 bg-slate-900/70 p-8 rounded-2xl border border-slate-700 leading-relaxed">{activeRecord.sharedFolderUri || 'NODE_OFFLINE'}</p>
                                                <div className="flex flex-wrap gap-6">
                                                    <md-filled-button
                                                        type="button"
                                                        onClick={() => {
                                                            if (activeRecord.sharedFolderUri) window.open(activeRecord.sharedFolderUri, '_blank', 'noopener,noreferrer');
                                                        }}
                                                        className="[&::part(container)]:min-h-[44px]"
                                                    >
                                                        Launch cloud ledger
                                                    </md-filled-button>
                                                    <md-outlined-button type="button" className="[&::part(container)]:min-h-[44px]">
                                                        Sync assets
                                                    </md-outlined-button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="lg:col-span-5 space-y-12 no-print">
                                    <div className="bg-slate-800 border-4 border-slate-700 p-10 rounded-[4rem] text-center space-y-10 shadow-3xl">
                                        <div className="space-y-6">
                                            <div className="w-20 h-20 bg-cyan-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-cyan-900/20">
                                                <QrCode className="w-10 h-10 text-white" />
                                            </div>
                                            <h4 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">
                                                {activeFolder === 'PROFILE' ? 'Primary Record QR' : MEDICAL_FOLDERS.find(f => f.id === activeFolder)?.label}
                                            </h4>
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Identity Signature</p>
                                        </div>
                                        
                                        <div className="qr-fixed-square border-[15px] border-white shadow-2xl hover:scale-[1.02] transition-transform duration-1000 group cursor-pointer relative">
                                            <img src={qrImageUrl(getQrValue(activeFolder))} alt="Main QR" className="qr-img-large" />
                                            
                                        <div className="qr-profile-overlay flex items-center justify-center border-[4px] border-white shadow-2xl scale-110 bg-slate-900">
                                            <Heart className="w-3/5 h-3/5 text-white" />
                                        </div>
                                        </div>

                                        <div className="p-8 bg-slate-900/60 rounded-[2.5rem] border-2 border-slate-600 border-dashed">
                                          <p className="text-[9px] text-slate-300 font-black leading-relaxed uppercase tracking-widest italic">
                                              Present this QR at authorized clinics to quickly open the linked medical record.
                                          </p>
                                          <p className="mt-3 text-[9px] font-mono text-cyan-300">
                                              CHAIN_STATUS: {qrAnchorState.status === 'anchored'
                                                ? `ANCHORED (#${qrAnchorState.blockIndex ?? 'n/a'})`
                                                : qrAnchorState.status === 'sealing'
                                                ? 'SEALING'
                                                : qrAnchorState.status === 'failed'
                                                ? 'FAILED'
                                                : 'IDLE'}
                                          </p>
                                        </div>

                                        <md-filled-button type="button" onClick={() => window.print()} className="w-full [&::part(container)]:min-h-[48px]">
                                            Export record QR
                                        </md-filled-button>
                                    </div>

                                    <div className="bg-slate-800 rounded-[3rem] p-10 text-center relative overflow-hidden shadow-inner border border-slate-700">
                                        <div className="absolute top-6 left-6 flex items-center space-x-3 opacity-40">
                                            <ShieldCheck className="w-5 h-5 text-emerald-500"/>
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">RSA-4096</span>
                                        </div>
                                        <div className="mt-8 space-y-4">
                                            <p className="text-[8px] text-slate-300 font-bold leading-relaxed italic px-4 uppercase">
                                                "Transparency is the foundation of modern care. Shared data saves lives."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-20 space-y-16">
                            <div className="relative">
                                <div className="absolute -inset-20 bg-cyan-500/5 blur-[100px] animate-pulse"></div>
                                <div className="relative p-24 bg-slate-800/70 border-4 border-slate-700 rounded-[8rem] shadow-inner">
                                    <Heart className="w-48 h-48 text-slate-300" />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-5xl font-black uppercase text-white tracking-tighter leading-none">Medical Records Center</h3>
                                <p className="text-xs text-slate-300 font-black uppercase tracking-[0.5em] max-w-2xl mx-auto leading-relaxed">
                                    Create and manage patient medical records for secure sharing and emergency access.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-8">
                                <md-filled-button type="button" onClick={() => setIsCreating(true)} className="[&::part(container)]:min-h-[52px]">Create record</md-filled-button>
                                <md-outlined-button type="button" onClick={loadDemoData} className="[&::part(container)]:min-h-[52px]">Load sample record</md-outlined-button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── PRINT-ONLY medical card ─────────────────────────────────── */}
            {activeRecord && (
                <div className="print-only" style={{ fontFamily: 'sans-serif', color: '#111', background: 'white', padding: '0' }}>
                    {/* Header bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0e7490', paddingBottom: '12px', marginBottom: '20px' }}>
                        <div>
                            <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#0e7490', margin: 0 }}>DPAL Medical Record</p>
                            <h1 style={{ fontSize: '26px', fontWeight: 900, textTransform: 'uppercase', margin: '4px 0 0' }}>{activeRecord.ownerName}</h1>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '9px', color: '#555', margin: 0, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Validated Health Identity</p>
                            <p style={{ fontSize: '9px', color: '#555', margin: '4px 0 0', fontFamily: 'monospace' }}>ID: {activeRecord.id}</p>
                        </div>
                    </div>

                    {/* Two-column layout: info left, QR right */}
                    <div style={{ display: 'flex', gap: '32px' }}>
                        {/* Left — patient info */}
                        <div style={{ flex: 1 }}>
                            {/* Critical row */}
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                {[
                                    { label: 'Blood Type', value: activeRecord.bloodType || 'N/A' },
                                    { label: 'Date of Birth', value: (activeRecord as any).dob || 'N/A' },
                                    { label: 'Relationship', value: activeRecord.relationship },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ flex: 1, border: '1px solid #ccc', borderRadius: '8px', padding: '8px 12px' }}>
                                        <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#666', margin: 0 }}>{label}</p>
                                        <p style={{ fontSize: '14px', fontWeight: 900, margin: '4px 0 0', textTransform: 'uppercase' }}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Emergency contact */}
                            <div style={{ border: '2px solid #dc2626', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', background: '#fef2f2' }}>
                                <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#dc2626', margin: 0 }}>⚠ Emergency Contact</p>
                                <p style={{ fontSize: '16px', fontWeight: 900, margin: '4px 0 0' }}>{activeRecord.emergencyContact || 'Not provided'}</p>
                            </div>

                            {/* Allergies */}
                            {activeRecord.allergies.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#555', margin: '0 0 6px' }}>Allergies</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {activeRecord.allergies.map((a: string) => (
                                            <span key={a} style={{ border: '1px solid #dc2626', color: '#dc2626', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', fontWeight: 700 }}>{a}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Medications */}
                            {activeRecord.medications.length > 0 && (
                                <div style={{ marginBottom: '14px' }}>
                                    <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#555', margin: '0 0 6px' }}>Current Medications</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {activeRecord.medications.map((m: string) => (
                                            <span key={m} style={{ border: '1px solid #0e7490', color: '#0e7490', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', fontWeight: 700 }}>{m}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Critical notes */}
                            {(activeRecord as any).criticalNotes && (
                                <div style={{ marginBottom: '14px' }}>
                                    <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#555', margin: '0 0 6px' }}>Critical Notes</p>
                                    <p style={{ fontSize: '11px', border: '1px solid #ccc', borderRadius: '8px', padding: '8px 12px', margin: 0 }}>{(activeRecord as any).criticalNotes}</p>
                                </div>
                            )}

                            {/* Category vaults list */}
                            <div>
                                <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#555', margin: '0 0 8px' }}>Medical Category Vaults</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    {MEDICAL_FOLDERS.map(f => (
                                        <div key={f.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '7px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#333' }}>
                                            {f.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right — QR code */}
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '160px', height: '160px', border: '8px solid #111', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
                                <img
                                    src={qrImageUrl(getQrValue('PROFILE'))}
                                    alt="Medical QR"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                />
                            </div>
                            <p style={{ fontSize: '8px', textAlign: 'center', color: '#555', margin: 0, textTransform: 'uppercase', letterSpacing: '0.15em', lineHeight: '1.4' }}>
                                Scan at authorized clinics to access linked medical record
                            </p>
                            {activeRecord.sharedFolderUri && (
                                <p style={{ fontSize: '7px', fontFamily: 'monospace', color: '#0e7490', wordBreak: 'break-all', textAlign: 'center', margin: 0 }}>
                                    {activeRecord.sharedFolderUri}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#888' }}>
                        <span>DPAL Validated Health Identity Layer — dpal-front-end.vercel.app/medical</span>
                        <span style={{ fontFamily: 'monospace' }}>Printed: {new Date().toISOString().split('T')[0]}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicalOutpostView;
