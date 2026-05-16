import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader, Search } from '../../../components/icons';
import EnvironmentalDashboardShell from '../environmentalIntelligence/shared/EnvironmentalDashboardShell';
import EnvironmentalDisclaimerBar from '../environmentalIntelligence/shared/EnvironmentalDisclaimerBar';
import {
  estimateClimatiqEmissions,
  getClimatiqHealth,
  searchClimatiqFactors,
  unitTypeToParameterKeys,
  type ClimatiqEstimateData,
  type ClimatiqSearchFactor,
} from '../../services/climatiqApi';

const CLIMATIQ_DISCLAIMER =
  'Climatiq provides the emissions calculation. DPAL stores the result as evidence, source trail, validator review, and blockchain-backed accountability record.';

type Props = {
  onReturn: () => void;
};

function formatNotices(notices: unknown[] | undefined): string[] {
  if (!Array.isArray(notices)) return [];
  return notices
    .map((n) => {
      if (typeof n === 'string') return n;
      if (n && typeof n === 'object') {
        const o = n as Record<string, unknown>;
        const msg = o.message ?? o.text ?? o.description;
        if (typeof msg === 'string' && msg.trim()) return msg;
        return JSON.stringify(n);
      }
      return null;
    })
    .filter((x): x is string => Boolean(x));
}

