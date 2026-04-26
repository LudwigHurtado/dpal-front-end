import React from 'react';
import type { EnvirofactsRecord } from '../../types/envirofactsTypes';

type Props = {
  record: EnvirofactsRecord | null;
  open: boolean;
  onClose: () => void;
  onAddEvidence?: (recordId: string) => void;
  onCenterMap?: (recordId: string) => void;
  onPrepareEchoLookup?: (recordId: string) => void;
  onCompareSatellite?: (recordId: string) => void;
  onCreateInvestigation?: (recordId: string) => void;
  initialTab?: (typeof tabs)[number];
};

const tabs = [
  'EPA Record',
  'Location',
  'Source Systems',
  'Environmental Category',
  'Coordinates / Map Context',
  'Compliance / Enforcement',
  'DPAL Evidence Packet',
  'Satellite Comparison',
  'Investigation Timeline',
] as const;

const tabBtn = (active: boolean) =>
  `rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
    active ? 'border-slate-400 bg-slate-800 text-slate-50' : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
  }`;

const EnvirofactsFacilityDrawer: React.FC<Props> = ({
  record,
  open,
  onClose,
  onAddEvidence,
  onCenterMap,
  onPrepareEchoLookup,
  onCompareSatellite,
  onCreateInvestigation,
  initialTab = 'EPA Record',
}) => {
  const [tab, setTab] = React.useState<(typeof tabs)[number]>('EPA Record');
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) {
      setTab('EPA Record');
      setFeedback(null);
      return;
    }
    setTab(initialTab);
  }, [open, initialTab]);
  if (!open || !record) return null;

  const loc = [record.address, record.city, record.county, record.state, record.zip].filter(Boolean).join(', ');
  const coordinatesText = record.pinnable ? `${record.latitude}, ${record.longitude}` : '';
  const availableSourceBadges = [
    { id: 'Air', match: record.sourceFlags.some((flag) => /air/i.test(flag)) },
    { id: 'Water', match: record.sourceFlags.some((flag) => /water|npdes|pcs/i.test(flag)) },
    { id: 'Waste', match: record.sourceFlags.some((flag) => /waste|rcra|brs/i.test(flag)) },
    { id: 'Toxics', match: record.sourceFlags.some((flag) => /toxic|tri/i.test(flag)) },
    { id: 'Land / Cleanup', match: record.sourceFlags.some((flag) => /land|cleanup|sems|npl|cerclis/i.test(flag)) },
    { id: 'Radiation', match: record.sourceFlags.some((flag) => /radiation|rad/i.test(flag)) },
    { id: 'Enforcement', match: record.sourceFlags.some((flag) => /enforcement/i.test(flag)) || record.enforcementCue },
    { id: 'Facilities', match: record.sourceFlags.some((flag) => /facilit|registry|frs/i.test(flag)) || record.hasRegistryId },
    { id: 'GHG', match: record.sourceFlags.some((flag) => /ghg/i.test(flag)) },
  ].filter((entry) => entry.match);

  const copyCoordinates = async () => {
    if (!coordinatesText) {
      setFeedback('Coordinates unavailable for this record.');
      return;
    }
    try {
      await navigator.clipboard.writeText(coordinatesText);
      setFeedback('Coordinates copied.');
    } catch {
      setFeedback('Copy coordinates failed in this browser.');
    }
  };

  const addEvidencePacket = () => {
    onAddEvidence?.(record.id);
    setFeedback('Evidence packet imported.');
  };

  const runSatelliteComparison = () => {
    onCompareSatellite?.(record.id);
    setFeedback('Satellite comparison workspace is ready for wiring.');
  };

  const runInvestigationDraft = () => {
    onCreateInvestigation?.(record.id);
    setFeedback('Investigation draft created/prepared.');
  };

  const runEchoLookup = () => {
    onPrepareEchoLookup?.(record.id);
    setFeedback(`Prepared ECHO lookup for ${record.recordId || record.facilityName || 'selected record'}.`);
  };

  const centerMapOnRecord = () => {
    if (!record.pinnable) {
      setFeedback('Map centering action ready for wiring.');
      return;
    }
    onCenterMap?.(record.id);
    setFeedback('Map centering action triggered.');
  };

  return (
    <div className="fixed inset-0 z-[140] flex justify-end bg-black/65 p-2 md:p-4" onClick={onClose}>
      <aside className="flex h-full w-[min(520px,95vw)] max-w-full flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-4 md:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Official EPA Record</p>
            <h3 className="mt-1 break-words text-lg font-semibold leading-snug text-slate-50">{record.facilityName || record.recordName}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-300">Public Data Baseline</span>
              {record.pinnable ? (
                <span className="rounded border border-emerald-900/60 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-200/90">Coordinates Available</span>
              ) : (
                <span className="rounded border border-amber-900/50 bg-amber-950/25 px-2 py-0.5 text-[10px] font-medium text-amber-100/90">Coordinates Unavailable</span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-900">
            Close
          </button>
        </div>
        <div className="border-b border-slate-800 px-3 py-2 md:px-4">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((item) => (
              <button key={item} type="button" onClick={() => setTab(item)} className={tabBtn(tab === item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-slate-200 md:px-5">
          {feedback ? (
            <div className="mb-3 rounded-md border border-cyan-800/50 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100">{feedback}</div>
          ) : null}
          {tab === 'EPA Record' ? (
            <div className="space-y-2 text-slate-300">
              <p>
                <span className="text-slate-500">Facility / record:</span> {record.facilityName || record.recordName || 'EPA Record'}
              </p>
              <p>
                <span className="text-slate-500">EPA source:</span> Envirofacts
              </p>
              <p>
                <span className="text-slate-500">Registry / record ID:</span> {record.recordId || 'Not provided'}
              </p>
              <p>
                <span className="text-slate-500">EPA table:</span> <span className="font-mono text-xs">lookups.mv_new_geo_best_picks</span>
              </p>
              <p>
                <span className="text-slate-500">DPAL status:</span> {record.dpalReviewStatus}
              </p>
              <p>
                <span className="text-slate-500">Source URL:</span>{' '}
                <a
                  href="https://www.epa.gov/enviro/envirofacts-data-service-api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 underline decoration-cyan-700 underline-offset-2"
                >
                  EPA Envirofacts Data Service API
                </a>
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                EPA data is used as an official public-data baseline and does not by itself prove a violation.
              </p>
            </div>
          ) : null}
          {tab === 'Location' ? (
            <div className="space-y-2 text-slate-300">
              <p><span className="text-slate-500">Address:</span> {record.address || 'N/A'}</p>
              <p><span className="text-slate-500">City:</span> {record.city || 'N/A'}</p>
              <p><span className="text-slate-500">County:</span> {record.county || 'N/A'}</p>
              <p><span className="text-slate-500">State:</span> {record.state || 'N/A'}</p>
              <p><span className="text-slate-500">ZIP:</span> {record.zip || 'N/A'}</p>
              <p><span className="text-slate-500">Latitude:</span> {record.latitude ?? 'N/A'}</p>
              <p><span className="text-slate-500">Longitude:</span> {record.longitude ?? 'N/A'}</p>
              <p><span className="text-slate-500">Coordinates status:</span> {record.pinnable ? 'Coordinates Available' : 'Coordinates Unavailable'}</p>
              <button
                type="button"
                onClick={copyCoordinates}
                className="rounded-lg border border-slate-500 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
              >
                Copy Coordinates
              </button>
            </div>
          ) : null}
          {tab === 'Source Systems' ? (
            <div className="space-y-2">
              <p className="text-slate-400">Source systems inferred from EPA program flags on this record:</p>
              {availableSourceBadges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableSourceBadges.map((badge) => (
                    <span key={badge.id} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200">
                      {badge.id}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No EPA source flags were detected for this record.</p>
              )}
            </div>
          ) : null}
          {tab === 'Environmental Category' ? (
            <div className="space-y-2 text-slate-300">
              <p><span className="text-slate-500">Normalized category:</span> {record.environmentalCategory || 'Not categorized on this row.'}</p>
              <p><span className="text-slate-500">Layer tags:</span> {record.layerTags.length ? record.layerTags.join(', ') : 'facilities'}</p>
              <p><span className="text-slate-500">DPAL classification:</span> {record.dpalReviewStatus}</p>
              <p className="text-xs text-slate-500">This category is derived from EPA program flags and normalized for DPAL review.</p>
            </div>
          ) : null}
          {tab === 'Coordinates / Map Context' ? (
            <div className="space-y-2 text-slate-300">
              <p><span className="text-slate-500">Latitude:</span> {record.latitude ?? 'N/A'}</p>
              <p><span className="text-slate-500">Longitude:</span> {record.longitude ?? 'N/A'}</p>
              <p><span className="text-slate-500">Pinnable:</span> {record.pinnable ? 'Yes' : 'No'}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={centerMapOnRecord}
                  className="rounded-lg border border-slate-500 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
                >
                  Center Map on Record
                </button>
                <button
                  type="button"
                  onClick={copyCoordinates}
                  className="rounded-lg border border-slate-500 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
                >
                  Copy Coordinates
                </button>
              </div>
              {!record.pinnable ? <p className="text-xs text-slate-500">Map centering action ready for wiring.</p> : null}
            </div>
          ) : null}
          {tab === 'Compliance / Enforcement' ? (
            <div className="space-y-2 text-slate-300">
              <p><span className="text-slate-500">Enforcement cue:</span> {record.enforcementCue ? 'Present' : 'Not detected from this row'}</p>
              <p><span className="text-slate-500">Related flags:</span> {record.sourceFlags.filter((flag) => /enforcement|icis|echo|idea/i.test(flag)).join(', ') || 'None on this row'}</p>
              <p className="text-xs text-slate-500">Compliance and enforcement details require a connected ECHO/IDEA lookup. This record is not automatically a violation.</p>
              <button
                type="button"
                onClick={runEchoLookup}
                className="rounded-lg border border-slate-500 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
              >
                Prepare ECHO Lookup
              </button>
            </div>
          ) : null}
          {tab === 'DPAL Evidence Packet' ? (
            <div className="space-y-3">
              <p className="text-slate-300">Add this row to your local evidence packet for structured review. Nothing is sent to DPAL servers until you wire persistence.</p>
              <pre className="max-h-64 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 text-[10px] leading-relaxed text-slate-400">
{JSON.stringify({
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
}, null, 2)}
              </pre>
              <button
                type="button"
                onClick={addEvidencePacket}
                className="rounded-lg border border-slate-500 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
              >
                Add Official EPA Record to Evidence Packet
              </button>
              <p className="text-xs text-slate-500">EPA data is used as an official public-data baseline and does not by itself prove a violation.</p>
            </div>
          ) : null}
          {tab === 'Satellite Comparison' ? (
            <div className="space-y-3">
              <p className="text-slate-400">Record coordinates: {coordinatesText || 'Unavailable'}</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                <li>True Color</li>
                <li>Thermal anomaly</li>
                <li>Water/land context</li>
                <li>Land-cover change</li>
              </ul>
              <button
                type="button"
                onClick={runSatelliteComparison}
                className="rounded-lg border border-slate-500 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
              >
                Start Satellite Comparison
              </button>
            </div>
          ) : null}
          {tab === 'Investigation Timeline' ? (
            <div className="space-y-3">
              <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-300">
                <li>EPA record selected</li>
                <li>Evidence packet ready</li>
                <li>Satellite comparison pending</li>
                <li>Agency review pending</li>
                <li>DPAL verification pending</li>
              </ol>
              <button
                type="button"
                onClick={runInvestigationDraft}
                className="rounded-lg border border-slate-500 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-white"
              >
                Create Investigation Draft
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
};

export default EnvirofactsFacilityDrawer;
