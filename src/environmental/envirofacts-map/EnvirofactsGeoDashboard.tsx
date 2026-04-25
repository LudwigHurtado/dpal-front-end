import React from 'react';
import EnvirofactsSearchPanel from './EnvirofactsSearchPanel';
import EnvirofactsLayerToggle from './EnvirofactsLayerToggle';
import EnvirofactsMap from './EnvirofactsMap';
import EnvirofactsResultsTable from './EnvirofactsResultsTable';
import EnvirofactsFacilityDrawer from './EnvirofactsFacilityDrawer';
import EnvirofactsEvidenceImportPanel from './EnvirofactsEvidenceImportPanel';
import { searchEnvirofacts } from '../../services/envirofactsService';
import { useNavigate } from 'react-router-dom';
import type {
  EnvirofactsEvidenceRecord,
  EnvirofactsFilters,
  EnvirofactsLayer,
  EnvirofactsRecord,
} from '../../types/envirofactsTypes';

const DEFAULT_FILTERS: EnvirofactsFilters = {
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
  pageSize: 30,
};

const LEGAL_NOTE =
  'EPA data is used as official public data baseline and does not by itself prove a violation.';

function toEvidence(record: EnvirofactsRecord): EnvirofactsEvidenceRecord {
  return {
    source: 'EPA Envirofacts',
    epaTableSource: record.sourceTable,
    recordId: record.recordId || record.id,
    facilityName: record.facilityName || record.recordName,
    address: record.address,
    city: record.city,
    county: record.county,
    state: record.state,
    zip: record.zip,
    latitude: record.latitude,
    longitude: record.longitude,
    environmentalMediaCategory: record.environmentalCategory,
    sourceFlags: record.sourceFlags,
    importedAtIso: new Date().toISOString(),
    dpalStatus: 'Official Public Record Imported',
    legalNote: LEGAL_NOTE,
  };
}

const EnvirofactsGeoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState(DEFAULT_FILTERS);
  const [rows, setRows] = React.useState<EnvirofactsRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<'live' | 'mock'>('live');
  const [legalNotice, setLegalNotice] = React.useState('');
  const [activeLayers, setActiveLayers] = React.useState<EnvirofactsLayer[]>([
    'Air',
    'Water',
    'Waste',
    'Toxics',
    'Land',
    'Radiation',
    'Enforcement',
    'Facilities',
  ]);
  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [evidenceRecords, setEvidenceRecords] = React.useState<EnvirofactsEvidenceRecord[]>([]);
  const [searchCache, setSearchCache] = React.useState<Array<{ key: string; rows: EnvirofactsRecord[] }>>([]);

  const drawerRecord = React.useMemo(() => rows.find((entry) => entry.id === drawerId) ?? null, [rows, drawerId]);

  const runSearch = React.useCallback(
    async (nextFilters: EnvirofactsFilters) => {
      const cacheKey = JSON.stringify(nextFilters);
      const cached = searchCache.find((entry) => entry.key === cacheKey);
      if (cached) {
        setRows(cached.rows);
        setSource('live');
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await searchEnvirofacts(nextFilters);
        setRows(response.rows);
        setSource(response.source);
        setLegalNotice(response.legalNotice);
        setSearchCache((prev) => [{ key: cacheKey, rows: response.rows }, ...prev].slice(0, 8));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search Envirofacts.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [searchCache],
  );

  React.useEffect(() => {
    void runSearch(DEFAULT_FILTERS);
  }, [runSearch]);

  const toggleLayer = (layer: EnvirofactsLayer) => {
    setActiveLayers((prev) => (prev.includes(layer) ? prev.filter((item) => item !== layer) : [...prev, layer]));
  };

  const visibleRows = rows.filter((row) => {
    if (activeLayers.includes('Facilities')) return true;
    return activeLayers.some((layer) => row.environmentalCategory.toLowerCase().includes(layer.toLowerCase()));
  });

  const addEvidence = (id: string) => {
    const record = rows.find((entry) => entry.id === id);
    if (!record) return;
    setEvidenceRecords((prev) => [toEvidence(record), ...prev]);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    void runSearch(DEFAULT_FILTERS);
  };

  return (
    <div className="mx-auto max-w-[1450px] px-4 pb-24 pt-6">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">DPAL Environmental Intelligence</p>
      <div className="mt-2 inline-flex rounded-lg border border-slate-700 bg-slate-900/80 p-1 text-xs">
        <button
          type="button"
          onClick={() => navigate('/environmental-intelligence/epa-ghg')}
          className="rounded-md px-3 py-1 font-semibold text-slate-300 hover:bg-slate-800"
        >
          EPA GHG Intelligence
        </button>
        <button type="button" className="rounded-md border border-cyan-500/60 bg-cyan-900/30 px-3 py-1 font-semibold text-cyan-100">
          Envirofacts Geo Intelligence
        </button>
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Envirofacts Geo Intelligence</h1>
      <p className="mt-1 text-sm text-slate-300">Live EPA Envirofacts geographic search and mapping for evidence-ready public accountability analysis.</p>

      <section className="mt-4 rounded-2xl border border-cyan-700/60 bg-cyan-950/30 p-4 text-sm text-cyan-50">
        <p className="font-bold">Official EPA Record · Public Data Baseline</p>
        <p className="mt-1">{legalNotice || 'DPAL uses EPA Envirofacts records as official public baseline data and not as accusations.'}</p>
        <p className="mt-1 text-xs">Never label a facility as guilty unless official enforcement records explicitly establish that finding. Use: Verification Needed, Evidence Gap, High Priority Review, Agency Follow-Up Needed.</p>
      </section>

      <div className="mt-4">
        <EnvirofactsSearchPanel
          filters={filters}
          onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
          onSearch={() => void runSearch({ ...filters, page: 1 })}
          onClear={clearFilters}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 md:p-5">
        <p className="mb-2 text-xs font-semibold text-slate-200">Layer toggles</p>
        <EnvirofactsLayerToggle activeLayers={activeLayers} onToggle={toggleLayer} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <EnvirofactsMap rows={visibleRows} onOpen={setDrawerId} onAddEvidence={addEvidence} />
        </div>
        <EnvirofactsEvidenceImportPanel records={evidenceRecords} />
      </div>

      <div className="mt-4">
        {loading ? <p className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">Loading Envirofacts records...</p> : null}
        {error ? <p className="rounded-xl border border-rose-700 bg-rose-950/40 p-3 text-sm text-rose-100">{error}</p> : null}
        {!loading && !error && source === 'mock' ? <p className="mb-3 rounded-xl border border-amber-700 bg-amber-950/35 p-3 text-xs text-amber-100">Live API unavailable. Showing clearly labeled mock fallback data.</p> : null}
        {!loading && !error && visibleRows.length === 0 ? <p className="rounded-xl border border-amber-700 bg-amber-950/35 p-3 text-sm text-amber-100">No records found for this search and layer selection.</p> : null}
        {!loading && !error && visibleRows.length > 0 ? <EnvirofactsResultsTable rows={visibleRows} onOpen={setDrawerId} onAddEvidence={addEvidence} /> : null}
      </div>

      <EnvirofactsFacilityDrawer record={drawerRecord} open={Boolean(drawerRecord)} onClose={() => setDrawerId(null)} />
    </div>
  );
};

export default EnvirofactsGeoDashboard;
