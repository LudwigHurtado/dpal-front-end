import React, { useCallback, useState } from 'react';
import { useGwLang } from '../../../i18n/useGwLang';

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  videoUrls: string[];
  onBackToMap: () => void;
};

/**
 * Full-screen in-ride stories (shelter / impact). Collapse chevron returns to the map shell.
 */
const ShelterRideStoryOverlay: React.FC<Props> = ({ open, title, subtitle, videoUrls, onBackToMap }) => {
  const t = useGwLang((s) => s.t);
  const [idx, setIdx] = useState(0);

  const safeIdx = videoUrls.length === 0 ? 0 : idx % videoUrls.length;
  const goNext = useCallback(() => {
    if (videoUrls.length <= 1) return;
    setIdx((i) => (i + 1) % videoUrls.length);
  }, [videoUrls.length]);

  if (!open || videoUrls.length === 0) return null;

  const src = videoUrls[safeIdx] ?? '';

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gw-shelter-story-title"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2 bg-gradient-to-b from-black/80 to-transparent">
        <button
          type="button"
          onClick={onBackToMap}
          className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20"
          aria-label={t('shelterStoryBackToMap')}
        >
          <span className="inline-block text-lg leading-none" aria-hidden>
            ⌄
          </span>
          <span>{t('shelterStoryBackToMap')}</span>
        </button>
        {videoUrls.length > 1 ? (
          <button type="button" onClick={goNext} className="text-xs font-bold text-white/90 underline-offset-2 hover:underline">
            {t('shelterStoryNextVideo')}
          </button>
        ) : null}
      </div>

      <div className="px-4 pb-2">
        <h2 id="gw-shelter-story-title" className="text-lg font-extrabold text-white drop-shadow">
          {title}
        </h2>
        {subtitle ? <p className="text-sm text-white/80 mt-0.5">{subtitle}</p> : null}
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        <video
          key={src}
          className="max-h-[min(72vh,calc(100vh-140px))] w-full max-w-4xl rounded-lg bg-black object-contain shadow-2xl"
          src={src}
          controls
          playsInline
          preload="metadata"
        />
      </div>

      {videoUrls.length > 1 ? (
        <div className="flex justify-center gap-1.5 pb-4">
          {videoUrls.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Video ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-2 w-2 rounded-full ${i === safeIdx ? 'bg-white' : 'bg-white/35'}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ShelterRideStoryOverlay;
