import React from 'react';
import type { CategoryDefinition, CategoryMode } from '../types/categoryGateway';
import { Category } from '../types';
import { ArrowLeft, FileText, Heart, Briefcase, Gamepad } from './icons';
import { getCategoryCardImageSrc } from '../categoryCardAssets';

export type GatewayActivity = { id: string; title: string; meta: string };

export type CategoryGatewayViewProps = {
  category: Category;
  categoryId: string;
  categoryTitle: string;
  definition: CategoryDefinition;
  onBack: () => void;
  onModeSelect: (categoryId: string, mode: CategoryMode) => void;
  recentActivity: GatewayActivity[];
  userProgress?: { label: string; value: string }[];
  hasDraft?: boolean;
  onContinueDraft?: () => void;
};

const MODE_ICONS: Record<CategoryMode, React.ReactNode> = {
  report: <FileText className="w-7 h-7" />,
  help: <Heart className="w-7 h-7" />,
  work: <Briefcase className="w-7 h-7" />,
  play: <Gamepad className="w-7 h-7" />,
};

const MODE_ORDER: CategoryMode[] = ['report', 'help', 'work', 'play'];

function ModeCard({
  mode,
  def,
  accent,
  onSelect,
}: {
  mode: CategoryMode;
  def: CategoryDefinition;
  accent: string;
  onSelect: () => void;
}) {
  const card =
    mode === 'report'
      ? def.modes.report?.card
      : mode === 'help'
        ? def.modes.help?.card
        : mode === 'work'
          ? def.modes.work?.card
          : def.modes.play?.card;

  if (!card) return null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group text-left rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
    >
      <div
        className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-inner transition-transform group-hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
      >
        {MODE_ICONS[mode]}
      </div>
      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{card.title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-snug">{card.explanation}</p>
      <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
        {card.examples.map((ex) => (
          <li key={ex} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
            {ex}
          </li>
        ))}
      </ul>
      <span
        className="mt-6 inline-flex items-center text-sm font-semibold"
        style={{ color: accent }}
      >
        {card.cta}
        <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </button>
  );
}

const CategoryGatewayView: React.FC<CategoryGatewayViewProps> = ({
  category,
  categoryId,
  categoryTitle,
  definition,
  onBack,
  onModeSelect,
  recentActivity,
  userProgress,
  hasDraft,
  onContinueDraft,
}) => {
  const hero = definition.heroImage || getCategoryCardImageSrc(category);
  const accent = definition.accentColor;

  const quickChips = ['happened today', 'repeat issue', 'child involved', 'safety risk', 'photo available', 'witness present'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24">
        <button
          type="button"
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
          <span className="sr-only">{categoryTitle}</span>
        </button>

        {/* Hero */}
        <header className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm">
          <div className="relative h-48 sm:h-64 md:h-72 w-full bg-slate-200">
            <img src={hero} alt="" className="h-full w-full object-contain object-center bg-[#f1f5f9]" />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/80 via-[#0f172a]/25 to-transparent"
              aria-hidden
            />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{categoryId}</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-sm">
                {definition.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-white/90 leading-relaxed">
                {definition.subtitle}
              </p>
            </div>
          </div>

          {definition.stats && definition.stats.length > 0 && (
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/80">
              {definition.stats.map((s) => (
                <div key={s.label} className="px-4 py-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Mode grid */}
        <section className="mt-10">
          <h2 className="text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500 mb-6">
            Choose a mode
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MODE_ORDER.filter((m) => definition.supportedModes.includes(m)).map((mode) => (
              <ModeCard
                key={mode}
                mode={mode}
                def={definition}
                accent={accent}
                onSelect={() => onModeSelect(categoryId, mode)}
              />
            ))}
          </div>
        </section>

        {/* Continue draft */}
        {hasDraft && onContinueDraft && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onContinueDraft}
              className="rounded-full border-2 border-dashed px-6 py-3 text-sm font-semibold transition hover:bg-white"
              style={{ borderColor: accent, color: accent }}
            >
              Continue saved draft
            </button>
          </div>
        )}

        {/* Quick chips (reduce typing for next steps) */}
        <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Quick tags</p>
          <div className="flex flex-wrap gap-2">
            {quickChips.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Recent activity + progress */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Recent community activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500">No recent filings in this category yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex flex-col border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <span className="font-semibold text-slate-900">{a.title}</span>
                    <span className="text-xs text-slate-500">{a.meta}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Your progress</h3>
            {userProgress && userProgress.length > 0 ? (
              <ul className="space-y-3">
                {userProgress.map((p) => (
                  <li key={p.label} className="flex justify-between text-sm">
                    <span className="text-slate-600">{p.label}</span>
                    <span className="font-bold text-slate-900">{p.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Sign in to track missions and badges in this sector.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CategoryGatewayView;
