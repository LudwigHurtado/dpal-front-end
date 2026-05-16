# DPAL Platform Architecture v2 — Route Inventory

Generated for navigation restructuring (Carbon Compliance + Environmental Monitoring focus).  
Paths are pathname prefixes unless noted. **No routes were removed** — classifications describe presentation priority only.

## Legend

| Class | Meaning |
| ----- | ------- |
| **1** | Primary Carbon / Environmental |
| **2** | Evidence / Validation |
| **3** | Additional DPAL Module |
| **4** | Legacy preserved |
| **5** | Experimental / preview / hidden |
| **6** | Unknown — review needed |

## Auth & standalone (AppBootstrap)

| Path | Class | Notes |
| ---- | ----- | ----- |
| `/login` | 3 | Account |
| `/signup` | 3 | Account |
| `/forgot-password` | 3 | Account |
| `/reset-password` | 3 | Account |
| `/verify-email` | 3 | Account |
| `/account` | 3 | Account dashboard |
| `/account/profile` | 3 | Profile |
| `/admin` | 4 | Admin |
| `/floodguard/verify/:ledgerRecordId` | 2 | FloodGuard public verification |

## Water Intelligence (`/water-intelligence/*`)

| Path | Class | Notes |
| ---- | ----- | ----- |
| `/water-intelligence` | 1 | Launcher |
| `/water-intelligence/colorado-river` | 1 | Basin / exchange pilot |
| `/water-intelligence/basin-map` | 1 | Basin map |
| `/water-intelligence/agriculture` | 1 | Agriculture conservation |
| `/water-intelligence/urban` | 1 | Urban conservation |
| `/water-intelligence/water-rights` | 1 | Water rights |
| `/water-intelligence/calculator` | 1 | Conservation calculator |
| `/water-intelligence/evidence` | 2 | Evidence packets |
| `/water-intelligence/registry` | 1 | VWCU registry |
| `/water-intelligence/exchange` | 1 | Transaction exchange |
| `/water-intelligence/club20` | 5 | Proposal builder |
| `/water-intelligence/public/:recordId` | 2 | Public verification |
| `/water-intelligence/situation/:projectId` | 4 | Placeholder |
| `/water-intelligence/create-project` | 5 | Placeholder |
| `/water-intelligence/investor` | 5 | Investor demo placeholder |
| `/water-intelligence/water-alert-evidence` | 1 | Alert evidence dashboard |

## Core SPA (`VIEW_PATHS` → App.tsx)

