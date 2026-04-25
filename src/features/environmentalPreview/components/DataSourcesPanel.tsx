import React from 'react';
import type { DataSourceItem } from '../types';

interface DataSourcesPanelProps {
  sources: DataSourceItem[];
}

const DataSourcesPanel: React.FC<DataSourcesPanelProps> = ({ sources }) => {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="font-semibold text-slate-900">Data Sources</h3>
      <div className="mt-3 space-y-2">
        {sources.map((source) => (
          <div key={source.name} className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-medium text-slate-900">{source.name}</p>
            <p className="text-slate-600 mt-1">{source.type}</p>
            <p className="text-xs text-slate-500 mt-1">
              Freshness: {source.freshness} | Confidence: {source.confidence}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DataSourcesPanel;
