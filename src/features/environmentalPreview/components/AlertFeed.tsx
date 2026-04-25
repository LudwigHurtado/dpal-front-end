import React from 'react';
import type { AlertItem } from '../types';

const severityStyles = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-700',
} as const;

interface AlertFeedProps {
  alerts: AlertItem[];
}

const AlertFeed: React.FC<AlertFeedProps> = ({ alerts }) => {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Alert Feed</h3>
        <span className="text-xs text-slate-500">{alerts.length} active events</span>
      </div>
      <div className="mt-3 space-y-3 max-h-[460px] overflow-auto pr-1">
        {alerts.map((alert) => (
          <article key={alert.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-slate-900 text-sm">{alert.title}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${severityStyles[alert.severity]}`}>{alert.severity.toUpperCase()}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">{alert.location}</p>
            <p className="text-xs text-slate-500 mt-1">{alert.time} • {alert.id}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AlertFeed;
