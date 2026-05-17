import React from 'react';
import { Sparkles } from '../../../../components/icons';
import type { DmrvLocationSuggestions } from '../utils/dmrvLocationAssist';
import type { DmrvWorkflowLink } from '../utils/dmrvWorkflowLinks';

const STATUS_STYLES: Record<DmrvWorkflowLink['status'], string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  partial: 'border-amber-200 bg-amber-50 text-amber-950',
  pending: 'border-slate-200 bg-slate-50 text-slate-600',
};

export type DmrvProjectFormAssistProps = {
  workflowLinks: DmrvWorkflowLink[];
  suggestions: DmrvLocationSuggestions | null;
  onApplyAllSuggestions: () => void;
  onApplyProjectName: () => void;
  onApplyMethodology: () => void;
  onOpenSatellite: () => void;
  onOpenLidar?: () => void;
  satelliteReady: boolean;
};

export function DmrvProjectFormAssist({
  workflowLinks,
  suggestions,
  onApplyAllSuggestions,
  onApplyProjectName,
  onApplyMethodology,
  onOpenSatellite,
  onOpenLidar,
  satelliteReady,
}: DmrvProjectFormAssistProps): React.ReactElement {
  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          Connected workflow
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Location → satellite evidence → integrity packet → blockchain project identity. Fields on this page feed
          each step.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {workflowLinks.map((link) => {
            const openHandler =
              link.action === 'open-satellite'
                ? onOpenSatellite
                : link.action === 'open-lidar'
                  ? onOpenLidar
                  : undefined;
            const interactive = Boolean(openHandler);
            const Tag = interactive ? 'button' : 'div';
            return (
              <li key={link.id}>
                <Tag
                  type={interactive ? 'button' : undefined}
                  onClick={interactive ? openHandler : undefined}
                  disabled={interactive && link.action === 'open-satellite' ? !satelliteReady : false}
                  className={`w-full rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${
                    STATUS_STYLES[link.status]
                  } ${
                    interactive
                      ? 'cursor-pointer hover:ring-2 hover:ring-[#1e3a5f]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/35 disabled:cursor-not-allowed disabled:opacity-60'
                      : ''
                  }`}
                >
                  <p className="font-bold">{link.label}</p>
                  <p className="mt-0.5 leading-snug opacity-90">{link.detail}</p>
                  {interactive ? (
                    <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#1e3a5f]">
                      Open workspace →
                    </p>
                  ) : null}
                </Tag>
              </li>
            );
          })}
        </ul>
      </div>

      {suggestions ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-800" />
              <div>
                <p className="text-sm font-bold text-sky-950">Suggested project details</p>
                <p className="mt-0.5 text-xs text-sky-900/90">
                  Based on your map selection
                  {suggestions.placeLabel ? ` near ${suggestions.placeLabel}` : ''}.
                  Apply to connect identity with satellite and evidence steps.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <AssistBtn label="Apply all suggestions" primary onClick={onApplyAllSuggestions} />
              <AssistBtn label="Use project name" onClick={onApplyProjectName} />
              <AssistBtn label="Fill methodology" onClick={onApplyMethodology} />
            </div>
          </div>

          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <SuggestionItem label="Project name" value={suggestions.suggestedProjectName} />
            <SuggestionItem label="Project ID" value={suggestions.suggestedProjectId} mono />
            <SuggestionItem label="Country / region" value={suggestions.suggestedCountryRegion || '—'} />
            <SuggestionItem
              label="Methodology"
              value={`${suggestions.suggestedMethodologyName} (${suggestions.suggestedDomain})`}
            />
          </dl>
          <p className="mt-2 rounded-lg border border-sky-100 bg-white/70 px-2.5 py-2 text-[11px] leading-relaxed text-slate-700">
            {suggestions.suggestedDescription}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/5 px-3 py-2.5">
        <p className="flex-1 text-xs text-slate-700">
          <span className="font-bold text-[#1e3a5f]">Next:</span> save configuration, then configure satellite imagery
          using this AOI. Evidence packets pull project ID, location, and methodology from here.
        </p>
        <button
          type="button"
          disabled={!satelliteReady}
          onClick={onOpenSatellite}
          className="rounded-lg bg-[#1e3a5f] px-3 py-2 text-xs font-bold text-white hover:bg-[#152a47] disabled:opacity-50"
        >
          Configure satellite →
        </button>
        {onOpenLidar ? (
          <button
            type="button"
            disabled={!satelliteReady}
            onClick={onOpenLidar}
            className="rounded-lg border border-emerald-600 bg-white px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
          >
            Configure LiDAR →
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SuggestionItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-sky-100 bg-white/80 px-2.5 py-1.5">
      <dt className="text-[10px] font-bold uppercase text-sky-800/80">{label}</dt>
      <dd className={`mt-0.5 text-sky-950 ${mono ? 'font-mono text-[10px] break-all' : 'font-semibold'}`}>
        {value}
      </dd>
    </div>
  );
}

function AssistBtn({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
        primary
          ? 'bg-sky-800 text-white hover:bg-sky-900'
          : 'border border-sky-300 bg-white text-sky-900 hover:bg-sky-100'
      }`}
    >
      {label}
    </button>
  );
}
