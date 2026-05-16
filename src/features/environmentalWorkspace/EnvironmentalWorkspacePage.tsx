import React from 'react';
import { useNavigate } from 'react-router-dom';
import EnvironmentalWorkspaceShell from '../../../layouts/EnvironmentalWorkspaceShell';
import { WorkspaceSection } from '../../../components/platform/WorkspaceSection';
import { WorkspaceToolCard } from '../../../components/platform/WorkspaceToolCard';
import { PlatformCommandBar } from '../../../components/platform/PlatformCommandBar';

export interface EnvironmentalWorkspacePageProps {
  onNavigate: (view: string) => void;
  onNavigatePath?: (path: string) => void;
  onOpenMobileNav?: () => void;
  useMobileLayout?: boolean;
}

export default function EnvironmentalWorkspacePage({
  onNavigate,
  onNavigatePath,
  onOpenMobileNav,
  useMobileLayout,
}: EnvironmentalWorkspacePageProps): React.ReactElement {
  const navigate = useNavigate();
  const goPath = onNavigatePath ?? ((path: string) => navigate(path));
  return (
    <div className="mx-auto max-w-6xl px-1 pb-16 sm:px-2">
      <PlatformCommandBar
        title="Environmental Workspace"
        subtitle="Monitoring, compliance audits, and evidence-grade outputs mapped to DPAL engines."
        onOpenMobileNav={useMobileLayout ? onOpenMobileNav : undefined}
      />

      <EnvironmentalWorkspaceShell>
        <WorkspaceSection
          id="monitoring"
          title="Monitoring & remote sensing"
          description="Live satellite layers, water intelligence, plastics fingerprinting, and forest monitors."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <WorkspaceToolCard
              title="Earth Observation"
              description="LEO screening workspace with scene diagnostics and AOIs."
              badge="Satellite"
              onClick={() => onNavigate('earthObservation')}
            />
            <WorkspaceToolCard
              title="Water Intelligence · AquaScan"
              description="Location-first water command center with Copernicus compare workflows."
              badge="Water"
              onClick={() => onNavigate('aquaScanWater')}
            />
            <WorkspaceToolCard
              title="Plastic Watch"
              description="Hyperspectral plastics intelligence (PACE / EMIT evidence support)."
              badge="Plastics"
              onClick={() => onNavigate('hyperspectralPlasticWatch')}
            />
            <WorkspaceToolCard
              title="Forest Integrity"
              description="Forestry protection dashboard with satellite-backed narratives."
              badge="AFOLU"
              onClick={() => onNavigate('forestIntegrity')}
            />
            <WorkspaceToolCard
              title="Environmental Intelligence Hub"
              description="Legacy orchestration hub — launches specialized engines without losing bookmarks."
              badge="Hub"
              onClick={() => onNavigate('environmentalIntelligenceHub')}
            />
            <WorkspaceToolCard
              title="Air Quality Monitor"
              description="OpenAQ readings plus satellite-linked scans where configured."
              onClick={() => onNavigate('airQualityMonitor')}
            />
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          id="carbon-mrv"
          title="Carbon & MRV bridges"
          description="Connect monitoring outputs to carbon engines and market workflows."
          className="mt-10"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <WorkspaceToolCard
              title="Carbon MRV Engine"
              description="Project intelligence, satellite scans, validator hooks."
              onClick={() => onNavigate('carbonMRV')}
            />
            <WorkspaceToolCard
              title="Carbon Headquarters"
              description="Investor-facing carbon portfolio surfaces."
              onClick={() => onNavigate('dpalCarbon')}
            />
            <WorkspaceToolCard
              title="CarbonPura Workspace"
              description="Partner command center for orchestrating DPAL engines."
              badge="Partner"
              onClick={() => onNavigate('carbonPuraWorkspace')}
            />
            <WorkspaceToolCard
              title="Offsets Marketplace"
              description="Credits, retirement flows, registry storytelling."
              onClick={() => onNavigate('offsetMarketplace')}
            />
            <WorkspaceToolCard
              title="AFOLU Engine"
              description="Forest carbon workflows and mission launches."
              onClick={() => onNavigate('afoluEngine')}
            />
            <WorkspaceToolCard
              title="Carbon Compliance Shell"
              description="CAD Trust readiness, registry connectors, VIU posture."
              badge="New"
              onClick={() => goPath('/dmrv')}
            />
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          id="compliance"
          title="Compliance & audits"
          description="Facility-grade audits with DPAL evidence exports."
          className="mt-10"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <WorkspaceToolCard
              title="Emissions Integrity Audit (EIAS)"
              description="Facility intake + satellite/production reconciliation drafts."
              onClick={() => onNavigate('emissionsIntegrityAudit')}
            />
            <WorkspaceToolCard
              title="CARB Investigation Workspace"
              description="CARB + EPA alignment workflows with investigation tooling."
              onClick={() => onNavigate('carbEmissionsAudit')}
            />
            <WorkspaceToolCard
              title="Waste Integrity"
              description="Hazardous waste audit flows when API routes are available."
              onClick={() => onNavigate('hazardousWasteAudit')}
            />
            <WorkspaceToolCard
              title="EPA GHGRP Live"
              description="Live GHGRP dashboards plus facility drill-ins."
              onClick={() => onNavigate('epaGhgLive')}
            />
            <WorkspaceToolCard
              title="Envirofacts Geo Intelligence"
              description="Facility-forward geo investigations."
              onClick={() => onNavigate('envirofactsGeoIntelligence')}
            />
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          id="evidence"
          title="Evidence & validation"
          description="Packets, QR-ready records, ledger anchors, and reviewer portals."
          className="mt-10"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <WorkspaceToolCard
              title="Evidence Packet Viewer"
              description="Preview structured disclosure packets."
              onClick={() => onNavigate('previewEvidencePacket')}
            />
            <WorkspaceToolCard
              title="Blockchain transparency database"
              description="Ledger lookups aligned with civic filings."
              onClick={() => onNavigate('transparencyDatabase')}
            />
            <WorkspaceToolCard
              title="Satellite accountability"
              description="Multi-source claim comparison for disclosure integrity."
              onClick={() => onNavigate('satelliteAccountability')}
            />
            <WorkspaceToolCard
              title="Situation Room"
              description="Operational incident coordination shell."
              onClick={() => onNavigate('situationRoom')}
            />
            <WorkspaceToolCard
              title="Mission validators"
              description="Open missions hub validator flows."
              onClick={() => onNavigate('missionMarketplace')}
            />
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          id="signals"
          title="Signals & alerts"
          description="Global feeds and civic flood intelligence pilots."
          className="mt-10"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <WorkspaceToolCard
              title="Global environmental signals"
              description="USGS / NASA EONET / OpenAQ derived feeds."
              onClick={() => onNavigate('globalSignals')}
            />
            <WorkspaceToolCard
              title="FloodGuard"
              description="Civic flood intelligence workspace (does not replace government alerts)."
              onClick={() => onNavigate('floodGuard')}
            />
            <WorkspaceToolCard
              title="Command Center"
              description="Multi-engine orchestration shell with shared evidence primitives."
              onClick={() => onNavigate('commandCenter')}
            />
            <WorkspaceToolCard
              title="Field OS"
              description="Agentic field operating system — Super Agent capable."
              onClick={() => onNavigate('fieldOS')}
            />
            <WorkspaceToolCard
              title="Water Operations Engine"
              description="Operational water credits + validator queues."
              onClick={() => onNavigate('waterOperationsEngine')}
            />
          </div>
        </WorkspaceSection>
      </EnvironmentalWorkspaceShell>
    </div>
  );
}
