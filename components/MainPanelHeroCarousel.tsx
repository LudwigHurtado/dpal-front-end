import React, { useEffect, useMemo, useState } from 'react';

export type MainPanelHeroCarouselVariant = 'panel' | 'home';

interface MainPanelHeroCarouselProps {
  /** 'panel' = full card under Main Control Panel; 'home' = hero strip on main menu */
  variant?: MainPanelHeroCarouselVariant;
  className?: string;
}

const MainPanelHeroCarousel: React.FC<MainPanelHeroCarouselProps> = ({
  variant = 'panel',
  className = '',
}) => {
  const fallbackSeries = useMemo(
    () => [
      '/report-protect/main-panel-hero-ecosystem.png',
      '/report-protect/main-panel-series-05-report-protect-mobile.png',
      '/report-protect/main-panel-series-06-silent-observer.png',
    ],
    []
  );
  const [series, setSeries] = useState<string[]>(fallbackSeries);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadSeries = async () => {
      try {
        const response = await fetch('/report-protect/main-panel-series.json', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        const list = Array.isArray(data?.images)
          ? data.images.filter((x: unknown) => typeof x === 'string' && (x as string).length > 0)
          : [];
        if (list.length > 0) setSeries(list as string[]);
      } catch {
        // Keep fallback list when manifest is missing.
      }
    };
    void loadSeries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (series.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % series.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [series]);

  useEffect(() => {
    if (activeSlide >= series.length) setActiveSlide(0);
  }, [series, activeSlide]);

  const isHome = variant === 'home';

  const outer = isHome
    ? 'w-full max-w-5xl mx-auto rounded-2xl border border-cyan-500/30 bg-zinc-900/60 p-3 md:p-4 shadow-[0_0_48px_rgba(34,211,238,0.12)]'
    : 'rounded-2xl border border-cyan-500/20 bg-zinc-900/60 p-4';

  const imgClass = isHome
    ? 'w-full max-h-[min(62vh,640px)] min-h-[220px] h-auto rounded-xl border border-cyan-500/20 object-contain object-center bg-zinc-950/80'
    : 'w-full h-auto rounded-xl border border-zinc-700 object-cover';

  return (
    <div className={`${outer} ${className}`.trim()}>
      <img
        src={series[activeSlide] || fallbackSeries[0]}
        alt="DPAL main panel visual series"
        className={imgClass}
        draggable={false}
      />
      {series.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {series.map((_, idx) => (
            <button
              key={`main-series-dot-${idx}`}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`w-2.5 h-2.5 rounded-full ${
                idx === activeSlide ? 'bg-cyan-400' : 'bg-zinc-600 hover:bg-zinc-500'
              }`}
              aria-label={`Show panel image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MainPanelHeroCarousel;
