import type { CommandCenterModuleKey } from './commandCenterRunTypes';

/** Workspace view ids match SPA `View` for deep links. */
export const COMMAND_CENTER_WORKSPACE_VIEW: Record<CommandCenterModuleKey, string> = {
  water: 'aquaScanWater',
  earthObservation: 'earthObservation',
  plasticWatch: 'hyperspectralPlasticWatch',
  forestIntegrity: 'forestIntegrity',
  pollutionAudit: 'carbEmissionsAudit',
  carbonViu: 'carbonDMRV',
  situationRoom: 'situationRoom',
};

export const ALL_COMMAND_CENTER_MODULE_KEYS: CommandCenterModuleKey[] = [
  'water',
  'earthObservation',
  'plasticWatch',
  'forestIntegrity',
  'pollutionAudit',
  'carbonViu',
  'situationRoom',
];

export function isCommandCenterModuleKey(v: string): v is CommandCenterModuleKey {
  return (ALL_COMMAND_CENTER_MODULE_KEYS as string[]).includes(v);
}
