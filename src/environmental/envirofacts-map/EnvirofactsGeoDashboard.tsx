import React from 'react';
import { useNavigate } from 'react-router-dom';
import EnvirofactsSearchPanel from './EnvirofactsSearchPanel';
import EnvirofactsLayerToggle from './EnvirofactsLayerToggle';
import EnvirofactsMap from './EnvirofactsMap';
import EnvirofactsResultsTable from './EnvirofactsResultsTable';
import EnvirofactsFacilityDrawer from './EnvirofactsFacilityDrawer';
import EnvirofactsEvidenceImportPanel from './EnvirofactsEvidenceImportPanel';
import EnvirofactsApiStatusCard, { type ApiConnectionStatus } from './EnvirofactsApiStatusCard';
import EnvirofactsDataSourcesPanel from './EnvirofactsDataSourcesPanel';
import { searchEnvirofacts } from '../../services/envirofactsService';
import type {
  EnvirofactsEvidencePacket,
  EnvirofactsFilters,
  EnvirofactsLayer,
  EnvirofactsLayerTag,
  EnvirofactsRecord,
  EnvirofactsSearchMeta,
} from '../../types/envirofactsTypes';

const DEFAULT_FILTERS: EnvirofactsFilters = {
  searchMode: 'auto',
  address: '',
  zipCode: '',
  city: '',
  county: '',
  state: '',
  waterBody: '',
  facilityName: '',
  sourceSearch: '',
  environmentalCategory: '',
  page: 1,
  pageSize: 100,
};

const ALL_LAYERS: EnvirofactsLayer[] = ['Air', 'Water', 'Waste', 'Toxics', 'Land', 'Radiation', 'Enforcement', 'Facilities', 'GHG'];

const BANNER_LEGAL =
  'Source: U.S. EPA Envirofacts public data. DPAL uses this as an official public-data baseline for review, comparison, and evidence organization. EPA records do not by themselves prove a violation.';

function effectiveLayerTags(row: EnvirofactsRecord): EnvirofactsLayerTag[] {
  if (row.layerTags.length > 0) return row.layerTags;
  return ['facilities'];
}

function rowMatchesLayer(row: EnvirofactsRecord, layer: EnvirofactsLayer): boolean {
  const tags = effectiveLayerTags(row);
  switch (layer) {
    case 'Air':
      return tags.includes('air');
    case 'Water':
      return tags.includes('water');
    case 'Waste':
      return tags.includes('waste');
    case 'Toxics':
      return tags.includes('toxics');
    case 'Land':
      return tags.includes('landCleanup');
    case 'Radiation':
      return tags.includes('radiation');
    case 'GHG':
      return tags.includes('ghg');
    case 'Facilities':
      return tags.includes('facilities');
    case 'Enforcement':
      return tags.includes('enforcement');
    default:
      return false;
  }
}

function toEvidencePacket(record: EnvirofactsRecord): EnvirofactsEvidencePacket {
  return {
    source: 'EPA Envirofacts',
    sourceUrl: 'https://www.epa.gov/enviro/envirofacts-data-service-api',
    apiBase: 'https://data.epa.gov/efservice/',
    epaTable: 'lookups.mv_new_geo_best_picks',
    recordId: record.recordId || record.id,
    facilityName: record.facilityName || record.recordName,
    address: record.address,
    city: record.city,
    county: record.county,
    state: record.state,
    zip: record.zip,
    latitude: record.latitude,
    longitude: record.longitude,
    sourceFlags: record.sourceFlags,
    environmentalCategory: record.environmentalCategory,
    importedAt: new Date().toISOString(),
    dpalStatus: 'Official Public Record Imported',
    confidence: 'Official public-data baseline',
    legalNote: 'EPA data is used as an official public-data baseline and does not by itself prove a violation.',
  };
}

type CacheEntry = {
  key: string;
  rows: EnvirofactsRecord[];
  meta: EnvirofactsSearchMeta | null;
  source: 'live' | 'mock';
  legalNotice: string;
};

const EnvirofactsGeoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState(DEFAULT_FILTERS);
  const [rows, setRows] = React.useState<EnvirofactsRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<'live' | 'mock'>('live');
  const [legalNotice, setLegalNotice] = React.useState('');
  const [meta, setMeta] = React.useState<EnvirofactsSearchMeta | null>(null);
  const [lastLiveMeta, setLastLiveMeta] = React.useState<EnvirofactsSearchMeta | null>(null);
  const [activeLayers, setActiveLayers] = React.useState<EnvirofactsLayer[]>(ALL_LAYERS);
  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [evidenceRecords, setEvidenceRecords] = React.useState<EnvirofactsEvidencePacket[]>([]);
  const [searchCache, setSearchCache] = React.useState<CacheEntry[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);

  const drawerRecord = React.useMemo(() => rows.find((entry) => entry.id === drawerId) ?? null, [rows, drawerId]);

  const layerFiltered = React.useMemo(
    () => rows.filter((row) => activeLayers.some((layer) => rowMatchesLayer(row, layer))),
    [rows, activeLayers],
  );

  const runSearch = React.useCallback(
    async (nextFilters: EnvirofactsFilters) => {
      setHasSearched(true);
      const cacheKey = JSON.stringify(nextFilters);
      const cached = searchCache.find((entry) => entry.key === cacheKey);
      if (cached) {
        setRows(cached.rows);
        setMeta(cached.meta);
        setSource(cached.source);
        setLegalNotice(cached.legalNotice);
        if (cached.source === 'live' && cached.meta) setLastLiveMeta(cached.meta);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await searchEnvirofacts(nextFilters);
        setRows(response.rows);
        setMeta(response.meta);
        setSource(response.source);
        setLegalNotice(response.legalNotice);
        if (response.source === 'live' && response.meta) setLastLiveMeta(response.meta);
        setSearchCache((prev) =>
          [
            {
              key: cacheKey,
              rows: response.rows,
              meta: response.meta,
              source: response.source,
              legalNotice: response.legalNotice,
            },
            ...prev,
          ].slice(0, 8),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed.');
        setRows([]);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    },
    [searchCache],
  );

  const applyChip = (patch: Partial<EnvirofactsFilters>) => {
    const merged: EnvirofactsFilters = { ...DEFAULT_FILTERS, ...patch, page: 1 };
    setFilters(merged);
    void runSearch(merged);
  };

  const toggleLayer = (layer: EnvirofactsLayer) => {
    setActiveLayers((prev) => (prev.includes(layer) ? prev.filter((item) => item !== layer) : [...prev, layer]));
  };

  const addEvidence = (id: string) => {
    const record = rows.find((entry) => entry.id === id);
    if (!record) return;
    setEvidenceRecords((prev) => [toEvidencePacket(record), ...prev]);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setRows([]);
    setMeta(null);
    setSource('live');
    setLegalNotice('');
    setError(null);
    setHasSearched(false);
    setDrawerId(null);
  };

  const apiStatus: ApiConnectionStatus = loading
    ? 'loading'
    : error
      ? 'error'
      : source === 'mock'
        ? 'fallback'
        : meta
          ? 'connected'
          : hasSearched
            ? 'connected'
            : 'idle';

  const pinnableInResults = rows.filter((r) => r.pinnable).length;
  const mapNoCoord = layerFiltered.filter((r) => !r.pinnable).length;

  const onWorkflowPlaceholder = React.useCallback((_id: string) => {
    void _id;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-[1680px] px-4 pb-24 pt-6 md:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">DPAL Environmental Intelligence</p>
        <div className="mt-3 inline-flex rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-xs">
          <button
            type="button"
            onClick={() => navigate('/environmental-intelligence/epa-ghg')}
            className="rounded-md px-3 py-1.5 font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            EPA GHG Intelligence
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 font-semibold text-slate-100"
          >
            Envirofacts Geo Intelligence
          </button>
        </div>

        <header className="mt-5 border-b border-slate-800/90 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">Envirofacts Geo Intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Official EPA environmental records mapped into DPAL evidence review.
          </p>
        </header>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-sm leading-relaxed text-slate-300 md:px-5">
          <p className="font-medium text-slate-100">{BANNER_LEGAL}</p>
          {legalNotice && legalNotice !== BANNER_LEGAL ? <p className="mt-2 text-xs text-slate-500">{legalNotice}</p> : null}
          <p className="mt-3 text-xs text-slate-500">
            Use neutral review language: Official EPA Record, Public Data Baseline, Review Needed, Evidence Gap, Potential Agency Follow-Up,
            Verification Needed. Do not label facilities as guilty, illegal, polluter, or violator unless the underlying EPA record itself states an
            enforcement outcome.
          </p>
        </section>

        <div className="mt-6 space-y-6">
          <EnvirofactsSearchPanel
            filters={filters}
            onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
            onSearch={() => void runSearch({ ...filters, page: 1 })}
            onClear={clearFilters}
            onChip={applyChip}
          />

          <EnvirofactsApiStatusCard status={apiStatus} meta={meta} lastLiveMeta={lastLiveMeta} errorMessage={error} />

          <EnvirofactsMap
            rows={layerFiltered}
            onOpen={setDrawerId}
            onAddEvidence={addEvidence}
            noCoordinateCount={mapNoCoord}
            recordCount={layerFiltered.length}
            onCompareSatellite={onWorkflowPlaceholder}
            onCreateInvestigation={onWorkflowPlaceholder}
          />

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4 md:px-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Layer visibility</h2>
            <p className="mt-1 text-xs text-slate-500">
              Uses normalized EPA program flags (Air, Water, Waste, TRI, land programs, radiation, GHG, registry, and enforcement cues where
              present).
            </p>
            <div className="mt-3">
              <EnvirofactsLayerToggle activeLayers={activeLayers} onToggle={toggleLayer} />
            </div>
          </section>

          {loading ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">Loading EPA Envirofacts…</p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-900/40 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
              EPA Envirofacts could not be reached right now. The page is showing a safe error state. Try again or check the API connection.
            </p>
          ) : null}

          {!loading && source === 'mock' ? (
            <p className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-xs text-amber-100">
              Mock fallback data — not live EPA data. {error ? '' : 'The service returned an error or blocked the request; review the status card for the attempted URL.'}
            </p>
          ) : null}

          {!loading && !error && hasSearched && rows.length === 0 && source === 'live' ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              No EPA records found for this exact search. Try starting broader with ZIP, city, county, or state.
            </p>
          ) : null}

          {!loading && !error && hasSearched && rows.length > 0 && pinnableInResults === 0 ? (
            <p className="rounded-xl border border-amber-900/35 bg-amber-950/15 px-4 py-3 text-sm text-amber-100/95">
              EPA returned official records, but none include valid latitude/longitude, so they cannot be pinned on the map. They are still listed
              below.
            </p>
          ) : null}

          {!loading && !error && hasSearched && rows.length > 0 && layerFiltered.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              No rows match the active layer filters. Turn layers back on or adjust the search.
            </p>
          ) : null}

          {!hasSearched && !loading ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
              Use the search panel or quick examples to query official EPA Envirofacts records. Start broad, then narrow by program flags or facility name.
            </p>
          ) : null}

          {hasSearched && !loading && !error ? (
            <p className="text-xs text-slate-500">
              Layer filter: showing {layerFiltered.length} of {rows.length} records from the last response.
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="space-y-6 xl:col-span-3">
              {hasSearched && !loading && layerFiltered.length > 0 ? (
                <EnvirofactsResultsTable
                  rows={layerFiltered}
                  onOpen={setDrawerId}
                  onAddEvidence={addEvidence}
                  onCompareSatellite={onWorkflowPlaceholder}
                  onCreateInvestigation={onWorkflowPlaceholder}
                />
              ) : null}
            </div>
            <div className="xl:col-span-2">
              <EnvirofactsEvidenceImportPanel records={evidenceRecords} />
            </div>
          </div>

          <EnvirofactsDataSourcesPanel />
        </div>
      </div>

      <EnvirofactsFacilityDrawer record={drawerRecord} open={Boolean(drawerRecord)} onClose={() => setDrawerId(null)} onAddEvidence={addEvidence} />
    </div>
  );
};

export default EnvirofactsGeoDashboard;
