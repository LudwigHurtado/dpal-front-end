
import React, { useMemo } from 'react';
import { Category, Report, EducationRole } from '../types';
import { CATEGORIES_WITH_ICONS, EDUCATION_ROLES } from '../constants';
import SubmissionPanel from './SubmissionPanel';
import CaseboardReport from './reporting/CaseboardReport';
import { getCaseboardConfig, shouldUseCaseboard } from './reporting/caseboardRegistry';
import { getCategoryDefinition } from './sectors/categoryGatewayRegistry';
import { ArrowLeft, Database, ShieldCheck } from './icons';
import { useTranslations } from '../i18n';
import { pickCivicQuote } from '../utils/civicQuotes';
import { getCategoryReportImage } from '../utils/reportImages';

interface ReportSubmissionViewProps {
    category: Category;
    role: EducationRole | null;
    onReturn: () => void;
    addReport: (report: Omit<Report, 'id' | 'timestamp' | 'hash' | 'blockchainRef' | 'status'>) => void;
    totalReports: number;
    prefilledDescription?: string;
    /** Opens missions hub (e.g. Good Deeds / live intelligence) from “Join mission”. */
    onJoinMission?: () => void;
}

const fadeStyle = `
  .report-submission-fade { animation: reportSubmissionFadeIn 0.4s ease-out forwards; }
  @keyframes reportSubmissionFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;

const ReportSubmissionView: React.FC<ReportSubmissionViewProps> = ({ category, role, onReturn, addReport, totalReports, prefilledDescription, onJoinMission }) => {
    const { t } = useTranslations();
    const categoryInfo = CATEGORIES_WITH_ICONS.find(c => c.value === category)!;
    const roleInfo = role ? EDUCATION_ROLES.find(r => r.value === role) : null;
    const civicInspiration = useMemo(() => pickCivicQuote(`${category}-${role ?? 'community'}`), [category, role]);
    const imageUrl = getCategoryReportImage(category);

    const useCaseboard = shouldUseCaseboard(category);
    const caseboardCfg = useMemo(() => (useCaseboard ? getCaseboardConfig(category) : null), [category, useCaseboard]);
    const gatewayDef = useMemo(() => getCategoryDefinition(category, categoryInfo.headline), [category, categoryInfo.headline]);
    const accent = gatewayDef.accentColor;

    const heroEyebrow = caseboardCfg
        ? `${categoryInfo.headline} · ${caseboardCfg.missionSubtitle}`
        : 'Submit a report';

    const heroDescription = useMemo(() => {
        if (category === Category.Education) {
            return 'Assemble the case: pick how you want to enter, choose a report path and your role, then fill the caseboard — structured, serious, and built for accountability.';
        }
        if (caseboardCfg) {
            return 'Choose a path, your relationship to the situation, then complete the guided caseboard — clear steps for the public record.';
        }
        return 'Complete the guided steps below. Your report becomes part of the public accountability record.';
    }, [category, caseboardCfg]);

    const sessionStats = (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12" aria-label="Session statistics">
            <div
                role="status"
                className="dpal-card p-6 flex items-center justify-between"
            >
                <div className="flex items-center gap-5 min-w-0">
                    <div
                        className="w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl shrink-0 bg-[var(--dpal-surface-alt)]"
                        style={{ borderColor: `${accent}55` }}
                        aria-hidden
                    >
                        {roleInfo?.icon || '🛡️'}
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-[var(--dpal-text-muted)] uppercase tracking-wider">Hero role (from your profile)</p>
                        <p className="text-lg font-bold text-[var(--dpal-text-primary)]">{roleInfo ? t(roleInfo.translationKey) : civicInspiration}</p>
                        <p className="text-xs text-[var(--dpal-text-muted)] mt-1 italic leading-relaxed">{roleInfo ? civicInspiration : 'Your contribution strengthens the public record.'}</p>
                    </div>
                </div>
                <ShieldCheck className="w-10 h-10 text-emerald-400/80 shrink-0 pointer-events-none" aria-hidden />
            </div>
            <div
                role="status"
                className="dpal-card p-6 flex items-center justify-between"
            >
                <div>
                    <p className="text-[10px] font-semibold text-[var(--dpal-text-muted)] uppercase tracking-wider mb-1">Reports in this session</p>
                    <p className="text-4xl font-bold text-[var(--dpal-text-primary)] tabular-nums">{totalReports.toLocaleString()}</p>
                    <p className="text-xs text-[var(--dpal-text-muted)] mt-1">Informational only — not a button.</p>
                </div>
                <Database className="w-10 h-10 text-[var(--dpal-text-muted)] shrink-0 pointer-events-none" aria-hidden />
            </div>
        </section>
    );

    const reportHero = (
        <div
            className="dpal-card rounded-[2rem] mb-8 overflow-hidden"
            style={{ boxShadow: `0 1px 0 0 ${accent}22, var(--dpal-shadow-sm)` }}
        >
            <div className="p-6 md:p-8 pb-4">
                <button
                    type="button"
                    onClick={onReturn}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--dpal-text-secondary)] bg-[var(--dpal-surface-alt)] px-4 py-2 rounded-xl border border-[var(--dpal-border)] shadow-sm hover:bg-[var(--dpal-panel)]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            </div>
            <div className="w-full bg-[var(--dpal-background-secondary)] border-y border-[var(--dpal-border)]">
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
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>
                            {heroEyebrow}
                        </p>
                        <h2 className="text-2xl md:text-4xl font-bold text-[var(--dpal-text-primary)] tracking-tight mt-1">{categoryInfo.headline}</h2>
                        <p className="text-[var(--dpal-text-secondary)] text-sm mt-2 max-w-2xl leading-relaxed">{heroDescription}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    if (useCaseboard && caseboardCfg) {
        return (
            <div className="report-submission-fade font-sans text-[var(--dpal-text-primary)] max-w-7xl mx-auto pb-32 px-4">
                <style>{fadeStyle}</style>
                {reportHero}
                <CaseboardReport
                    key={category}
                    category={category}
                    addReport={addReport}
                    prefilledDescription={prefilledDescription}
                />
                {sessionStats}
            </div>
        );
    }

    return (
        <div className="report-submission-fade font-sans text-[var(--dpal-text-primary)] max-w-7xl mx-auto pb-32 px-4">
            <style>{fadeStyle}</style>
            {reportHero}
            <div className="mt-2 md:mt-4">
                <SubmissionPanel
                    addReport={addReport}
                    preselectedCategory={category}
                    prefilledDescription={prefilledDescription}
                    onJoinMission={onJoinMission}
                />
            </div>
            {sessionStats}
        </div>
    );
};

export default ReportSubmissionView;
