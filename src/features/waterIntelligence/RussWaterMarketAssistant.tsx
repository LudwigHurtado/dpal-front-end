import React, { useMemo } from 'react';
import { Bot } from '../../../components/icons';
import type { ExchangeWorkflowStepId } from './coloradoExchangeWorkflow';
import { COLORADO_EXCHANGE_WORKFLOW_STEPS } from './coloradoExchangeWorkflow';

export type RussAssistantContext =
  | { screen: 'launcher' }
  | {
      screen: 'colorado_exchange';
      completedSteps: ExchangeWorkflowStepId[];
      routePath: string;
    }
  | {
      screen: 'city';
      completedCitySteps: number;
      totalCitySteps: number;
      mockLedger: boolean;
      fallbackLayers: boolean;
    };

/**
 * Russ Water Market Assistant — contextual guidance for Colorado exchange pilot and related surfaces.
 * Not an emergency service and not agency-approved advice.
 */
function RussWaterMarketAssistant({ context }: { context: RussAssistantContext }): React.ReactElement {
  const bullets = useMemo(() => {
    if (context.screen === 'launcher') {
      return [
        'Start with the baseline. A conservation claim is only useful if the before-condition is documented.',
        'Mock data is active. Do not present this as a live certified water exchange.',
        'Human verification is not yet asserted; blockchain anchoring is not yet asserted unless explicitly shown as true on a record.',
        'For Club 20, emphasize agriculture protection, compensation, and verified acre-feet — with honest pilot labeling.',
      ];
    }
    if (context.screen === 'city') {
      const rows: string[] = [];
      rows.push(
        `Workflow progress: ${context.completedCitySteps} of ${context.totalCitySteps} steps marked complete.`,
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
        rows.push('Fallback layers may be active — connect live adapters before formal claims.');
      }
      if (context.mockLedger) {
        rows.push('Mock ledger mode: demonstrate workflow only — not a production blockchain anchor.');
      }
      return rows;
    }

    const nextIncomplete = COLORADO_EXCHANGE_WORKFLOW_STEPS.find((s) => !context.completedSteps.includes(s.id));
    const out: string[] = [];
    if (nextIncomplete) {
      out.push(`Next suggested step: ${nextIncomplete.title}. ${nextIncomplete.aiHint}`);
    } else {
      out.push('Workflow checklist appears complete — export Club 20 memo and keep pilot labels attached.');
    }

    if (context.routePath.includes('exchange')) {
      out.push('For resale, the project needs authority review and a transfer or lease agreement outside this demo UI.');
    }
    if (context.routePath.includes('colorado-river')) {
      out.push(
        'This project has monitoring data, but may still need water-right documentation before authority review.',
      );
      out.push(
        'If conserved water is assigned to reservoir/system support, classification tends toward system enhancement — still requires governance pathways.',
      );
    }
    out.push('Human verification is not yet asserted. Blockchain anchoring is not yet asserted unless explicitly true.');
    return out;
  }, [context]);

  const sectionedColorado = useMemo(() => {
    if (context.screen !== 'colorado_exchange') return null;
    return {
      currentFocus:
        'Start with the basin map and baseline records. A water-conservation claim needs a clear geography and before-condition before it can support any unit or transaction.',
      missingEvidence:
        'Mock/demo projects still need live source connections, water-right documentation, authority review, and human validation before any formal claim.',
      suggestedNextStep:
        'Review the Grand Valley Agricultural Conservation Pilot first because it best demonstrates Russ Freeman’s idea: agriculture conserves water and receives value instead of being punished by restrictions.',
      claimSafetyWarning:
        'Do not present VWCUs as certified credits or legal water rights. They are DPAL pilot demonstration units unless accepted by an authority or contract program.',
      investorExplanation:
        'DPAL is not claiming to own the water market. DPAL provides the evidence, workflow, ledger, and verification infrastructure that a water exchange or authority could use.',
    };
  }, [context]);

  return (
    <div
      className="rounded-2xl p-4 border dpal-border-subtle space-y-2 sticky top-4"
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
        <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
          Russ Water Market Assistant
        </span>
      </div>
      <p className="text-[11px] dpal-text-secondary leading-relaxed">
        Contextual guidance for operators — not legal advice, not an emergency notification, and not a substitute for
        agency alerts or water-authority decisions.
      </p>
      {sectionedColorado ? (
        <div className="space-y-2 text-[11px]">
          <div className="rounded-lg p-2 border dpal-border-subtle" style={{ background: 'var(--dpal-surface-alt)' }}>
            <div className="font-bold dpal-text-muted">Current focus</div>
            <div className="dpal-text-secondary mt-0.5">{sectionedColorado.currentFocus}</div>
          </div>
          <div className="rounded-lg p-2 border dpal-border-subtle" style={{ background: 'var(--dpal-surface-alt)' }}>
            <div className="font-bold dpal-text-muted">Missing evidence</div>
            <div className="dpal-text-secondary mt-0.5">{sectionedColorado.missingEvidence}</div>
          </div>
          <div className="rounded-lg p-2 border dpal-border-subtle" style={{ background: 'var(--dpal-surface-alt)' }}>
            <div className="font-bold dpal-text-muted">Suggested next step</div>
            <div className="dpal-text-secondary mt-0.5">{sectionedColorado.suggestedNextStep}</div>
          </div>
          <div className="rounded-lg p-2 border border-amber-400/30 bg-amber-500/10">
            <div className="font-bold text-amber-200">Claim-safety warning</div>
            <div className="text-amber-100 mt-0.5">{sectionedColorado.claimSafetyWarning}</div>
          </div>
          <div className="rounded-lg p-2 border dpal-border-subtle" style={{ background: 'var(--dpal-surface-alt)' }}>
            <div className="font-bold dpal-text-muted">Investor explanation</div>
            <div className="dpal-text-secondary mt-0.5">{sectionedColorado.investorExplanation}</div>
          </div>
        </div>
      ) : (
        <ul className="text-[11px] dpal-text-secondary space-y-1.5 list-disc pl-4">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RussWaterMarketAssistant;

/** @deprecated Use RussWaterMarketAssistant — alias for FloodGuard imports */
export { RussWaterMarketAssistant as WaterIntelligenceAssistant };
