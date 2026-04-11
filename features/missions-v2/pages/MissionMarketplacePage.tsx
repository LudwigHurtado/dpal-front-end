import React from 'react';
import MissionMarketplaceBrowse from '../components/MissionMarketplaceBrowse';
import { mw } from '../missionWorkspaceTheme';

/** Standalone marketplace (same grid as Missions Hub → Browse). Prefer `MissionsHubPage` for main entry. */
interface MissionMarketplacePageProps {
  onBack: () => void;
  onOpenWorkspace: () => void;
  onCreateMission: () => void;
}

const MissionMarketplacePage: React.FC<MissionMarketplacePageProps> = ({
  onBack,
  onOpenWorkspace,
  onCreateMission,
}) => (
  <div className={`${mw.shell} pb-28`}>
    <div className="mx-auto max-w-[1100px] px-4 pt-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={mw.btnGhost}>
          ← Back
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenWorkspace} className={mw.btnPrimary}>
            Open workspace
          </button>
          <button type="button" onClick={onCreateMission} className={mw.btnGhost}>
            Create mission
          </button>
        </div>
      </div>
      <MissionMarketplaceBrowse embedded onOpenWorkspace={onOpenWorkspace} onCreateMission={onCreateMission} />
    </div>
  </div>
);

export default MissionMarketplacePage;
