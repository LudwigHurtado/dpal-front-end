import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { computeConservation } from './services/waterConservationCalculator';

export default function ConservationCalculatorView(): React.ReactElement {
  const [baseline, setBaseline] = useState(1000);
  const [current, setCurrent] = useState(800);
  const [rain, setRain] = useState(10);
  const [returnFlow, setReturnFlow] = useState(5);
  const [uncPct, setUncPct] = useState(10);
  const [validatorAdj, setValidatorAdj] = useState(0);

  const result = useMemo(
    () =>
      computeConservation({
        baselineConsumptiveUseAF: baseline,
        currentConsumptiveUseAF: current,
        rainfallAdjustmentAF: rain,
        returnFlowAdjustmentAF: returnFlow,
        uncertaintyBufferPercent: uncPct,
        validatorAdjustmentAF: validatorAdj,
      }),
    [baseline, current, rain, returnFlow, uncPct, validatorAdj],
  );

  const warn = result.netVerifiedConservationAF <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-extrabold" style={{ color: 'var(--dpal-text-primary)' }}>
          Conservation calculator (pilot)
        </h1>
        <Link to="/water-intelligence/colorado-river" className="text-[11px] font-semibold text-cyan-300 hover:underline">
          ← Colorado pilot
        </Link>
      </div>
      <p className="text-[11px] dpal-text-secondary">
        Pilot / Demonstration Mode · 1 VWCU = 1 acre-foot of verified conserved consumptive water use in this demo rule
        set.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block space-y-1 text-[11px]">
          <span className="dpal-text-muted font-semibold">Baseline consumptive use (AF)</span>
          <input
            type="number"
            className="w-full rounded-lg px-2 py-1.5 border dpal-border-subtle bg-transparent"
            style={{ color: 'var(--dpal-text-primary)' }}
            value={baseline}
            onChange={(e) => setBaseline(Number(e.target.value))}
          />
        </label>
        <label className="block space-y-1 text-[11px]">
          <span className="dpal-text-muted font-semibold">Current consumptive use (AF)</span>
          <input
            type="number"
            className="w-full rounded-lg px-2 py-1.5 border dpal-border-subtle bg-transparent"
            style={{ color: 'var(--dpal-text-primary)' }}
            value={current}
            onChange={(e) => setCurrent(Number(e.target.value))}
          />
        </label>
        <label className="block space-y-1 text-[11px]">
          <span className="dpal-text-muted font-semibold">Rainfall adjustment (AF)</span>
          <input
            type="number"
            className="w-full rounded-lg px-2 py-1.5 border dpal-border-subtle bg-transparent"
            style={{ color: 'var(--dpal-text-primary)' }}
            value={rain}
            onChange={(e) => setRain(Number(e.target.value))}
          />
        </label>
        <label className="block space-y-1 text-[11px]">
          <span className="dpal-text-muted font-semibold">Return-flow adjustment (AF)</span>
          <input
            type="number"
            className="w-full rounded-lg px-2 py-1.5 border dpal-border-subtle bg-transparent"
            style={{ color: 'var(--dpal-text-primary)' }}
            value={returnFlow}
            onChange={(e) => setReturnFlow(Number(e.target.value))}
          />
        </label>
        <label className="block space-y-1 text-[11px]">
          <span className="dpal-text-muted font-semibold">Uncertainty buffer (%)</span>
          <input
            type="number"
            className="w-full rounded-lg px-2 py-1.5 border dpal-border-subtle bg-transparent"
            style={{ color: 'var(--dpal-text-primary)' }}
            value={uncPct}
            onChange={(e) => setUncPct(Number(e.target.value))}
          />
        </label>
        <label className="block space-y-1 text-[11px]">
          <span className="dpal-text-muted font-semibold">Validator adjustment (AF)</span>
          <input
            type="number"
            className="w-full rounded-lg px-2 py-1.5 border dpal-border-subtle bg-transparent"
            style={{ color: 'var(--dpal-text-primary)' }}
            value={validatorAdj}
            onChange={(e) => setValidatorAdj(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="rounded-2xl border dpal-border-subtle overflow-hidden" style={{ background: 'var(--dpal-card)' }}>
        <div className="px-4 py-2 text-[10px] font-bold uppercase dpal-text-muted border-b dpal-border-subtle">
          Calculation table
        </div>
        <table className="min-w-full text-[11px]">
          <tbody style={{ color: 'var(--dpal-text-primary)' }}>
            {[
              ['Gross saved AF', result.grossSavedAF.toFixed(2)],
              ['Adjusted saved AF', result.adjustedSavedAF.toFixed(2)],
              ['Uncertainty buffer AF', result.uncertaintyBufferAF.toFixed(2)],
              ['Net verified conservation AF', result.netVerifiedConservationAF.toFixed(2)],
              ['Eligible VWCUs (floor)', String(result.eligibleVWCU)],
            ].map(([k, v]) => (
              <tr key={String(k)} className="border-t dpal-border-subtle">
                <td className="px-4 py-2 dpal-text-muted">{k}</td>
                <td className="px-4 py-2 font-mono text-right">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {warn && (
        <div className="rounded-xl px-3 py-2 text-[11px] border border-red-400/40 bg-red-500/10 text-red-200">
          Net verified conservation is zero or negative with these inputs — do not assert savings or issue units.
        </div>
      )}

      <p className="text-[11px] dpal-text-muted leading-relaxed border-t dpal-border-subtle pt-3">
        Claim-safety: VWCUs are DPAL pilot demonstration units unless accepted by a governing authority, water district,
        exchange, or contract program.
      </p>
    </div>
  );
}
