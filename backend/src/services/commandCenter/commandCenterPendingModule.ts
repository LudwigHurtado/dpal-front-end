import type { CommandCenterModuleKey, CommandCenterModuleRunResult, CommandCenterRunMode } from './commandCenterRunTypes';
import { COMMAND_CENTER_WORKSPACE_VIEW } from './commandCenterModuleRegistry';

const META: Record<
  CommandCenterModuleKey,
  { label: string; defaultLimitations: string[] }
> = {
  water: {
    label: 'AquaScan · Water intelligence',
    defaultLimitations: [
      'Indicative DMRV context only — not a certified water credit or legal determination.',
      'Live adapters depend on configured API base and Copernicus credentials.',
    ],
  },
  earthObservation: {
    label: 'Earth Observation',
    defaultLimitations: [
      'Scene-level statistics are not zonal AOI averages unless a future zonal-stats step is added.',
      'Usable imagery depends on cloud cover, band availability, and date window.',
    ],
  },
  plasticWatch: {
    label: 'Hyperspectral Plastic Watch',
    defaultLimitations: [
      'Evidence-support only — satellite anomalies are not proof of plastic without field validation.',
    ],
  },
  forestIntegrity: {
    label: 'Forest Integrity',
    defaultLimitations: [
      'Third-party forest feeds — not a sole legal finding or certified carbon claim.',
    ],
  },
  pollutionAudit: {
    label: 'Pollution audit (CARB / EPA lanes)',
    defaultLimitations: [
      'Source reconciliation may flag mismatches; analyst review is required before claims.',
    ],
  },
  carbonViu: {
    label: 'Carbon DMRV / VIU context',
    defaultLimitations: [
      'No automatic VIU issuance or carbon credit creation from Command Center previews.',
    ],
  },
  situationRoom: {
    label: 'Situation Room',
    defaultLimitations: [
      'Does not auto-publish reports or replace official emergency channels.',
    ],
  },
};

export function buildPendingAdapterResult(
  moduleKey: CommandCenterModuleKey,
  runMode: CommandCenterRunMode,
): CommandCenterModuleRunResult {
  const m = META[moduleKey];
  return {
    moduleKey,
    status: 'pending_adapter',
    runMode,
    headline: `${m.label} — Command Center engine adapter not wired yet.`,
    limitations: [
      'No fabricated live metrics from the Command Center run engine.',
      ...m.defaultLimitations,
    ],
    providerLanes: [
      {
        id: 'engine',
        label: 'Command Center engine',
        state: 'pending',
        detail: 'pending_adapter',
      },
    ],
    evidenceRefs: [],
    openWorkspaceView: COMMAND_CENTER_WORKSPACE_VIEW[moduleKey],
  };
}
