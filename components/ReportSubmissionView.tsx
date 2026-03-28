
import React from 'react';
import { Category, Report, EducationRole } from '../types';
import { CATEGORIES_WITH_ICONS, EDUCATION_ROLES } from '../constants';
import SubmissionPanel from './SubmissionPanel';
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
