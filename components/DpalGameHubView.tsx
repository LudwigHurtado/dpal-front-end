import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Award, ExternalLink, Map, Maximize2, X, Zap } from './icons';
import { SOCIETY_GAMES, getSocietyGamePlayUrl, type SocietyGameId } from '../societyGames';
import { useTranslations } from '../i18n';
import MissionGameView from '../features/mission-game/MissionGameView';

interface DpalGameHubViewProps {
  onReturn: () => void;
}

const GAME_COPY: Record<
  SocietyGameId,
  | 'investigationNetwork'
  | 'investigateObserveIntelligent'
  | 'beaconCommunity'
  | 'cleanZoneRestoreEarth'
  | 'safeReporting'
  | 'takeTheWalkShareMoment'
  | 'kittyComfortVisits'
  | 'silentObserver'
> = {
  'investigation-network': 'investigationNetwork',
  'investigate-observe-intelligent': 'investigateObserveIntelligent',
  'beacon-community': 'beaconCommunity',
  'clean-zone-restore-earth': 'cleanZoneRestoreEarth',
  'safe-reporting': 'safeReporting',
  'take-the-walk-share-moment': 'takeTheWalkShareMoment',
  'kitty-comfort-visits': 'kittyComfortVisits',
  'silent-observer': 'silentObserver',
};

const DpalGameHubView: React.FC<DpalGameHubViewProps> = ({ onReturn }) => {
  const { t } = useTranslations();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState('');
  const [showMissionGame, setShowMissionGame] = useState(false);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxSrc, closeLightbox]);

  if (showMissionGame) {
    return (
      <div className="animate-fade-in font-mono text-white max-w-7xl mx-auto pb-24 px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={() => setShowMissionGame(false)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300 hover:text-cyan-200 bg-black/60 px-5 py-2 rounded-2xl border border-cyan-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </button>
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
            <Map className="w-4 h-4 text-cyan-400" />
            Mission Ops
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-cyan-500/25 bg-zinc-950/80 p-3 shadow-2xl">
          <MissionGameView height={620} className="w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in font-mono text-white max-w-7xl mx-auto pb-24 px-4">
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={onReturn}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300 hover:text-cyan-200 bg-black/60 px-5 py-2 rounded-2xl border border-cyan-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('gameHub.back')}
        </button>
        <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
          <Award className="w-4 h-4 text-amber-400" />
          {t('gameHub.badge')}
        </div>
      </div>

      <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/50 p-6 md:p-8 mb-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 shrink-0">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight">{t('gameHub.title')}</h1>
              <p className="mt-2 text-sm text-zinc-300 max-w-3xl leading-relaxed">{t('gameHub.intro')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowMissionGame(true)}
            className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest border border-emerald-300/30 shadow-lg transition-colors"
          >
            <Map className="w-4 h-4" />
            Open Mission Ops
          </button>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-cyan-500/20 bg-cyan-950/20 p-5 mb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-cyan-100">DPAL Mission Ops</h2>
            <p className="mt-1 text-sm text-zinc-300 max-w-3xl leading-relaxed">
              Open the city map, choose a marker, inspect the mission details, and start field tasks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMissionGame(true)}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest border border-cyan-300/30 transition-colors"
          >
            Launch Mission Game
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {SOCIETY_GAMES.map((game) => {
          const key = GAME_COPY[game.id];
          const title = t(`gameHub.${key}.title`);
          const subtitle = t(`gameHub.${key}.subtitle`);
          const rules = t(`gameHub.${key}.rules`)
            .split('\n')
            .map((r) => r.trim())
            .filter(Boolean);
          const playUrl = getSocietyGamePlayUrl(game.id);

          return (
            <article
              key={game.id}
              className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 shadow-xl overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-0">
                <div className="lg:col-span-7 relative group">
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxSrc(game.instructionImageSrc);
                      setLightboxAlt(title);
                    }}
                    className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    aria-label={`${t('gameHub.enlargeHint')}: ${title}`}
                  >
                    <img
                      src={game.instructionImageSrc}
                      alt={title}
                      className="w-full h-auto object-cover max-h-[min(70vh,520px)] lg:max-h-none lg:min-h-[280px]"
                    />
                    <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-200 border border-cyan-500/30 opacity-90 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5" />
                      {t('gameHub.enlargeHint')}
                    </span>
                  </button>
                </div>

                <div className="lg:col-span-5 flex flex-col justify-between p-6 md:p-8 border-t lg:border-t-0 lg:border-l border-zinc-800">
                  <div>
                    <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-zinc-100">{title}</h2>
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{subtitle}</p>
                    <div className="mt-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">
                        {t('gameHub.rulesHeading')}
                      </p>
                      <ul className="text-sm text-zinc-300 space-y-1.5 list-disc list-inside marker:text-cyan-600">
                        {rules.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-800/80">
                    {playUrl ? (
                      <a
                        href={playUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[48px] px-6 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest border border-cyan-400/30 shadow-lg transition-colors"
                      >
                        {t('gameHub.playGame')}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 leading-snug">
                        {t('gameHub.linkNotConfigured')}
                      </p>
                    )}
                    {playUrl ? (
                      <p className="mt-2 text-[10px] text-zinc-500 uppercase tracking-widest">{t('gameHub.playOpensNewTab')}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {lightboxSrc ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxAlt}
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-[201] flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
            {t('gameHub.closeLightbox')}
          </button>
          <div
            className="max-w-[min(96vw,1200px)] max-h-[90vh] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={lightboxSrc} alt={lightboxAlt} className="max-h-[90vh] w-auto object-contain rounded-lg shadow-2xl mx-auto" />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DpalGameHubView;
