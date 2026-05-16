import React from 'react';
import { X } from '../../../../components/icons';
import { getConnector, type DmrvConnectorMeta } from '../dmrvRegistry';

export type DmrvConnectorPanelProps = {
  connectorId: string;
  onClose: () => void;
  onOpenRoute?: (meta: DmrvConnectorMeta) => void;
};

export function DmrvConnectorPanel({
  connectorId,
  onClose,
  onOpenRoute,
}: DmrvConnectorPanelProps): React.ReactElement | null {
  const connector = getConnector(connectorId);
  if (!connector) return null;

  const statusLabel = connector.status === 'live' ? 'Live' : 'Planned';

  return (
    <aside
      className="rounded-2xl border border-slate-300 bg-white p-4 shadow-lg"
      aria-label="Connector details"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Connector selected</p>
          <h3 className="mt-1 text-base font-black text-[#1e3a5f]">{connector.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          aria-label="Close connector panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Data type</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{connector.dataType}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</dt>
          <dd className="mt-1">
            <span
              className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                connector.status === 'live'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              {statusLabel}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Next integration step</dt>
          <dd className="mt-0.5 leading-relaxed text-slate-700">{connector.integrationNote}</dd>
        </div>
      </dl>

      {connector.status === 'live' && onOpenRoute ? (
        <button
          type="button"
          onClick={() => onOpenRoute(connector)}
          className="mt-4 w-full rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#152a47]"
        >
          Open in DPAL
        </button>
      ) : (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          This connector is on the integration roadmap. Configure adapters on the API host or use related live modules
          listed in the environmental hub.
        </p>
      )}
    </aside>
  );
}
