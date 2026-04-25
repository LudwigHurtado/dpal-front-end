import React from 'react';
import PreviewShell from './components/PreviewShell';
import MetricCard from './components/MetricCard';
import MapPlaceholder from './components/MapPlaceholder';
import AlertFeed from './components/AlertFeed';
import { alertFeed, commandCenterMetrics } from './mockData';

interface EnvironmentalCommandCenterProps {
  activePath: string;
  onNavigatePath: (path: string) => void;
}

const quickActions = ['Run Audit', 'Open Investigation', 'Upload Dataset', 'Generate Report'];

const EnvironmentalCommandCenter: React.FC<EnvironmentalCommandCenterProps> = ({ activePath, onNavigatePath }) => {
  return (
    <PreviewShell
      title="DPAL Command Center"
      subtitle="Preview sandbox for enterprise environmental operations layout."
      activePath={activePath}
      onNavigatePath={onNavigatePath}
    >
      <section className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        {commandCenterMetrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} trend={metric.trend} />
        ))}
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
        <MapPlaceholder className="2xl:col-span-2" />
        <AlertFeed alerts={alertFeed} />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-semibold text-slate-900">Quick Actions</h3>
        <p className="text-sm text-slate-600 mt-1">Launch common analyst workflows for preview scenarios.</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {quickActions.map((action) => (
            <button key={action} type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white hover:bg-slate-50">
              {action}
            </button>
          ))}
        </div>
      </section>
    </PreviewShell>
  );
};

export default EnvironmentalCommandCenter;
