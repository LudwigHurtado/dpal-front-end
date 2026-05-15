import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CARBONPURA_DEFAULT_PROJECT_ID, parseCarbonPuraContext } from '../carbonPuraProjectContext';

type CarbonPuraContextBannerProps = {
  moduleLabel: string;
};

/**
 * Non-invasive banner when opened via CarbonPura context routing (`?partner=carbonpura`).
 * Does not alter scan logic or auto-run workflows.
 */
export function CarbonPuraContextBanner({ moduleLabel }: CarbonPuraContextBannerProps) {
  const [searchParams] = useSearchParams();
  const { isCarbonPuraContext, projectId, sourceSuite } = parseCarbonPuraContext(searchParams.toString());

  if (!isCarbonPuraContext) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-teal-200 bg-teal-50/90 px-4 py-3 text-sm text-teal-950"
    >
      <p className="font-semibold">Opened from CarbonPura workspace</p>
      <p className="mt-1 text-xs leading-relaxed text-teal-900">
        {moduleLabel} · Project context:{' '}
        <span className="font-mono">{projectId || CARBONPURA_DEFAULT_PROJECT_ID}</span>
        {sourceSuite ? (
          <>
            {' '}
            · PACE suite: <span className="font-mono">{sourceSuite}</span>
          </>
        ) : null}
      </p>
      <p className="mt-1 text-[11px] text-teal-800">
        Results can be reviewed here. Cross-module attachment to CarbonPura evidence packet is pending — not
        backend-saved.
      </p>
    </div>
  );
}
