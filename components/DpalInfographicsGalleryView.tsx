import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, X } from './icons';
import { VIEW_PATHS } from '../utils/appRoutes';
import {
  DPAL_INFOGRAPHIC_CATEGORY,
  DPAL_INFOGRAPHIC_GROUPS,
  DPAL_INFOGRAPHICS,
  type DpalInfographicGroup,
  type DpalInfographicItem,
} from '../data/dpalInfographics';

type FilterKey = 'all' | DpalInfographicGroup;

interface DpalInfographicsGalleryViewProps {
  onReturn: () => void;
}

function shareUrlFor(item: DpalInfographicItem): string {
  if (typeof window === 'undefined') return '';
  const path = VIEW_PATHS.dpalInfographicsGallery ?? '/environmental-intelligence/infographics';
  return `${window.location.origin}${path}#${encodeURIComponent(item.id)}`;
}

export default function DpalInfographicsGalleryView({ onReturn }: DpalInfographicsGalleryViewProps): React.ReactElement {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [lightbox, setLightbox] = useState<DpalInfographicItem | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return DPAL_INFOGRAPHICS;
    return DPAL_INFOGRAPHICS.filter((row) => row.group === filter);
  }, [filter]);

  const openFromHash = useCallback(() => {
    const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    if (!raw) return;
    const id = decodeURIComponent(raw);
    const hit = DPAL_INFOGRAPHICS.find((row) => row.id === id);
    if (hit) setLightbox(hit);
  }, []);

  useEffect(() => {
    openFromHash();
  }, [openFromHash]);

  useEffect(() => {
    const onHash = () => openFromHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [openFromHash]);

  const copyLink = async (item: DpalInfographicItem) => {
    const url = shareUrlFor(item);
    try {
      await navigator.clipboard.writeText(url);
      setCopyHint('Link copied');
    } catch {
      setCopyHint('Copy blocked — select the link in the dialog');
    }
    window.setTimeout(() => setCopyHint(null), 2400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24">
        <button
          type="button"
          onClick={onReturn}
          className="mb-4 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 hover:text-cyan-100"
        >
          Back to Home
        </button>

        <header className="mb-8 rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 to-slate-950 p-6 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">{DPAL_INFOGRAPHIC_CATEGORY}</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">DPAL story & service maps</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
            High-resolution one-pagers you can open full-screen, present in meetings, or share with a direct link.
            Figures are illustrative; follow your jurisdiction and DPAL disclaimers when citing impact or compliance.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {(['all', 'environmental', 'platform', 'programs'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filter === key
                  ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100'
                  : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500'
              }`}
            >
              {key === 'all' ? 'All' : DPAL_INFOGRAPHIC_GROUPS[key].label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg transition hover:border-cyan-500/35"
            >
              <button
                type="button"
                onClick={() => {
                  setLightbox(item);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState(null, '', `#${encodeURIComponent(item.id)}`);
                  }
                }}
                className="relative block w-full text-left"
              >
                <img
                  src={item.imageSrc}
                  alt=""
                  className="h-44 w-full object-cover object-top opacity-95 transition group-hover:opacity-100 sm:h-52"
                  loading="lazy"
                />
                <span className="absolute left-2 top-2 rounded-full border border-slate-700/80 bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-200">
                  {DPAL_INFOGRAPHIC_GROUPS[item.group].label}
                </span>
              </button>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h2 className="text-sm font-bold leading-snug text-white">{item.title}</h2>
                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLightbox(item)}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-900/50"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyLink(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-500"
                  >
                    <Link className="h-3.5 w-3.5" />
                    Copy link
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {copyHint ? (
          <p className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-950/95 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-lg">
            {copyHint}
          </p>
        ) : null}
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[160] flex flex-col bg-black/88 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
        >
          <div className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-2 pb-3">
            <p className="truncate text-sm font-bold text-white sm:text-base">{lightbox.title}</p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void copyLink(lightbox)}
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/50 bg-cyan-950/50 px-3 py-1.5 text-xs font-semibold text-cyan-100"
              >
                <Link className="h-3.5 w-3.5" />
                Copy link
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightbox(null);
                  if (typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }}
                className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 justify-center overflow-auto rounded-xl border border-slate-800 bg-slate-950">
            <img src={lightbox.imageSrc} alt={lightbox.title} className="h-auto w-full max-w-full object-contain object-top p-2" />
          </div>
          <p className="mx-auto mt-2 max-w-6xl shrink-0 text-center text-[10px] text-slate-500 break-all">
            {shareUrlFor(lightbox)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
