import React from 'react';
import AdditionalModulesShell from '../../../layouts/AdditionalModulesShell';
import { PlatformCommandBar } from '../../../components/platform/PlatformCommandBar';
import { WorkspaceSection } from '../../../components/platform/WorkspaceSection';
import { WorkspaceToolCard } from '../../../components/platform/WorkspaceToolCard';

export interface AdditionalModulesPageProps {
  onNavigate: (view: string) => void;
  onOpenMobileNav?: () => void;
  useMobileLayout?: boolean;
}

/** Civic, mobility & legacy tooling — deliberately secondary vs Planetary Intelligence home. */
export default function AdditionalModulesPage({
  onNavigate,
  onOpenMobileNav,
  useMobileLayout,
}: AdditionalModulesPageProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <PlatformCommandBar
        title="More DPAL Modules"
        subtitle="Non-environment spotlight tools remain fully supported—from mobility and escrow to civic reporting and demonstration surfaces."
        onOpenMobileNav={useMobileLayout ? onOpenMobileNav : undefined}
      />

      <AdditionalModulesShell>
        <p className="text-sm leading-relaxed text-slate-600">
          Return to{' '}
          <button type="button" className="font-semibold text-emerald-800 hover:underline" onClick={() => onNavigate('mainMenu')}>
            Planetary Intelligence home
          </button>{' '}
          anytime, or{' '}
          <button type="button" className="font-semibold text-emerald-800 hover:underline" onClick={() => onNavigate('legacyMainMenuGrid')}>
            open the classic tile explorer
          </button>{' '}
          for legacy navigation.
        </p>

        <WorkspaceSection title="Featured modules" description="Operational tools outside the planetary workspace spotlight." className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <WorkspaceToolCard title="Good Wheels" description="Community mobility pilots and ride workflows." onClick={() => onNavigate('goodWheels')} />
            <WorkspaceToolCard title="Escrow" description="Trusted escrow and milestones." onClick={() => onNavigate('escrowService')} />
            <WorkspaceToolCard
              title="Said It Did It"
              description="Report Protect — civic confirmations console."
              onClick={() => onNavigate('reportProtect')}
            />
            <WorkspaceToolCard title="Find Item" description="DPAL locator for items and reunification assistance." onClick={() => onNavigate('dpalLocator')} />
            <WorkspaceToolCard title="Lost Pets" description="Finder flows via locator + reporting tools." onClick={() => onNavigate('dpalLocator')} />
            <WorkspaceToolCard title="Charity Tools" description="Good deeds missions and volunteer payouts." onClick={() => onNavigate('goodDeedsMissions')} />
            <WorkspaceToolCard title="Public Reports" description="Signals hub feed and anchored reporting." onClick={() => onNavigate('hub')} />
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="Legacy demos & archives" description="Historical funnels retained for auditors and testers." className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <WorkspaceToolCard title="Classic module tile grid" description="Dense explorer retained for parity." onClick={() => onNavigate('legacyMainMenuGrid')} />
            <WorkspaceToolCard title="Mission Ops game" description="Phaser simulator." onClick={() => onNavigate('gameHub')} />
            <WorkspaceToolCard title="Investor demo" description="Stakeholder narrative walk-through." onClick={() => onNavigate('investorDemo')} />
            <WorkspaceToolCard title="Preview modules" description="Environmental previews / sandbox." onClick={() => onNavigate('previewEnvironmentalCommandCenter')} />
            <WorkspaceToolCard title="Hero Hub & progression" description="Avatar, vault & rewards." onClick={() => onNavigate('heroHub')} />
            <WorkspaceToolCard title="Training holodeck" description="Legacy trainer funnel." onClick={() => onNavigate('trainingHolodeck')} />
            <WorkspaceToolCard title="Intel workspaces" description="Intel ingestion prototypes." onClick={() => onNavigate('liveIntelligence')} />
            <WorkspaceToolCard title="AI Work Directives" description="Work marketplace." onClick={() => onNavigate('aiWorkDirectives')} />
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="Also available" description="Supporting civic, escrow-adjacent, and accountability surfaces." className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <WorkspaceToolCard title="DPAL Lifts (legacy lifts)" description="Alternate mobility shell entry." onClick={() => onNavigate('dpalLifts')} />
            <WorkspaceToolCard title="Resolution layer" description="Dispute escalation toolkit." onClick={() => onNavigate('resolutionLayer')} />
            <WorkspaceToolCard title="Share a report" description="Wizard from category picker." onClick={() => onNavigate('categorySelection')} />
            <WorkspaceToolCard title="Politician transparency" description="Accountability investigations workspace." onClick={() => onNavigate('politicianTransparency')} />
            <WorkspaceToolCard title="Help center" description="Operational tickets." onClick={() => onNavigate('helpCenter')} />
            <WorkspaceToolCard title="Missions hub" description="Marketplace + assignments surface." onClick={() => onNavigate('missionMarketplace')} />
            <WorkspaceToolCard title="Outreach escalation" description="Structured escalation tooling." onClick={() => onNavigate('outreachEscalation')} />
          </div>
        </WorkspaceSection>
      </AdditionalModulesShell>
    </div>
  );
}