const ClimatiqEmissionsCalculatorPage: React.FC<Props> = ({ onReturn }) => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [dataVersion, setDataVersion] = useState('^21');

  const [searchQuery, setSearchQuery] = useState('electricity');
  const [regionFilter, setRegionFilter] = useState('');
  const [factors, setFactors] = useState<ClimatiqSearchFactor[]>([]);
  const [selected, setSelected] = useState<ClimatiqSearchFactor | null>(null);

  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('kWh');

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimateResult, setEstimateResult] = useState<ClimatiqEstimateData | null>(null);

  const paramKeys = useMemo(
    () => unitTypeToParameterKeys(selected?.unit_type),
    [selected?.unit_type],
  );

  useEffect(() => {
    void getClimatiqHealth().then((h) => {
      if (!h) {
        setConfigured(false);
        return;
      }
      setConfigured(h.configured);
      if (h.dataVersion) setDataVersion(h.dataVersion);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    const keys = unitTypeToParameterKeys(selected.unit_type);
    setUnit(keys.defaultUnit);
  }, [selected]);

  const runSearch = useCallback(async () => {
    setSearchLoading(true);
    setSearchError(null);
    setEstimateResult(null);
    setEstimateError(null);
    try {
      const res = await searchClimatiqFactors({
        query: searchQuery.trim() || 'electricity',
        region: regionFilter.trim() || undefined,
        results_per_page: '12',
      });
      if (!res.ok) {
        setFactors([]);
        setSelected(null);
        setSearchError(res.error);
        return;
      }
      const list = res.data.results ?? [];
      setFactors(list);
      setSelected(list[0] ?? null);
      if (list.length === 0) {
        setSearchError('No emission factors matched this search. Try a broader query or region.');
      }
    } catch (err) {
      setFactors([]);
      setSelected(null);
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, regionFilter]);

  useEffect(() => {
    if (configured !== true) return;
    void runSearch();
  }, [configured]); // eslint-disable-line react-hooks/exhaustive-deps -- initial load when API is ready

  const runEstimate = useCallback(async () => {
    if (!selected?.activity_id) {
      setEstimateError('Select an emission factor from the results list.');
      return;
    }
    const qty = Number.parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setEstimateError('Enter a positive quantity.');
      return;
    }
    const keys = unitTypeToParameterKeys(selected.unit_type);
    const parameters: Record<string, string | number> = {
      [keys.valueKey]: qty,
    };
    if (keys.unitKey && unit.trim()) {
      parameters[keys.unitKey] = unit.trim();
    }

    setEstimateLoading(true);
    setEstimateError(null);
    try {
      const res = await estimateClimatiqEmissions({
        emission_factor: {
          activity_id: selected.activity_id,
          region: selected.region,
          data_version: dataVersion,
        },
        parameters,
      });
      if (!res.ok) {
        setEstimateResult(null);
        setEstimateError(res.error);
        return;
      }
      setEstimateResult(res.data);
    } catch (err) {
      setEstimateResult(null);
      setEstimateError(err instanceof Error ? err.message : 'Estimate failed');
    } finally {
      setEstimateLoading(false);
    }
  }, [selected, quantity, unit, dataVersion]);

  const notices = formatNotices(estimateResult?.notices);

  return (
    <EnvironmentalDashboardShell className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 px-4 py-4 md:px-6">
        <button
          type="button"
          onClick={onReturn}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Environmental Intelligence Hub
        </button>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Climatiq Emissions Calculator</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Search official emission factors and estimate kgCO₂e through the DPAL backend proxy — your Climatiq API key
          never leaves the server.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full border px-2.5 py-1 font-semibold ${
              configured === true
                ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
                : configured === false
                  ? 'border-amber-500/40 bg-amber-950/50 text-amber-200'
                  : 'border-slate-600 bg-slate-800 text-slate-300'
            }`}
          >
            {configured === null ? 'Checking API…' : configured ? 'Climatiq configured' : 'Climatiq key not configured on API host'}
          </span>
          <span className="rounded-full border border-slate-600 bg-slate-900 px-2.5 py-1 text-slate-300">
            Data version: {dataVersion}
          </span>
        </div>
      </header>

      <EnvironmentalDisclaimerBar tone="deep" className="border-b border-slate-800">
        {CLIMATIQ_DISCLAIMER}
      </EnvironmentalDisclaimerBar>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-5">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Search activity</h2>
            <label className="mt-3 block text-xs font-medium text-slate-300" htmlFor="climatiq-search-query">
              Activity query
            </label>
            <input
              id="climatiq-search-query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
              placeholder="e.g. electricity, diesel, flight"
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <label className="mt-3 block text-xs font-medium text-slate-300" htmlFor="climatiq-region">
              Region (optional)
            </label>
            <input
              id="climatiq-region"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              placeholder="e.g. US, GB, DE"
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button
              type="button"
              disabled={searchLoading || configured === false}
              onClick={() => void runSearch()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searchLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search factors
            </button>
            {configured === false ? (
              <p className="mt-3 text-xs text-amber-200">
                Set <code className="text-amber-100">CLIMATIQ_API_KEY</code> on the DPAL API host (Railway / local backend)
                and redeploy. Do not use VITE_ variables.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Factor results</h2>
            {searchLoading ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <Loader className="h-4 w-4 animate-spin" />
                Loading emission factors…
              </p>
            ) : null}
            {searchError && !searchLoading ? (
              <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
                {searchError}
              </p>
            ) : null}
            {!searchLoading && !searchError && factors.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No results yet. Run a search to list emission factors.</p>
            ) : null}
            <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {factors.map((f) => {
                const active = selected?.activity_id === f.activity_id && selected?.region === f.region;
                return (
                  <li key={`${f.activity_id}-${f.region ?? ''}-${f.year ?? ''}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(f);
                        setEstimateResult(null);
                        setEstimateError(null);
                      }}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? 'border-teal-500/60 bg-teal-950/40 text-teal-50'
                          : 'border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      <p className="font-semibold leading-snug">{f.name || f.activity_id}</p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">{f.activity_id}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {[f.region, f.year, f.unit_type].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Activity quantity</h2>
            {!selected ? (
              <p className="mt-3 text-sm text-slate-400">Select a factor from the list to enter quantity and unit.</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-slate-400">
                  Selected: <span className="text-slate-200">{selected.name || selected.activity_id}</span>
                  {selected.unit_type ? (
                    <span className="ml-1 text-slate-500">({selected.unit_type})</span>
                  ) : null}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-300" htmlFor="climatiq-qty">
                      Quantity ({paramKeys.valueKey})
                    </label>
                    <input
                      id="climatiq-qty"
                      type="number"
                      min="0"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  {paramKeys.unitKey ? (
                    <div>
                      <label className="text-xs font-medium text-slate-300" htmlFor="climatiq-unit">
                        Unit ({paramKeys.unitKey})
                      </label>
                      <input
                        id="climatiq-unit"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder={paramKeys.defaultUnit}
                        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={estimateLoading || configured === false}
                  onClick={() => void runEstimate()}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {estimateLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
                  Calculate emissions
                </button>
              </>
            )}
            {estimateError ? (
              <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
                {estimateError}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Estimate result</h2>
            {!estimateResult && !estimateLoading ? (
              <p className="mt-3 text-sm text-slate-400">
                Results appear here after you calculate. Example preset: 100 kWh grid electricity residual mix.
              </p>
            ) : null}
            {estimateLoading ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <Loader className="h-4 w-4 animate-spin" />
                Requesting estimate from Climatiq via DPAL…
              </p>
            ) : null}
            {estimateResult ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <ResultItem label="co2e" value={`${estimateResult.co2e} ${estimateResult.co2e_unit}`} highlight />
                <ResultItem label="co2e_unit" value={estimateResult.co2e_unit} />
                <ResultItem
                  label="activity_id"
                  value={estimateResult.emission_factor?.activity_id ?? selected?.activity_id ?? '—'}
                  mono
                />
                <ResultItem label="source" value={estimateResult.emission_factor?.source ?? '—'} />
                <ResultItem label="region" value={String(estimateResult.emission_factor?.region ?? selected?.region ?? '—')} />
                <ResultItem label="year" value={String(estimateResult.emission_factor?.year ?? selected?.year ?? '—')} />
                <ResultItem
                  label="data version"
                  value={estimateResult.emission_factor?.data_version ?? dataVersion}
                />
                {estimateResult.calculation_method ? (
                  <ResultItem label="method" value={estimateResult.calculation_method} />
                ) : null}
              </dl>
            ) : null}
            {notices.length > 0 ? (
              <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200">Notices</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-100/90">
                  {notices.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlaceholderActionCard
              title="DPAL Evidence Packet"
              body="Attach this estimate to a structured evidence packet with source trail and validator gates (coming soon)."
              cta="Create evidence packet"
              disabled
            />
            <PlaceholderActionCard
              title="Blockchain status"
              body="Ready for DPAL evidence hash — anchoring runs after human review and packet finalization."
              cta="Ready for DPAL evidence hash"
              disabled
              accent="emerald"
            />
          </div>
        </section>
      </main>
    </EnvironmentalDashboardShell>
  );
};

function ResultItem({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 ${highlight ? 'sm:col-span-2 border-emerald-500/40' : ''}`}>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm text-slate-100 ${mono ? 'font-mono text-xs break-all' : ''} ${highlight ? 'text-lg font-semibold text-emerald-200' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function PlaceholderActionCard({
  title,
  body,
  cta,
  disabled,
  accent = 'teal',
}: {
  title: string;
  body: string;
  cta: string;
  disabled?: boolean;
  accent?: 'teal' | 'emerald';
}) {
  const btn =
    accent === 'emerald'
      ? 'border-emerald-500/50 text-emerald-200'
      : 'border-teal-500/50 text-teal-200';
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{body}</p>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? 'Placeholder — wire to evidence packet flow in a future release' : undefined}
        className={`mt-3 w-full rounded-lg border bg-slate-950/60 px-3 py-2 text-xs font-semibold ${btn} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {cta}
      </button>
    </div>
  );
}

export default ClimatiqEmissionsCalculatorPage;
