
import React, { useEffect, useMemo, useState } from 'react';
import { Category, Report, EducationRole } from '../types';
import { CATEGORIES_WITH_ICONS, EDUCATION_ROLES } from '../constants';
import SubmissionPanel from './SubmissionPanel';
import { ArrowLeft, ChevronLeft, ChevronRight, Database, ShieldCheck, X } from './icons';
import { useTranslations } from '../i18n';

interface ReportSubmissionViewProps {
    category: Category;
    role: EducationRole | null;
    onReturn: () => void;
    addReport: (report: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'>) => void;
    totalReports: number;
    prefilledDescription?: string;
}

const ReportSubmissionView: React.FC<ReportSubmissionViewProps> = ({ category, role, onReturn, addReport, totalReports, prefilledDescription }) => {
    const { t } = useTranslations();
    const categoryInfo = CATEGORIES_WITH_ICONS.find(c => c.value === category)!;
    const roleInfo = role ? EDUCATION_ROLES.find(r => r.value === role) : null;
    const categoryHeroByType: Partial<Record<Category, string>> = {
        [Category.AccidentsRoadHazards]: '/category-cards/accidents-and-road-hazards.png',
        [Category.Allergies]: '/category-cards/allergies.png',
        [Category.CivicDuty]: '/category-cards/civic-duty.png',
        [Category.Clergy]: '/category-cards/clergy.png',
        [Category.ConsumerScams]: '/category-cards/consumer-scams.png',
        [Category.MedicalNegligence]: '/category-cards/medical-negligence.png',
        [Category.StolenPropertyRegistry]: '/category-cards/stolen-property-registry.png',
        [Category.PoliceMisconduct]: '/category-cards/police-misconduct.png',
        [Category.HousingIssues]: '/category-cards/housing-issues.png',
        [Category.P2PEscrowVerification]: '/category-cards/marketplace-transactions-escrow.png',
        [Category.Education]: '/category-cards/education.png',
        [Category.ElderlyCare]: '/category-cards/elder-abuse.png',
        [Category.Events]: '/category-cards/event-transparency.png',
        [Category.FireEnvironmentalHazards]: '/category-cards/fire-environmental-hazards.png',
        [Category.PublicSafetyAlerts]: '/category-cards/public-safety-alerts.png',
        [Category.Environment]: '/category-cards/environment.png',
        [Category.WorkplaceIssues]: '/category-cards/workplace-issues.png',
        [Category.Infrastructure]: '/category-cards/infrastructure.png',
        [Category.InsuranceFraud]: '/category-cards/insurance fraud.png',
        [Category.ProfessionalServices]: '/category-cards/profesional-services.png',
        [Category.NonProfit]: '/category-cards/Non-Profit.png',
        [Category.ProofOfLifeBiometric]: '/category-cards/proof of life  biometric verification.png',
        [Category.PublicTransport]: '/category-cards/public transport.png',
        [Category.Travel]: '/category-cards/travel.png',
        [Category.IndependentDiscoveries]: '/category-cards/Independent Discoveries.png',
        [Category.Other]: '/category-cards/Independent Discoveries.png',
    };
    const imageUrl = encodeURI(categoryHeroByType[category] || `https://picsum.photos/seed/${categoryInfo.imageSeed}/1200/400`);

    const isAccidents = category === Category.AccidentsRoadHazards;
    const guideSlides = useMemo(() => ([
        { src: '/reports/guides/accidents-road-hazards/step-1.png', alt: 'Reporting guide step 1' },
        { src: '/reports/guides/accidents-road-hazards/step-2.png', alt: 'Reporting guide step 2' },
        { src: '/reports/guides/accidents-road-hazards/step-3.png', alt: 'Reporting guide step 3' },
    ]), []);
    const guideStorageKey = 'dpal-accidents-road-hazards-guide-dismissed-v1';
    const [guideOpen, setGuideOpen] = useState(false);
    const [guideIndex, setGuideIndex] = useState(0);

    useEffect(() => {
        if (!isAccidents) {
            setGuideOpen(false);
            return;
        }
        try {
            const dismissed = localStorage.getItem(guideStorageKey) === '1';
            setGuideOpen(!dismissed);
            setGuideIndex(0);
        } catch {
            setGuideOpen(true);
            setGuideIndex(0);
        }
    }, [isAccidents]);

    const closeGuide = (persist: boolean) => {
        if (persist) {
            try { localStorage.setItem(guideStorageKey, '1'); } catch { /* ignore */ }
        }
        setGuideOpen(false);
    };

    return (
        <div className="animate-fade-in font-mono text-white max-w-7xl mx-auto pb-32 px-4">
             <style>{`
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .dispatch-gradient { background: linear-gradient(180deg, rgba(13, 13, 26, 0) 0%, rgba(13, 13, 26, 0.8) 100%); }
                .scanline-overlay {
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
                    background-size: 100% 4px, 3px 100%;
                    pointer-events: none;
                }
            `}</style>

            {guideOpen && isAccidents && (
                <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl bg-zinc-950 border-2 border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">DPAL · Reporting guide</div>
                                <div className="text-sm font-black uppercase tracking-widest text-white mt-1">
                                    Accidents & Road Hazards
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => closeGuide(false)}
                                className="p-2 rounded-2xl border border-zinc-800 hover:bg-zinc-900"
                                aria-label="Close guide"
                            >
                                <X className="w-5 h-5 text-zinc-200" />
                            </button>
                        </div>

                        <div className="bg-black">
                            <img
                                src={guideSlides[guideIndex]?.src}
                                alt={guideSlides[guideIndex]?.alt}
                                className="w-full h-auto select-none"
                                draggable={false}
                            />
                        </div>

                        <div className="px-5 py-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Step {guideIndex + 1} of {guideSlides.length}
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setGuideIndex((i) => Math.max(0, i - 1))}
                                    disabled={guideIndex === 0}
                                    className="px-4 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </button>

                                {guideIndex < guideSlides.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setGuideIndex((i) => Math.min(guideSlides.length - 1, i + 1))}
                                        className="px-4 py-2 rounded-2xl border border-cyan-500/50 bg-cyan-600 text-white hover:bg-cyan-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => closeGuide(true)}
                                        className="px-4 py-2 rounded-2xl border border-emerald-500/40 bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Start report
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Header */}
            {isAccidents ? (
                <div className="relative h-[15rem] md:h-[20rem] rounded-[4rem] overflow-hidden mb-12 border-2 border-zinc-800 shadow-4xl">
                    {/* BACKGROUND IMAGE */}
                    <img src={imageUrl} alt="" draggable={false} className="absolute inset-0 w-full h-full object-contain" />

                    {/* DARK OVERLAY */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />

                    {/* CONTENT (inside hero) */}
                    <div className="absolute inset-0 z-10 p-6 md:p-8 flex items-start">
                        <button
                            onClick={onReturn}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-white bg-black/50 px-5 py-2 rounded-2xl border border-white/10 backdrop-blur"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative h-[15rem] md:h-[20rem] rounded-[4rem] overflow-hidden mb-12 border-2 border-zinc-800 shadow-4xl">
                    {/* BACKGROUND IMAGE */}
                    <img src={imageUrl} alt="" draggable={false} className="absolute inset-0 w-full h-full object-contain" />

                    {/* DARK OVERLAY */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20 pointer-events-none" />

                    {/* CONTENT (inside hero) */}
                    <div className="absolute inset-0 z-10 flex items-center px-6 md:px-10">
                        <div className="flex items-center space-x-6">
                            {/* ICON */}
                            <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-2xl p-5 backdrop-blur-xl flex-shrink-0">
                                <span className="text-4xl md:text-5xl leading-none">{categoryInfo.icon}</span>
                            </div>

                            {/* TEXT */}
                            <div>
                                <p className="text-cyan-400 text-xs tracking-widest mb-1">FILE A REPORT</p>
                                <h2 className="text-white text-2xl md:text-4xl font-black leading-tight uppercase">
                                    {categoryInfo.headline}
                                </h2>
                            </div>
                        </div>
                    </div>

                    {/* BACK BUTTON */}
                    <div className="absolute top-6 left-6 z-20">
                        <button
                            onClick={onReturn}
                            className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 bg-black/60 w-fit px-6 py-2 rounded-full border border-cyan-500/20 backdrop-blur-md"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Redesigned Submission Flow */}
            <div className="mt-8 md:mt-10">
                <SubmissionPanel
                    addReport={addReport}
                    preselectedCategory={category}
                    prefilledDescription={prefilledDescription}
                />
            </div>

            {/* Bottom Metadata Shards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <div className="bg-zinc-900/60 border-2 border-zinc-800 p-8 rounded-[3rem] shadow-xl backdrop-blur-sm flex items-center justify-between group">
                    <div className="flex items-center space-x-8">
                        <div className="w-20 h-20 bg-zinc-950 rounded-[2rem] flex items-center justify-center text-5xl border-2 border-zinc-800 flex-shrink-0 shadow-inner group-hover:border-cyan-500/30 transition-colors">
                            {roleInfo?.icon || '🛡️'}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Authorized_Role</p>
                            <p className="text-2xl font-black text-white uppercase tracking-tight">{roleInfo ? t(roleInfo.translationKey) : 'Standard_Citizen'}</p>
                        </div>
                    </div>
                    <ShieldCheck className="w-12 h-12 text-emerald-500/20 group-hover:text-emerald-500/50 transition-colors" />
                </div>

                <div className="bg-zinc-950 border-2 border-zinc-900 p-8 rounded-[3rem] shadow-inner flex items-center justify-between group">
                    <div className="flex items-end space-x-10">
                        <div className="min-w-0">
                            <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.4em] mb-3">Ledger_Volume</h3>
                            <div className="flex items-end space-x-4">
                                <span className="text-6xl font-black text-white tracking-tighter leading-none">{totalReports.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-zinc-800 uppercase tracking-widest mb-1 group-hover:text-cyan-900 transition-colors">Total_Shards</span>
                            </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-3 text-emerald-500 text-[10px] font-black">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_emerald]"></div>
                                <span className="tracking-[0.2em]">P2P_SYNC_READY</span>
                            </div>
                            <p className="text-[9px] text-zinc-800 font-bold uppercase italic whitespace-nowrap">
                                "Awaiting cryptographic handshake..."
                            </p>
                        </div>
                    </div>
                    <Database className="w-12 h-12 text-zinc-900 group-hover:text-cyan-900 transition-colors" />
                </div>
            </div>
        </div>
    );
};

export default ReportSubmissionView;
