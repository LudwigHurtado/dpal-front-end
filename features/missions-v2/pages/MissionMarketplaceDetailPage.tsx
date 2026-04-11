import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { MARKETPLACE_KIND_LABEL } from '../marketplaceTypes';
import type { MarketplaceListingDetail } from '../marketplaceTypes';
import { mw } from '../missionWorkspaceTheme';
import { marketplaceMissionDetailPath } from '../../../utils/appRoutes';

export interface MissionMarketplaceDetailPageProps {
  listing: MarketplaceListingDetail;
  onBack: () => void;
  /** Opens Mission Assignment V2 — execution engine unchanged. */
  onOpenWorkspace: () => void;
}

function urgencyRow(u: MarketplaceListingDetail['urgency']): string {
  if (u === 'high') return 'border-rose-500/40 bg-rose-950/35 text-rose-100';
  if (u === 'medium') return 'border-amber-500/35 bg-amber-950/30 text-amber-100';
  return 'border-teal-700/40 bg-teal-950/45 text-teal-100';
}

const MissionMarketplaceDetailPage: React.FC<MissionMarketplaceDetailPageProps> = ({
  listing,
  onBack,
  onOpenWorkspace,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    try {
      return `${window.location.origin}${marketplaceMissionDetailPath(listing.id)}`;
    } catch {
      return marketplaceMissionDetailPath(listing.id);
    }
  }, [listing.id]);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(shareUrl, { width: 168, margin: 1, color: { dark: '#0f766e', light: '#ffffff' } }).then(
      (url) => {
        if (!cancelled) setQrDataUrl(url);
      },
      () => {
        if (!cancelled) setQrDataUrl(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyHint('Link copied');
      window.setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint('Copy blocked — select the URL in the bar');
      window.setTimeout(() => setCopyHint(null), 3000);
    }
  }, [shareUrl]);

  const shareMission = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, text: listing.summary, url: shareUrl });
      } else {
        await copyLink();
      }
    } catch {
      /* user cancelled or share unavailable */
    }
  }, [copyLink, listing.summary, listing.title, shareUrl]);

  return (
    <div className={`${mw.shell} min-h-full pb-28`}>
      <div className="mx-auto max-w-[900px] px-4 pt-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className={mw.btnGhost}>
            ← Back to hub
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={shareMission} className={mw.btnGhost}>
              Share
            </button>
            <button type="button" onClick={copyLink} className={mw.btnGhost}>
              Copy link
            </button>
            <button type="button" onClick={onOpenWorkspace} className={mw.btnPrimary}>
              Open in workspace (V2)
            </button>
          </div>
        </div>

        <header className="mb-6 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400/90">Mission detail</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${urgencyRow(listing.urgency)}`}>
              {listing.urgency} urgency
            </span>
            <span className="rounded border border-teal-800/60 bg-teal-950/60 px-2 py-0.5 text-[10px] text-teal-200/90">
              {listing.displayStatus.split('_').join(' ')}
            </span>
            {listing.kinds.map((k) => (
              <span
                key={k}
                className="rounded border border-teal-800/55 bg-teal-950/50 px-2 py-0.5 text-[10px] text-teal-200/85"
              >
                {MARKETPLACE_KIND_LABEL[k]}
              </span>
            ))}
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-teal-50 sm:text-3xl">{listing.title}</h1>
          <p className="text-sm leading-relaxed text-teal-200/85">{listing.summary}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
          <div className="space-y-4">
            <section className={`${mw.sectorCard} space-y-3`}>
              <h2 className={`${mw.textLabel} text-sm`}>Description</h2>
              <p className="text-sm leading-relaxed text-teal-100/90">{listing.fullDescription}</p>
            </section>

            <section className={`${mw.sectorCard} grid gap-3 sm:grid-cols-2`}>
              <DetailItem label="Category" value={listing.categoryLabel} />
              <DetailItem label="Mission type" value={listing.missionTypeLabel} />
              <DetailItem label="Location" value={listing.locationLabel} />
              <DetailItem label="Deadline" value={listing.deadlineLabel} />
              <DetailItem label="Format" value={listing.formatLabel === 'team' ? 'Team' : 'Solo'} />
              <DetailItem label="Realm" value={listing.realmLabel} />
              <DetailItem label="Trust" value={listing.trustLevel} />
              <DetailItem label="Visibility" value={listing.visibilityLabel} />
              <DetailItem
                label="Participants"
                value={`${listing.participantCount} / ${listing.maxParticipants}`}
              />
              <DetailItem label="Reward" value={listing.rewardSummary ?? 'Volunteer / TBD'} />
              <DetailItem label="Posted by" value={listing.postedByLabel} />
              {listing.linkedReportId ? <DetailItem label="Linked report" value={listing.linkedReportId} /> : null}
            </section>

            <section className={`${mw.sectorCard} space-y-2`}>
              <h2 className={`${mw.textLabel} text-sm`}>Proof requirements</h2>
              <ul className="list-inside list-disc text-sm text-teal-100/85">
                {listing.proofRequirements.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className={`text-xs ${mw.textMuted}`}>{listing.validationNote}</p>
            </section>

            <section className={`${mw.sectorCard} space-y-2`}>
              <h2 className={`${mw.textLabel} text-sm`}>Task checklist</h2>
              <ol className="list-inside list-decimal space-y-1 text-sm text-teal-100/85">
                {listing.checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            </section>

            <section className={`${mw.innerWell} p-4`}>
              <h2 className={`${mw.textLabel} text-sm`}>Safety</h2>
              <p className="mt-1 text-sm text-amber-200/90">{listing.safetyNotes}</p>
            </section>
          </div>

          <aside className={`${mw.sectorCard} h-fit space-y-4`}>
            <div>
              <p className={`text-xs font-semibold ${mw.textLabel}`}>Share & verify</p>
              <p className={`mt-1 break-all text-[11px] ${mw.textMuted}`}>{shareUrl}</p>
              {copyHint ? <p className="mt-2 text-xs text-teal-400">{copyHint}</p> : null}
            </div>
            <div className="flex flex-col items-center gap-2">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code for this mission link" className="rounded-lg bg-white/95 p-2" width={168} height={168} />
              ) : (
                <div className="flex h-[168px] w-[168px] items-center justify-center rounded-lg border border-teal-900/50 text-xs text-teal-600">
                  QR…
                </div>
              )}
              <span className={`text-center text-[10px] ${mw.textMuted}`}>Scan to open this mission</span>
            </div>
            <div className="flex flex-col gap-2 border-t border-teal-900/40 pt-4">
              <button type="button" className={mw.btnPrimary} onClick={onOpenWorkspace}>
                Execute in V2 workspace
              </button>
              <p className={`text-[11px] leading-relaxed ${mw.textMuted}`}>
                Join, proof, and validator handoff run through Mission Assignment V2 — same engine as report-linked
                missions.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={`text-[11px] ${mw.textMuted}`}>{label}</dt>
      <dd className="text-sm text-teal-100/90">{value}</dd>
    </div>
  );
}

export default MissionMarketplaceDetailPage;
