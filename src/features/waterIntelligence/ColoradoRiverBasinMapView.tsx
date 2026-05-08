import React from 'react';
import BasinMapPlaceholder from './components/BasinMapPlaceholder';
import MapSourceGuidanceCard from './components/MapSourceGuidanceCard';
import RouteBreadcrumbHeader from './components/RouteBreadcrumbHeader';

export default function ColoradoRiverBasinMapView(): React.ReactElement {
  return (
    <div className="space-y-4">
      <RouteBreadcrumbHeader title="Colorado River basin map" currentPageLabel="Basin Map" />
      <BasinMapPlaceholder />
      <MapSourceGuidanceCard variant="colorado" />
    </div>
  );
}