| View key | Path | Class | Notes |
| -------- | ---- | ----- | ----- |
| mainMenu | `/` | 1 | Platform home (v2 hub narrative) |
| categorySelection | `/categories` | 3 | Civic reporting entry |
| categoryGateway | `/gateway` | 3 | Sector gateway |
| categoryModeShell | `/mode-shell` | 3 | Mode shell |
| hub | `/hub` | 2 | Reports / feed / map |
| heroHub | `/hero` | 3 | Hero profile / missions |
| privateHubMenu | `/private-hub` | 3 | Private hero space |
| educationRoleSelection | `/education` | 4 | Education |
| reportSubmission | `/report/new` | 3 | New report |
| missionComplete | `/mission/complete` | 4 | Mission complete |
| reputationAndCurrency | `/reputation` | 3 | Reputation / currency |
| store | `/store` | 4 | Routed into hero hub tab |
| reportComplete | `/report/done` | 2 | Report complete |
| liveIntelligence | `/intel` | 5 | Intel |
| missionDetail | `/mission/detail` | 4 | Mission detail |
| appLiveIntelligence | `/intel/app` | 5 | App intel |
| generateMission | `/mission/build` | 4 | Mission builder |
| trainingHolodeck | `/training` | 5 | Training holodeck |
| tacticalVault | `/vault` | 4 | Tactical vault |
| transparencyDatabase | `/transparency-db` | 2 | Blockchain / ledger |
| aiRegulationHub | `/ai-regulation` | 5 | AI regulation |
| incidentRoom | `/incident` | 2 | Incident room |
| situationRoom | `/situation-room` | 2 | Situation room shell |
| threatMap | `/threat-map` | 5 | Threat map |
| teamOps | `/team-ops` | 4 | Team ops |
| medicalOutpost | `/medical` | 4 | Medical |
| academy | `/academy` | 4 | Academy |
| aiWorkDirectives | `/directives` | 3 | Work network |
| dpalLifts | `/lifts` | 3 | Lifts entry |
| goodWheels | `/good-wheels` | 3 | Good Wheels |
| outreachEscalation | `/outreach` | 3 | Outreach |
| ecosystem | `/ecosystem` | 4 | Ecosystem |
| sustainmentCenter | `/sustainment` | 4 | Sustainment |
| offsetMarketplace | `/offsets` | 1 | Carbon credit market |
| carbonMRV | `/carbon` | 1 | Carbon MRV |
| ecologicalConservation | `/ecology` | 1 | Ecology / Landsat |
| earthObservation | `/earth-observation` | 1 | Earth observation scan |
| hyperspectralPlasticWatch | `/hyperspectral-plastic-watch` | 1 | Plastic Watch (+aliases) |
| forestIntegrity | `/forest-integrity` | 1 | Forest integrity (+aliases) |
| dpalCarbon | `/carbon-hub` | 1 | Carbon headquarters |
| afoluEngine | `/afolu` | 1 | AFOLU (+legacy paths) |
| escrowService | `/escrow` | 3 | Escrow |
| coinLaunch | `/coin` | 5 | Coin launch |
| subscription | `/subscription` | 4 | Subscription |
| aiSetup | `/ai-setup` | 4 | AI setup gate |
| goodDeedsMissions | `/good-deeds` | 3 | Charity / community |
| storage | `/storage` | 4 | Storage |
| politicianTransparency | `/politician` | 3 | Public accountability |
| dpalLocator | `/locator` | 3 | Locator / Find Item |
| gameHub | `/games` | 5 | Mission Ops game |
| reportProtect | `/report-protect` | 3 | Said It Did It / control |
| reportDashboard | `/report-dashboard` | 3 | Report dashboard |
| helpCenter | `/help` | 3 | Help center |
| resolutionLayer | `/resolution` | 4 | Resolution layer |
| missionMarketplace | `/missions` | 3 | Missions hub |
| missionAssignmentV2 | `/missions/v2` | 3 | Mission workspace |
| createMission | `/missions/create` | 3 | Create mission |
| waterMonitor | `/water` | 1 | AquaScan primary |
| aquaScanWater | `/water/aquascan` | 1 | AquaScan alias |
| aqualandWell | `/water/aqualand` | 1 | Aqualand alias |
| waterOperationsEngine | `/water/monitor` | 1 | Water ops engine |
| fieldOS | `/field-os` | 5 | Field OS |
| floodGuard | `/floodguard` | 1 | FloodGuard civic intel |
| aquascanReportViewer | `/aquascan/reports` | 2 | AquaScan reports (+id) |
| aquascanSituationRoom | `/aquascan/situation-room` | 2 | (+id) |
| carbReportViewer | `/carb/reports` | 2 | CARB reports (+id) |
| carbSituationRoom | `/carb/situation-room` | 2 | (+id) |
| globalSignals | `/global-signals` | 1 | Global signals |
| impactHub | `/impact` | 1 | Impact registry |
| airQualityMonitor | `/air` | 1 | Air quality |
| emissionsIntegrityAudit | `/emissions-integrity-audit` | 1 | EIAS |
| carbEmissionsAudit | `/carb-emissions-audit` | 1 | CARB workspace |
| hazardousWasteAudit | `/hazardous-waste-audit` | 1 | Waste integrity |
| dpalInfographicsGallery | `/environmental-intelligence/infographics` | 5 | Infographics |
| environmentalIntelligenceHub | `/environmental-intelligence` | 1 | Env intelligence hub |
| epaGhgLive | `/environmental-intelligence/epa-ghg` | 1 | EPA GHG |
| epaGhgFacilityDetail | `/environmental-intelligence/epa-ghg/facility/:id` | 1 | Facility detail |
| envirofactsGeoIntelligence | `/environmental-intelligence/envirofacts-map` | 1 | Envirofacts |
| satelliteAccountability | `/environmental-intelligence/satellite-accountability` | 1 | Satellite intelligence (+aliases) |
| previewEnvironmentalCommandCenter | `/preview/environmental-command-center` | 5 | Preview |
| previewEnvironmentalIntelligenceHub | `/preview/environmental-intelligence-hub` | 5 | Preview |
| previewFuelStorageAudit | `/preview/fuel-storage-audit` | 5 | Preview |
| previewEvidencePacket | `/preview/evidence-packet` | 2 | Evidence packet preview |
| previewModule | `/preview/module-preview` | 5 | Module preview (+slug) |
| carbonPuraWorkspace | `/partners/carbonpura` | 1 | CarbonPura (+`/carbonpura` alias) |
| investorDemo | `/investor-demo` | 5 | Investor demo |
| commandCenter | `/command-center` | 1 | Command center |
| marketplaceMissionDetail | `/missions/m/:id` | 3 | Marketplace detail |
| **carbonComplianceWorkspace** | `/carbon-compliance` | 1 | v2 Carbon Compliance hub (+`/cad-trust`) |
| **environmentalWorkspace** | `/environmental-workspace` | 1 | v2 Environmental workspace (+`/environmental-hub`) |
| **additionalModules** | `/additional-modules` | 3 | v2 Additional modules (+`/modules`, `/more-tools`) |
| **legacyMainMenuGrid** | `/classic-home` | 4 | Classic full module grid |

