import React, { useMemo } from 'react';
import { Bot } from '../../../../components/icons';
import type { ColoradoWorkflowStepId } from '../waterIntelligenceWorkflow';

export type WaterIntelAssistantContext =
  | { screen: 'launcher' }
  | {
      screen: 'colorado';
      completedSteps: ColoradoWorkflowStepId[];
      tabId: string;
      evidenceGenerated: boolean;
      routingPreviewed: boolean;
      ledgerAnchored: boolean;
      mockLedger: boolean;
      demoLayers: boolean;
    }
  | {
      screen: 'city';
      completedCitySteps: number;
      totalCitySteps: number;
      mockLedger: boolean;
      fallbackLayers: boolean;
    };

function WaterIntelligenceAssistant({ context }: { context: WaterIntelAssistantContext }): React.ReactElement {
  const bullets = useMemo(() => {
    if (context.screen === 'launcher') {
      return [
        'Start with the Colorado River Basin Pilot or open a city FloodGuard demo.',
        'FloodGuard focuses on city-scale flood screening, missions, and evidence; Water Intelligence adds basin programs, conservation, and ledger-ready records.',
        'Every surface labels mock, fallback, preview routing, and pilot modes — read chips before interpreting signals.',
      ];
    }
    if (context.screen === 'city') {
      const rows: string[] = [];
      rows.push(
        `Workflow progress: ${context.completedCitySteps} of ${context.totalCitySteps} steps marked complete (manual + tab visits where applicable).`,
      );
      if (context.completedCitySteps === 0) {
        rows.push('Begin on the City Flood Map. Confirm zones, alerts, and data-source labels.');
      } else if (context.completedCitySteps < 3) {
        rows.push('Next, use Agent Monitor — refresh evaluation before considering any mission dispatch.');
      } else if (context.completedCitySteps < 5) {
        rows.push('Generate an evidence packet only after signals are reviewed; keep mock vs live labels visible.');
      } else {
        rows.push('Finish with routing preview (dry-run) and public verification — never expose private threads.');
      }
      if (context.fallbackLayers) {
        rows.push('Fallback or synthetic layers may be active — connect live adapters before formal claims.');
      }
      if (context.mockLedger) {
        rows.push('Mock ledger mode: demonstrate workflow only — not a production blockchain anchor.');
      }
      return rows;
    }
    const c = context;
    const next =
      !c.completedSteps.includes('cr_basin_map')
        ? 'Begin by reviewing the basin map and Map Source Guidance.'
        : !c.completedSteps.includes('cr_river_conditions')
          ? 'Review river and reservoir conditions — focus on Powell, Mead, and risk flags (demo).'
          : !c.completedSteps.includes('cr_conservation')
            ? 'Review conservation opportunities and evidence gaps before estimating acre-feet.'
            : !c.evidenceGenerated
              ? 'Generate a demo evidence packet with explicit mock digests.'
              : !c.routingPreviewed
                ? 'Run a routing preview — confirm preview-only mode and blocked routes.'
                : !c.ledgerAnchored
                  ? 'Anchor a mock ledger record when ready — label it mock/pilot.'
                  : 'Open public verification and confirm private fields stay hidden.';

    const out = [next];
    if (c.demoLayers) {
      out.push('This project uses demo layers — connect live APIs before operational use.');
    }
    if (c.mockLedger) {
      out.push('Mock ledger mode is active — records illustrate workflow, not live chain proofs.');
    }
    return out;
  }, [context]);

  return (
    <div
      className="rounded-2xl p-4 border dpal-border-subtle space-y-2 sticky top-4"
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
        <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
          Water Intelligence Assistant
        </span>
      </div>
      <p className="text-[11px] dpal-text-secondary leading-relaxed">
        Contextual suggestions for operators — not an emergency notification and not a substitute for agency
        alerts.
      </p>
      <ul className="text-[11px] dpal-text-secondary space-y-1.5 list-disc pl-4">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

export default WaterIntelligenceAssistant;
