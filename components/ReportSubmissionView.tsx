
import React from 'react';
import { Category, Report, EducationRole } from '../types';
import { CATEGORIES_WITH_ICONS, EDUCATION_ROLES } from '../constants';
import SubmissionPanel from './SubmissionPanel';
import EducationCaseboardReport from './reporting/EducationCaseboardReport';
import { ArrowLeft, Database, ShieldCheck } from './icons';
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
        [Category.WaterViolations]: '/category-cards/water-related.png',
        [Category.WorkplaceIssues]: '/category-cards/workplace-issues.png',
        [Category.Infrastructure]: '/category-cards/infrastructure.png',
        [Category.InsuranceFraud]: '/category-cards/insurance fraud.png',
        [Category.ProfessionalServices]: '/category-cards/profesional-services.png',
        [Category.NonProfit]: '/category-cards/Non-Profit.png',
        [Category.ProofOfLifeBiometric]: '/category-cards/proof of life  biometric verification.png',
        [Category.PublicTransport]: '/category-cards/public transport.png',
        [Category.Travel]: '/category-cards/travel.png',
        [Category.VeteransServices]: '/category-cards/veterans-services.png',
        [Category.IndependentDiscoveries]: '/category-cards/Independent Discoveries.png',
        [Category.Other]: '/category-cards/Independent Discoveries.png',
        [Category.DpalHelp]: '/category-cards/dpal-help.png',
    };
    const imageUrl = encodeURI(categoryHeroByType[category] || `https://picsum.photos/seed/${categoryInfo.imageSeed}/1200/400`);

    const isAccidents = category === Category.AccidentsRoadHazards;
    const isEducation = category === Category.Education;

    if (isEducation) {
        return (
            <div className="animate-fade-in font-sans text-stone-900 max-w-7xl mx-auto pb-32 px-4">
                <div className="rounded-[2rem] bg-gradient-to-br from-violet-100/95 via-stone-50 to-amber-50 border border-stone-200/90 shadow-md mb-8 overflow-hidden">
                    <div className="p-6 md:p-8 pb-4">
                        <button
                            type="button"
                            onClick={onReturn}
                            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-800 bg-white/90 px-4 py-2 rounded-xl border border-violet-200/80 shadow-sm hover:bg-white"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                    </div>
                    <div className="w-full bg-stone-200/40 border-y border-stone-200/80">
                        <div className="mx-auto flex min-h-[min(52vh,520px)] max-h-[min(70vh,640px)] w-full items-center justify-center px-4 py-6 md:px-8 md:py-10">
                            <img
                                src={imageUrl}
                                alt=""
                                className="max-h-[min(52vh,520px)] w-full max-w-4xl object-contain object-center"
                                draggable={false}
                            />
                        </div>
                    </div>
                    <div className="p-6 md:p-10 pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="text-5xl md:text-6xl shrink-0">{categoryInfo.icon}</div>
                            <div>
                                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">Education · Mission report</p>
                                <h2 className="text-2xl md:text-4xl font-bold text-stone-900 tracking-tight mt-1">{categoryInfo.headline}</h2>
                                <p className="text-stone-600 text-sm mt-2 max-w-2xl leading-relaxed">
                                    Assemble the case: pick how you want to enter, choose a report path and your role, then fill the caseboard — structured, serious, and built for accountability.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <EducationCaseboardReport addReport={addReport} prefilledDescription={prefilledDescription} />
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12" aria-label="Session statistics">
                    <div
                        role="status"
                        className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm flex items-center justify-between"
                    >
                        <div className="flex items-center gap-5 min-w-0">
                            <div className="w-16 h-16 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center text-3xl shrink-0" aria-hidden>
                                {roleInfo?.icon || '🛡️'}
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Hero role (from your profile)</p>
                                <p className="text-lg font-bold text-stone-900">{roleInfo ? t(roleInfo.translationKey) : 'Standard citizen'}</p>
                                <p className="text-xs text-stone-400 mt-1">Informational only — not a button.</p>
                            </div>
                        </div>
                        <ShieldCheck className="w-10 h-10 text-emerald-500/30 shrink-0 pointer-events-none" aria-hidden />
                    </div>
                    <div
                        role="status"
                        className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm flex items-center justify-between"
                    >
                        <div>
                            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">Ledger volume (live count)</p>
                            <p className="text-4xl font-bold text-stone-900 tabular-nums">{totalReports.toLocaleString()}</p>
                            <p className="text-xs text-stone-500 mt-1">Reports in this session index</p>
                            <p className="text-xs text-stone-400 mt-1">Informational only — not a button.</p>
                        </div>
                        <Database className="w-10 h-10 text-violet-300 shrink-0 pointer-events-none" aria-hidden />
                    </div>
                </section>
            </div>
        );
    }

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

            {/* Header */}
            {isAccidents ? (
                <div className="relative mb-12 overflow-hidden rounded-[4rem] border-2 border-zinc-800 bg-black shadow-4xl">
                    <div className="flex min-h-[280px] w-full items-center justify-center px-4 py-8 md:min-h-[min(48vh,480px)] md:px-8 md:py-12">
                        <img
                            src={imageUrl}
                            alt=""
                            draggable={false}
                            className="max-h-[min(64vh,620px)] w-full max-w-6xl object-contain object-center"
                        />
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
                    <div className="absolute inset-0 z-10 flex flex-col p-6 md:p-8">
                        <button
                            type="button"
                            onClick={onReturn}
                            className="pointer-events-auto flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-black/55 px-5 py-2 text-[10px] font-black uppercase tracking-[0.4em] text-white backdrop-blur"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative mb-12 overflow-hidden rounded-[4rem] border-2 border-zinc-800 bg-black shadow-4xl">
                    <div className="flex min-h-[280px] w-full items-center justify-center px-4 py-8 md:min-h-[min(48vh,480px)] md:px-8 md:py-12">
                        <img
                            src={imageUrl}
                            alt=""
                            draggable={false}
                            className="max-h-[min(64vh,620px)] w-full max-w-6xl object-contain object-center"
                        />
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/15" />

                    <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 md:p-8">
                        <button
                            type="button"
                            onClick={onReturn}
                            className="flex w-fit items-center space-x-3 rounded-full border border-cyan-500/25 bg-black/65 px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 backdrop-blur-md"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back</span>
                        </button>
                        <div className="flex max-w-xl items-center space-x-6">
                            <div className="flex-shrink-0 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-5 backdrop-blur-xl">
                                <span className="text-4xl md:text-5xl leading-none">{categoryInfo.icon}</span>
                            </div>
                            <div>
                                <p className="mb-1 text-xs tracking-widest text-cyan-400">FILE A REPORT</p>
                                <h2 className="text-2xl font-black uppercase leading-tight text-white md:text-4xl">{categoryInfo.headline}</h2>
                            </div>
                        </div>
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

            {/* Bottom: live stats only (not interactive) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12" aria-label="Session statistics">
                <div role="status" className="bg-zinc-900/60 border-2 border-zinc-800 p-8 rounded-[3rem] shadow-xl backdrop-blur-sm flex items-center justify-between">
                    <div className="flex items-center space-x-8 min-w-0">
                        <div className="w-20 h-20 bg-zinc-950 rounded-[2rem] flex items-center justify-center text-5xl border-2 border-zinc-800 flex-shrink-0 shadow-inner" aria-hidden>
                            {roleInfo?.icon || '🛡️'}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Authorized_Role</p>
                            <p className="text-2xl font-black text-white uppercase tracking-tight">{roleInfo ? t(roleInfo.translationKey) : 'Standard_Citizen'}</p>
                            <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-wide">Informational · not a control</p>
                        </div>
                    </div>
                    <ShieldCheck className="w-12 h-12 text-emerald-500/20 shrink-0 pointer-events-none" aria-hidden />
                </div>

                <div role="status" className="bg-zinc-950 border-2 border-zinc-900 p-8 rounded-[3rem] shadow-inner flex items-center justify-between">
                    <div className="flex items-end space-x-10 min-w-0">
                        <div className="min-w-0">
                            <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.4em] mb-3">Ledger_Volume</h3>
                            <div className="flex items-end space-x-4">
                                <span className="text-6xl font-black text-white tracking-tighter leading-none">{totalReports.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Total_Shards</span>
                            </div>
                            <p className="text-[9px] text-zinc-500 mt-2 uppercase tracking-wide">Live count · not a button</p>
                        </div>
                        <div className="flex flex-col space-y-2 hidden sm:flex">
                            <div className="flex items-center space-x-3 text-emerald-500 text-[10px] font-black">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_emerald]" />
                                <span className="tracking-[0.2em]">P2P_SYNC_READY</span>
                            </div>
                        </div>
                    </div>
                    <Database className="w-12 h-12 text-zinc-900 shrink-0 pointer-events-none" aria-hidden />
                </div>
            </section>
        </div>
    );
};

export default ReportSubmissionView;