## Dynamic / pattern routes

| Pattern | Resolves to view | Class |
| ------- | ---------------- | ----- |
| `/missions/m/:id` | marketplaceMissionDetail | 3 |
| `/environmental-intelligence/epa-ghg/facility/:id` | epaGhgFacilityDetail | 1 |
| `/aquascan/reports/:id` | aquascanReportViewer | 2 |
| `/aquascan/situation-room/:id` | aquascanSituationRoom | 2 |
| `/carb/reports/:id` | carbReportViewer | 2 |
| `/carb/situation-room/:id` | carbSituationRoom | 2 |
| `/preview/module-preview/:slug` | previewModule | 5 |

## Path aliases (same views, multiple URLs)

| Alias path | Target view | Notes |
| ---------- | ----------- | ----- |
| `/environmental/epa-live` | epaGhgLive | |
| `/environmental/envirofacts-map` | envirofactsGeoIntelligence | |
| `/satellite-accountability`, `/environmental-intelligence/disclosure-integrity` | satelliteAccountability | |
| `/forestry-protection`, `/environmental-intelligence/forest-integrity` | forestIntegrity | |
| `/plastic-watch`, `/environmental-intelligence/hyperspectral-plastic-watch`, `/water/plastic-watch` | hyperspectralPlasticWatch | |
| `/field-missions` | missionMarketplace | |
| `/aflu`, `/aflo`, `/afolu-engine`, `/afolu-credit-engine` | afoluEngine | |
| `/carbon-mrv` | carbonMRV | |
| `/carbonpura` | carbonPuraWorkspace | Canonical route remains `/partners/carbonpura`. |
| `/cad-trust` | carbonComplianceWorkspace | |
| `/environmental-hub` | environmentalWorkspace | **`/environmental-intelligence` is not aliased** — it remains the legacy hub view for stable bookmarks. |
| `/modules`, `/more-tools` | additionalModules | Canonical route `/additional-modules`. |

## Items marked **6 — Unknown**

- Any bookmark to removed legacy paths not mapped in `pathToView` (SPA redirects `/` per App.tsx).
- Third-party or iframe-only embeds not registered in `VIEW_PATHS`.

## Maintenance

When adding a `View` + path:

1. Register in `utils/appRoutes.ts` (`VIEW_PATHS` + `pathToView` aliases).
2. Render branch in `App.tsx`.
3. Update this inventory classification.
