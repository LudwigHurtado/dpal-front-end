import React from 'react';
import { Route, Routes } from 'react-router-dom';
import WaterIntelligenceLayout from './WaterIntelligenceLayout';
import WaterIntelligenceLauncher from './WaterIntelligenceLauncher';
import ColoradoRiverExchangePilotView from './ColoradoRiverExchangePilotView';
import ColoradoRiverBasinMapView from './ColoradoRiverBasinMapView';
import AgricultureConservationView from './AgricultureConservationView';
import UrbanConservationView from './UrbanConservationView';
import WaterRightsProtectionView from './WaterRightsProtectionView';
import ConservationCalculatorView from './ConservationCalculatorView';
import WaterEvidencePacketView from './WaterEvidencePacketView';
import VWCURegistryView from './VWCURegistryView';
import WaterTransactionExchangeView from './WaterTransactionExchangeView';
import Club20ProposalBuilder from './Club20ProposalBuilder';
import PublicWaterVerificationView from './PublicWaterVerificationView';
import WaterSituationRoomPlaceholder from './WaterSituationRoomPlaceholder';
import CreateProjectPlaceholder from './CreateProjectPlaceholder';
import InvestorDemoPlaceholder from './InvestorDemoPlaceholder';

/** Route config metadata for documentation / tests — paths are relative to `/water-intelligence`. */
export const waterIntelligenceRouteObjects = [
  { path: '', label: 'Water Intelligence home' },
  { path: 'colorado-river', label: 'Colorado River exchange pilot' },
  { path: 'basin-map', label: 'Basin map' },
  { path: 'agriculture', label: 'Agriculture conservation' },
  { path: 'urban', label: 'Urban conservation' },
  { path: 'water-rights', label: 'Water rights protection' },
  { path: 'calculator', label: 'Conservation calculator' },
  { path: 'evidence', label: 'Evidence packets' },
  { path: 'registry', label: 'VWCU registry' },
  { path: 'exchange', label: 'Transaction exchange' },
  { path: 'club20', label: 'Club 20 proposal builder' },
  { path: 'public/:recordId', label: 'Public verification' },
  { path: 'situation/:projectId', label: 'Situation room placeholder' },
  { path: 'create-project', label: 'Create project placeholder' },
  { path: 'investor', label: 'Investor demo placeholder' },
] as const;

export default function WaterIntelligenceRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route element={<WaterIntelligenceLayout />}>
        <Route index element={<WaterIntelligenceLauncher />} />
        <Route path="colorado-river" element={<ColoradoRiverExchangePilotView />} />
        <Route path="basin-map" element={<ColoradoRiverBasinMapView />} />
        <Route path="agriculture" element={<AgricultureConservationView />} />
        <Route path="urban" element={<UrbanConservationView />} />
        <Route path="water-rights" element={<WaterRightsProtectionView />} />
        <Route path="calculator" element={<ConservationCalculatorView />} />
        <Route path="evidence" element={<WaterEvidencePacketView />} />
        <Route path="registry" element={<VWCURegistryView />} />
        <Route path="exchange" element={<WaterTransactionExchangeView />} />
        <Route path="club20" element={<Club20ProposalBuilder />} />
        <Route path="public/:recordId" element={<PublicWaterVerificationView />} />
        <Route path="situation/:projectId" element={<WaterSituationRoomPlaceholder />} />
        <Route path="create-project" element={<CreateProjectPlaceholder />} />
        <Route path="investor" element={<InvestorDemoPlaceholder />} />
      </Route>
    </Routes>
  );
}
