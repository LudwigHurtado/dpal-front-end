import React, { useState, useEffect } from 'react';
import type { Report, ReportStatus, NftRarity } from '../types';
import { CATEGORIES_WITH_ICONS } from '../constants';
import { useTranslations } from '../i18n';
import { Broadcast, Camera, ChevronRight, Clock, Coins, ExternalLink, Loader, Pencil, QrCode, ShieldCheck } from './icons';

interface MyReportCardProps {
  report: Report;
  onJoinChat?: () => void;
  /** `civic` = warm light dashboard; default = legacy hub dark card */
  variant?: 'default' | 'civic';
}

const statusProgress: Record<ReportStatus, number> = {
  Submitted: 38,
  'In Review': 68,
  Resolved: 100,
};

const StatusBadge: React.FC<{ status: ReportStatus; variant: 'default' | 'civic' }> = ({ status, variant }) => {
  const { t } = useTranslations();
  const civicStyles = {
    Submitted: 'bg-sky-50 text-sky-800 ring-sky-200',
    'In Review': 'bg-orange-50 text-orange-900 ring-orange-200',
    Resolved: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  } as const;
  const darkStyles = {
    Submitted: { text: 'text-blue-400', border: 'border-blue-900/50', label: t('status.submitted') },
    'In Review': { text: 'text-amber-400', border: 'border-amber-900/50', label: t('status.inReview') },
    Resolved: { text: 'text-emerald-400', border: 'border-emerald-900/50', label: t('status.resolved') },
  } as const;

  if (variant === 'civic') {
    const labelMap: Record<ReportStatus, string> = {
      Submitted: 'Submitted',
      'In Review': 'In Review',
      Resolved: 'Resolved',
    };
    return (
      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${civicStyles[status]}`}>
        {labelMap[status]}
      </span>
    );
  }

  const style = darkStyles[status] || darkStyles.Submitted;
  return (
    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${style.border} ${style.text} bg-black/40`}>
      {style.label}
    </span>
  );
};

