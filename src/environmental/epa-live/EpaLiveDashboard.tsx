import React from 'react';
import type { EpaEvidencePacketRecord, EpaFacilityProfile, EpaFilters } from '../../types/epa';
import { fetchEpaFacilityProfiles, fetchEpaGases } from '../../services/epaEnvirofactsService';
import EpaGasFilters from './EpaGasFilters';
import EpaFacilityMap from './EpaFacilityMap';
import EpaFacilityTable from './EpaFacilityTable';
import EpaFacilityDetailDrawer from './EpaFacilityDetailDrawer';
import EpaEvidenceImportPanel from './EpaEvidenceImportPanel';

type Props = {
  onOpenFacilityPage: (facilityId: string, snapshot: EpaFacilityProfile | null) => void;
};

const DEFAULT_FILTERS: EpaFilters = {
  state: '',
  city: '',
  county: '',
  zip: '',
  facilityName: '',
  parentCompany: '',
  year: '',
  gas: '',
  industryType: '',
  page: 1,
  pageSize: 25,
};

function buildEvidenceRecord(profile: EpaFacilityProfile): EpaEvidencePacketRecord {
  const facility = profile.facility;
  return {
    source: 'U.S. EPA Envirofacts / GHGRP',
    importedAtIso: new Date().toISOString(),
    facilityId: facility.facilityId,
    facilityName: facility.facilityName,
    parentCompany: facility.parentCompany,
    address: [facility.address1, facility.address2].filter(Boolean).join(', '),
    city: facility.city,
    county: facility.county,
    state: facility.state,
    zip: facility.zip,
    latitude: facility.latitude,
    longitude: facility.longitude,
    reportedEmissionsCo2e: profile.emissions.totalCo2e,
    gasLabel: profile.emissions.byGas.map((entry) => entry.gasCode || entry.gasName).join(', '),
    reportingYear: profile.emissions.reportingYears[0] ?? facility.year,
    status: 'Official EPA Record Imported',
  };
}

const EpaLiveDashboard: React.FC<Props> = ({ onOpenFacilityPage }) => {
  const [filters, setFilters] = React.useState<EpaFilters>(DEFAULT_FILTERS);
  const [rows, setRows] = React.useState<EpaFacilityProfile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = React.useState<'live' | 'mock'>('live');
  const [legalNotice, setLegalNotice] = React.useState('');
  const [gasOptions, setGasOptions] = React.useState<string[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = React.useState<string | null>(null);
  const [importedRecords, setImportedRecords] = React.useState<EpaEvidencePacketRecord[]>([]);

  const selectedProfile = React.useMemo(
    () => rows.find((entry) => entry.facility.facilityId === selectedFacilityId) ?? null,
    [rows, selectedFacilityId],
  );

  const loadData = React.useCallback(async (currentFilters: EpaFilters) => {
    setLoading(true);
    setError(null);
    try {
      const [response, gases] = await Promise.all([
        fetchEpaFacilityProfiles(currentFilters),
        fetchEpaGases(),
      ]);
      setRows(response.rows);
      setSourceLabel(response.source);
      setLegalNotice(response.legalNotice);
      setGasOptions(
        gases
          .map((entry) => entry.gasCode || entry.gasName || entry.gasLabel)
          .filter(Boolean),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load EPA data.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData(DEFAULT_FILTERS);
  }, [loadData]);

  const handleChange = (next: Partial<EpaFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const handleSearch = () => {
    const next = { ...filters, page: 1 };
    setFilters(next);
    void loadData(next);
  };

  const handleAddToPacket = (profile: EpaFacilityProfile) => {
    setImportedRecords((prev) => [buildEvidenceRecord(profile), ...prev]);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-6">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">DPAL Environmental Intelligence</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-white">EPA Live GHG Intelligence</h1>
      <p className="mt-1 text-sm text-slate-300">Official EPA greenhouse gas facility data connected to DPAL evidence review.</p>

      <section className="mt-4 rounded-2xl border border-cyan-700/60 bg-cyan-950/35 p-4 text-sm text-cyan-50">
        <p className="font-bold">Official EPA Data Layer</p>
        <p className="mt-1">
          This page displays publicly available EPA Envirofacts / GHGRP data. DPAL uses this as an official reporting baseline and compares it with satellite, permit, inspection, and community evidence.
        </p>
        <p className="mt-2 text-xs">{legalNotice || 'Source: U.S. EPA Envirofacts / GHGRP public data. DPAL uses this as an official reporting baseline, not as an accusation.'}</p>
        <p className="mt-1 text-xs">DPAL Risk Flags are analytical indicators only and require verification before public accusation or enforcement referral.</p>
      </section>

      <div className="mt-4">
        <EpaGasFilters filters={filters} gasOptions={gasOptions} onChange={handleChange} onSearch={handleSearch} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <EpaFacilityMap rows={rows} onOpenFacility={setSelectedFacilityId} />
        </div>
        <EpaEvidenceImportPanel importedRecords={importedRecords} />
      </div>

      <div className="mt-4">
        {loading ? <p className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">Loading EPA records...</p> : null}
        {error ? <p className="rounded-xl border border-rose-700 bg-rose-950/40 p-3 text-sm text-rose-100">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="rounded-xl border border-amber-700 bg-amber-950/35 p-3 text-sm text-amber-100">No records found for the selected filters.</p>
        ) : null}
        {!loading && !error && rows.length > 0 ? (
          <>
            {sourceLabel === 'mock' ? (
              <p className="mb-3 rounded-xl border border-amber-700 bg-amber-950/35 p-3 text-xs text-amber-100">Live EPA API unavailable. Showing clearly labeled mock fallback data.</p>
            ) : null}
            <EpaFacilityTable rows={rows} onOpenFacility={setSelectedFacilityId} onAddToPacket={handleAddToPacket} />
          </>
        ) : null}
      </div>

      <EpaFacilityDetailDrawer
        open={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedFacilityId(null)}
        onOpenFacilityPage={(facilityId) => onOpenFacilityPage(facilityId, selectedProfile)}
      />
    </div>
  );
};

export default EpaLiveDashboard;
