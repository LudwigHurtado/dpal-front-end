import React, { useState, useEffect } from 'react';
import type { Report, ReportStatus, NftRarity } from '../types';
import { CATEGORIES_WITH_ICONS } from '../constants';
import { useTranslations } from '../i18n';
import { Clock, Coins, Loader, ShieldCheck, Broadcast } from './icons';

interface MyReportCardProps {
  report: Report;
  onJoinChat?: () => void;
}

const StatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => {
  const { t } = useTranslations();
  const statusStyles = {
    Submitted: { text: 'text-blue-400', border: 'border-blue-900/50', label: t('status.submitted') },
    'In Review': { text: 'text-amber-400', border: 'border-amber-900/50', label: t('status.inReview') },
    Resolved: { text: 'text-emerald-400', border: 'border-emerald-900/50', label: t('status.resolved') },
  } as const;
  const style = statusStyles[status] || statusStyles.Submitted;

  return (
    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${style.border} ${style.text} bg-black/40`}>
      {style.label}
    </span>
  );
};

const RarityBadge: React.FC<{ rarity: NftRarity }> = ({ rarity }) => {
  const rarityStyles = {
    Common: 'border-zinc-700 text-zinc-500',
    Rare: 'border-cyan-800 text-cyan-400',
    Epic: 'border-purple-800 text-purple-400',
    Legendary: 'border-amber-700 text-amber-500',
  } as const;
  return <span className={`px-2 py-1 text-[10px] font-black border rounded-md uppercase ${rarityStyles[rarity]}`}>{rarity}</span>;
};

const MyReportCard: React.FC<MyReportCardProps> = ({ report, onJoinChat }) => {
  const { t } = useTranslations();
  const categoryInfo = CATEGORIES_WITH_ICONS.find(c => c.value === report.category);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    const imageUrls = Array.isArray((report as any).imageUrls) ? (report as any).imageUrls : [];
    const attachments = Array.isArray((report as any).attachments) ? (report as any).attachments : [];

    if (imageUrls.length > 0) {
      setPrimaryImageUrl(typeof imageUrls[0] === 'string' ? imageUrls[0] : null);
    } else if (attachments.length > 0) {
      const imageFile = attachments.find((f: any) => f && typeof f.type === 'string' && f.type.startsWith('image/'));
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

  const safeTimestamp = report.timestamp instanceof Date ? report.timestamp : new Date((report as any).timestamp);
  const timeLabel = Number.isNaN(safeTimestamp.getTime()) ? '—' : safeTimestamp.toLocaleString();

  const hasReward = report.earnedNft || report.credsEarned || report.isGeneratingNft;

  return (
    <div className={`bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 hover:border-cyan-500/40 transition-all ${report.isGeneratingNft ? 'animate-pulse' : ''}`}>
      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        <div className="w-full md:w-36 h-36 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex-shrink-0">
          {primaryImageUrl ? (
            <img src={primaryImageUrl} alt={report.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl opacity-50">{categoryInfo?.icon || '📄'}</div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500 font-black">
              <span>{categoryInfo ? t(categoryInfo.translationKey) : report.category}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{timeLabel}</span>
            </div>
            <StatusBadge status={report.status} />
          </div>

          <h4 className="text-xl font-black text-white tracking-tight truncate" title={report.title}>{report.title}</h4>
          <p className="text-xs text-zinc-500 truncate">TX: {report.txHash || report.blockchainRef || report.hash}</p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onJoinChat && (
              <button
                onClick={onJoinChat}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-4 rounded-xl text-[11px] uppercase tracking-wider"
              >
                <Broadcast className="w-4 h-4" />
                Open Situation Room
              </button>
            )}
          </div>
        </div>
      </div>

      {hasReward && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          {report.isGeneratingNft ? (
            <div className="flex items-center gap-3 p-3 bg-cyan-950/20 rounded-xl border border-cyan-800/30">
              <Loader className="w-5 h-5 text-cyan-500 animate-spin" />
              <p className="text-xs font-black text-cyan-400 uppercase tracking-wider">{t('myReportCard.generatingArtwork')}</p>
            </div>
          ) : report.earnedNft ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-black">Verification Artifact:</span>
              <RarityBadge rarity={report.earnedNft.rarity} />
              {report.credsEarned ? (
                <span className="inline-flex items-center gap-1 text-xs font-black text-amber-500 bg-black/60 px-3 py-1 rounded-full border border-amber-900/30">
                  <Coins className="w-3 h-3" />+{report.credsEarned} HC
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-500">
                <ShieldCheck className="w-3 h-3" />CERTIFIED
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MyReportCard;