const RarityBadge: React.FC<{ rarity: NftRarity; civic?: boolean }> = ({ rarity, civic }) => {
  const civicStyles = {
    Common: 'border-zinc-200 text-slate-600 bg-slate-50',
    Rare: 'border-cyan-200 text-cyan-800 bg-cyan-50',
    Epic: 'border-purple-200 text-purple-800 bg-purple-50',
    Legendary: 'border-amber-200 text-amber-900 bg-amber-50',
  } as const;
  const darkStyles = {
    Common: 'border-zinc-700 text-zinc-500',
    Rare: 'border-cyan-800 text-cyan-400',
    Epic: 'border-purple-800 text-purple-400',
    Legendary: 'border-amber-700 text-amber-500',
  } as const;
  const styles = civic ? civicStyles : darkStyles;
  return (
    <span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase ${styles[rarity]}`}>{rarity}</span>
  );
};

const MyReportCard: React.FC<MyReportCardProps> = ({ report, onJoinChat, variant = 'default' }) => {
  const { t } = useTranslations();
  const isCivic = variant === 'civic';
  const categoryInfo = CATEGORIES_WITH_ICONS.find((c) => c.value === report.category);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    const imageUrls = Array.isArray((report as { imageUrls?: string[] }).imageUrls) ? report.imageUrls! : [];
    const attachments = Array.isArray((report as { attachments?: File[] }).attachments) ? report.attachments! : [];

    if (imageUrls.length > 0) {
      setPrimaryImageUrl(typeof imageUrls[0] === 'string' ? imageUrls[0] : null);
    } else if (attachments.length > 0) {
      const imageFile = attachments.find((f) => f && typeof f.type === 'string' && f.type.startsWith('image/'));
      if (imageFile) {
        objectUrl = URL.createObjectURL(imageFile as File);
        setPrimaryImageUrl(objectUrl);
      } else {
        setPrimaryImageUrl(null);
      }
    } else {
      setPrimaryImageUrl(null);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [report]);

  const safeTimestamp = report.timestamp instanceof Date ? report.timestamp : new Date((report as { timestamp?: string }).timestamp as string);
  const timeLabel = Number.isNaN(safeTimestamp.getTime()) ? '—' : safeTimestamp.toLocaleString();

  const hasReward = report.earnedNft || report.credsEarned || report.isGeneratingNft;
  const progress = statusProgress[report.status] ?? 40;
  const refShort = (report.txHash || report.blockchainRef || report.hash || '').slice(0, 14) || '—';

  const shell = isCivic
    ? 'rounded-3xl border border-slate-200/90 bg-white p-4 shadow-md shadow-slate-200/40 transition hover:border-sky-200 hover:shadow-lg md:p-5'
    : `bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 hover:border-cyan-500/40 transition-all ${report.isGeneratingNft ? 'animate-pulse' : ''}`;

  return (
    <div className={`${shell} ${report.isGeneratingNft && !isCivic ? 'animate-pulse' : ''}`}>
      <div className={`flex flex-col gap-4 md:flex-row md:gap-5 ${isCivic ? '' : ''}`}>
        <div
          className={
            isCivic
              ? 'flex h-36 w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-sky-50/50 md:h-auto md:w-36'
              : 'h-36 w-full flex-shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 md:w-36'
          }
        >
          {primaryImageUrl ? (
            <img src={primaryImageUrl} alt={report.title} className="h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center text-4xl ${isCivic ? 'opacity-80' : 'opacity-50'}`}>
              {categoryInfo?.icon || '📄'}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className={`flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide ${isCivic ? 'font-semibold text-slate-500' : 'font-black text-zinc-500'}`}>
              <span
                className={
                  isCivic
                    ? 'rounded-full bg-slate-100 px-2 py-0.5 text-slate-700'
                    : 'inline-flex items-center gap-1'
                }
              >
                {categoryInfo ? t(categoryInfo.translationKey) : report.category}
              </span>
              <span className={`inline-flex items-center gap-1 ${isCivic ? 'text-slate-400' : 'text-zinc-500'}`}>
                <Clock className="h-3 w-3" />
                {timeLabel}
              </span>
            </div>
            <StatusBadge status={report.status} variant={isCivic ? 'civic' : 'default'} />
          </div>

          <h4 className={`truncate text-lg font-bold tracking-tight ${isCivic ? 'text-slate-900' : 'font-black text-white'}`} title={report.title}>
            {report.title}
          </h4>
          <p className={`line-clamp-2 text-sm leading-snug ${isCivic ? 'text-slate-600' : 'text-zinc-500'}`}>{report.description || '—'}</p>

          {isCivic && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Report progress</span>
                <span className="text-sky-700">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Trust {report.trustScore}
                </span>
                <span className="inline-flex items-center gap-1">
                  <QrCode className="h-3.5 w-3.5 text-slate-400" />
                  Record ref · {refShort}…
                </span>
              </div>
            </div>
          )}

          {!isCivic && <p className="truncate text-xs text-zinc-500">TX: {report.txHash || report.blockchainRef || report.hash}</p>}

          <div className={`flex flex-wrap gap-2 pt-1 ${isCivic ? '' : ''}`}>
            {onJoinChat && (
              <button
                type="button"
                onClick={onJoinChat}
                className={
                  isCivic
                    ? 'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-105'
                    : 'inline-flex items-center gap-2 rounded-xl bg-emerald-600 py-2.5 px-4 text-[11px] font-black uppercase tracking-wider text-white hover:bg-emerald-500'
                }
              >
                <Broadcast className="h-4 w-4" />
                Open Report
              </button>
            )}
            {isCivic && (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Continue
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Add Evidence
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  View Timeline
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Share Record
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Refine
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {hasReward && (
        <div className={`mt-4 border-t ${isCivic ? 'border-slate-100 pt-4' : 'border-zinc-800 pt-4'}`}>
          {report.isGeneratingNft ? (
            <div
              className={
                isCivic
                  ? 'flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3'
                  : 'flex items-center gap-3 rounded-xl border border-cyan-800/30 bg-cyan-950/20 p-3'
              }
            >
              <Loader className={`h-5 w-5 animate-spin ${isCivic ? 'text-sky-600' : 'text-cyan-500'}`} />
              <p className={`text-xs font-semibold uppercase tracking-wider ${isCivic ? 'text-sky-800' : 'font-black text-cyan-400'}`}>
                {t('myReportCard.generatingArtwork')}
              </p>
            </div>
          ) : report.earnedNft ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isCivic ? 'text-slate-500' : 'text-zinc-500 font-black'}`}>
                Verified record:
              </span>
              <RarityBadge rarity={report.earnedNft.rarity} civic={isCivic} />
              {report.credsEarned ? (
                <span
                  className={
                    isCivic
                      ? 'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900'
                      : 'inline-flex items-center gap-1 rounded-full border border-amber-900/30 bg-black/60 px-3 py-1 text-xs font-black text-amber-500'
                  }
                >
                  <Coins className="h-3 w-3" />+{report.credsEarned} HC
                </span>
              ) : null}
              <span className={`inline-flex items-center gap-1 text-xs font-bold ${isCivic ? 'text-emerald-700' : 'font-black text-emerald-500'}`}>
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MyReportCard;
