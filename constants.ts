
/** FIX: Added NftTheme to imports */
import { Category, Report, Hero, NftRarity, Rank, Item, Archetype, SkillType, TrainingModule, EducationRole, Mission, HeroPath, NftTheme, SubscriptionTier } from "./types";

/**
 * Standardized API base URL for backend services (Railway).
 * Backend should connect to MongoDB (Railway MongoDB or Atlas) and implement the routes in API_ROUTES.
 * Set VITE_API_BASE in .env.local or deployment env to your Railway backend URL.
 */
const DEFAULT_API_BASE = 'https://web-production-a27b.up.railway.app';
const LOCAL_DEV_API_BASE = 'http://localhost:3001';
export const DEFAULT_MAP_LOCATION = 'Los Angeles, CA';
let hasWarnedMissingApiBase = false;

const normalizeApiBase = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\/+$/, '');
};

export const isApiBaseConfigured = (): boolean => {
  const configured = normalizeApiBase((import.meta as any).env?.VITE_API_BASE);
  return configured.length > 0;
};

export const getApiBase = (): string => {
  const env = (import.meta as any).env ?? {};
  const configured = normalizeApiBase(env.VITE_API_BASE);
  if (configured) return configured;

  if (!hasWarnedMissingApiBase) {
    hasWarnedMissingApiBase = true;
    if (env.DEV) {
      console.warn(
        '[DPAL] Missing VITE_API_BASE in development. Falling back to local backend at http://localhost:3001. ' +
          'Create/update .env.local and restart dev server for explicit config.'
      );
    } else {
      console.warn(
        '[DPAL] Missing VITE_API_BASE. Falling back to default Railway endpoint. ' +
          'Create/update environment config for explicit backend routing.'
      );
    }
  }
  return env.DEV ? LOCAL_DEV_API_BASE : DEFAULT_API_BASE;
};

/** Build full URL for an API route so all requests go to the same Railway backend. */
export const apiUrl = (path: string): string => {
  const base = getApiBase().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};

/**
 * Deployed URL for the DPAL Reviewer / Validator Node (Verifier Action Portal).
 * Set `VITE_VALIDATOR_PORTAL_URL` in `.env.local` or hosting env (recommended for previews / custom domains).
 * When unset, the production hub on `dpal-front-end.vercel.app` defaults to the public Validator deployment.
 */
export const getValidatorPortalUrl = (): string => {
  const raw = (import.meta as any).env?.VITE_VALIDATOR_PORTAL_URL;
  const fromEnv = typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location.hostname === 'dpal-front-end.vercel.app') {
    return 'https://dpal-reviewer-node.vercel.app';
  }
  return '';
};

/** API paths the Railway backend (with MongoDB) should implement. */
export const API_ROUTES = {
  NFT_RECEIPTS: '/api/nft/receipts',
  NFT_MINT: '/api/nft/mint',
  NFT_GENERATE_IMAGE: '/api/nft/generate-image',
  AI_ASK: '/api/ai/ask',
  /** POST { model, contents, config? } — server-held Gemini key (see VITE_USE_SERVER_AI). */
  AI_GEMINI: '/api/ai/gemini',
  /** GET — { ok, gemini } whether server has GEMINI_API_KEY. */
  AI_STATUS: '/api/ai/status',
  PERSONA_GENERATE_DETAILS: '/api/persona/generate-details',
  PERSONA_GENERATE_IMAGE: '/api/persona/generate-image',
  assets: (tokenId: string) => `/api/assets/${tokenId}.png`,
  ESCROW_CREATE: '/api/escrow/create',
  ESCROW_LIST: '/api/escrow/list',
  /** POST JSON report body; enables GET /api/reports/:id for shared links on any device. */
  /** GET ?userId= / POST — saved hero identities (personas) per operative */
  HERO_PERSONAS: '/api/hero-personas',
  REPORTS_UPSERT: '/api/reports',
  /** Community beacons — see `services/beaconService.ts` for request/response shapes. */
  BEACONS: '/api/beacons',
  BEACONS_RESOLVE: '/api/beacons/resolve',
  /** Auth — see `auth/authApi.ts` */
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REFRESH: '/api/auth/refresh',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',
  AUTH_FORGOT: '/api/auth/forgot-password',
  AUTH_RESET: '/api/auth/reset-password',
  AUTH_VERIFY_EMAIL: '/api/auth/verify-email',
  AUTH_CHANGE_PASSWORD: '/api/auth/change-password',
  /** POST { onlineStatus: 'online' | 'away' | 'offline' } — heartbeat / presence */
  AUTH_PRESENCE: '/api/auth/presence',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_ACTIVITY: '/api/admin/activity',
  RESOLUTION_EVENTS: '/api/resolution/events',
  RESOLUTION_CASES: '/api/resolution/cases',
  RESOLUTION_ESCALATE: '/api/resolution/escalate',
  RESOLUTION_STREAM: '/api/resolution/stream',
  REWARDS_ISSUE: '/api/rewards/issue',
  REWARDS_LEDGER: '/api/rewards/ledger',
  /** POST mission progress + proof; consumed by validator node and admin panel. */
  DIRECTIVES_SAVE: '/api/directives/save',
  /** POST { roomId, type, dataUrl } — reused for mission proof image upload. */
  SITUATION_MEDIA: '/api/situation/media',
  /** Carbon credit market */
  OFFSETS_LIST: '/api/offsets',
  OFFSETS_BUY: '/api/offsets/buy',
  OFFSETS_JOIN: '/api/offsets/join',
  OFFSETS_LEAVE: '/api/offsets/leave',
  OFFSETS_RETIRE: '/api/offsets/retire',
  OFFSETS_VERIFY: '/api/offsets/verify',
  OFFSETS_ACTIVITY: '/api/offsets/activity/feed',
  OFFSETS_PARCELS: '/api/offsets/parcels',
  OFFSETS_PARCELS_REGISTER: '/api/offsets/parcels/register',
  /** Carbon MRV Engine */
  CARBON_PROJECTS: '/api/carbon/projects',
  CARBON_SATELLITE_SNAPSHOT: '/api/carbon/satellite/snapshot',
  CARBON_MRV_SCORE: '/api/carbon/mrv/score',
  CARBON_MARKETPLACE: '/api/carbon/marketplace',
  CARBON_MARKETPLACE_LIST: '/api/carbon/marketplace/list',
  CARBON_MARKETPLACE_BUY: '/api/carbon/marketplace/buy',
  CARBON_MARKETPLACE_RETIRE: '/api/carbon/marketplace/retire',
  CARBON_VALIDATOR_QUEUE: '/api/carbon/validators/queue',
  CARBON_VALIDATOR_REVIEW: '/api/carbon/validators/review',
  CARBON_LEDGER: '/api/carbon/ledger',
  CARBON_STATS: '/api/carbon/stats',
  CARBON_AIR_QUALITY: '/api/carbon/air-quality',
  CARBON_MINERALS: '/api/carbon/minerals',
  CARBON_PROJECT_QR_REGISTRY: '/api/carbon/projects/registry',
  /** Ecological Conservation */
  ECOLOGY_LANDSAT_SCAN: '/api/ecology/landsat-scan',
  /** LEO satellite Earth Observation */
  EARTH_OBSERVATION_SCAN: '/api/earth-observation/scan',
  /** DPAL Water Monitor + Verified Water Impact Credits */
  WATER_PROJECTS: '/api/water/projects',
  WATER_CREDITS: '/api/water/credits',
  WATER_VALIDATOR_QUEUE: '/api/water/validator/queue',
  WATER_VALIDATOR_REVIEWS: '/api/water/validator/reviews',
  WATER_STATS: '/api/water/stats',
  WATER_ACTIVITY_FEED: '/api/water/activity/feed',
  WATER_SATELLITE_PREVIEW: '/api/water/satellite-preview',
  DISASTERS_FEED: '/api/disasters/feed',
  /** DPAL Global Signals Engine */
  SIGNALS_LIST:          '/api/signals',
  SIGNALS_STATS:         '/api/signals/stats',
  SIGNALS_IMPORT:        '/api/signals/import',
  /** Emissions Integrity Audit System */
  EMISSIONS_AUDIT_CREATE: '/api/emissions-audit/create',
  EMISSIONS_AUDIT_LIST: '/api/emissions-audit/list',
  EMISSIONS_AUDIT_EXPORT: '/api/emissions-audit/export',
} as const;

export const SIGNAL_DETAIL        = (id: string) => apiUrl(`/api/signals/${encodeURIComponent(id)}`);
export const SIGNAL_STATUS        = (id: string) => apiUrl(`/api/signals/${encodeURIComponent(id)}/status`);
export const SIGNAL_ENRICH        = (id: string) => apiUrl(`/api/signals/${encodeURIComponent(id)}/enrich`);
export const SIGNAL_CREATE_MISSION = (id: string) => apiUrl(`/api/signals/${encodeURIComponent(id)}/create-mission`);

export const OFFSETS_PORTFOLIO = (userId: string) => apiUrl(`/api/offsets/portfolio/${encodeURIComponent(userId)}`);
export const OFFSETS_COALITION = (projectId: string) => apiUrl(`/api/offsets/coalition/${encodeURIComponent(projectId)}`);
export const OFFSETS_MY_PARCELS = (heroId: string) => apiUrl(`/api/offsets/parcels?heroId=${encodeURIComponent(heroId)}`);
export const CARBON_PROJECT_DETAIL = (projectId: string) => apiUrl(`/api/carbon/projects/${encodeURIComponent(projectId)}`);
export const CARBON_SATELLITE_HISTORY = (projectId: string) => apiUrl(`/api/carbon/satellite/${encodeURIComponent(projectId)}`);
export const CARBON_MRV_HISTORY = (projectId: string) => apiUrl(`/api/carbon/mrv/${encodeURIComponent(projectId)}`);
export const CARBON_CREDITS_OWNED = (userId: string) => apiUrl(`/api/carbon/credits/${encodeURIComponent(userId)}`);
export const CARBON_PROJECT_LEDGER = (projectId: string) => apiUrl(`/api/carbon/ledger/${encodeURIComponent(projectId)}`);
export const CARBON_PROJECTS_BY_OWNER = (ownerId: string) => apiUrl(`/api/carbon/projects?ownerId=${encodeURIComponent(ownerId)}`);
export const CARBON_PROJECT_GPS       = (projectId: string) => apiUrl(`/api/carbon/projects/${encodeURIComponent(projectId)}/location`);
export const CARBON_PROJECT_QR_REGISTRY_DETAIL = (entryId: string) => apiUrl(`/api/carbon/projects/registry/${encodeURIComponent(entryId)}`);

// ── Water Monitor helpers ─────────────────────────────────────────────────────
export const WATER_PROJECT_DETAIL    = (id: string) => apiUrl(`/api/water/projects/${encodeURIComponent(id)}`);
export const WATER_PROJECT_SNAPSHOTS = (id: string) => apiUrl(`/api/water/projects/${encodeURIComponent(id)}/snapshots`);
export const WATER_MOCK_REFRESH      = (id: string) => apiUrl(`/api/water/projects/${encodeURIComponent(id)}/snapshots/mock-refresh`);
export const WATER_PROJECT_REPORTS   = (id: string) => apiUrl(`/api/water/projects/${encodeURIComponent(id)}/reports`);
export const EMISSIONS_AUDIT_DETAIL  = (id: string) => apiUrl(`/api/emissions-audit/${encodeURIComponent(id)}`);
export const EMISSIONS_AUDIT_EXPORT_DETAIL = (id: string) => apiUrl(`/api/emissions-audit/${encodeURIComponent(id)}/export`);
export const EMISSIONS_AUDIT_LINK    = (id: string) => apiUrl(`/api/emissions-audit/${encodeURIComponent(id)}/link`);
export const EMISSIONS_AUDIT_RECALCULATE = (id: string) => apiUrl(`/api/emissions-audit/${encodeURIComponent(id)}/recalculate`);
export const WATER_GENERATE_REPORT   = (id: string) => apiUrl(`/api/water/projects/${encodeURIComponent(id)}/reports/generate`);
export const WATER_ISSUE_CREDITS     = (id: string) => apiUrl(`/api/water/projects/${encodeURIComponent(id)}/credits/issue`);
export const WATER_CREDIT_LIST       = (id: string) => apiUrl(`/api/water/credits/${encodeURIComponent(id)}/list`);
export const WATER_CREDIT_RETIRE     = (id: string) => apiUrl(`/api/water/credits/${encodeURIComponent(id)}/retire`);

/** Home layout options for hub: feed-first (A), map (B), categories (C). Persisted in localStorage. */
export type HomeLayout = 'feed' | 'map' | 'categories';
export const HOME_LAYOUT_STORAGE_KEY = 'dpal-home-layout';

export const getStoredHomeLayout = (): HomeLayout => {
  try {
    const raw = localStorage.getItem(HOME_LAYOUT_STORAGE_KEY);
    if (raw === 'feed' || raw === 'map' || raw === 'categories') return raw;
  } catch (_) {}
  return 'feed';
};

/**
 * Deploy Beacon / coordination cards — soft rounded corners.
 */
export const COORDINATION_SURFACE_RADIUS = 'rounded-[2rem] md:rounded-[2.5rem]';

/** Live chat panels — same radius as Deploy Beacon / coordination surfaces. */
export const CHAT_SURFACE_CLASS = COORDINATION_SURFACE_RADIUS;

export const CATEGORIES = Object.values(Category);

export const CATEGORIES_WITH_ICONS = [
  { value: Category.GoodDeeds, translationKey: "categories.goodDeeds", icon: "❤️", imageSeed: "community-kindness-missions", headline: "Track and Join Good Deed Missions" },
  { value: Category.Travel, translationKey: "categories.travel", icon: "✈️", imageSeed: "airport-terminal-overcast", headline: "Report a Travel Disruption" },
  { value: Category.ElderlyCare, translationKey: "categories.elderlyCare", icon: "👵", imageSeed: "nursing-home-interior", headline: "Elderly Care Accountability" },
  { value: Category.ProfessionalServices, translationKey: "categories.professionalServices", icon: "💼", imageSeed: "modern-office-justice", headline: "Professional Service Audit" },
  { value: Category.NonProfit, translationKey: "categories.nonProfit", icon: "🎗️", imageSeed: "community-center-charity", headline: "Non-Profit Transparency" },
  { value: Category.Events, translationKey: "categories.events", icon: "🎟️", imageSeed: "concert-stadium-night", headline: "Event Ticket Integrity" },
  { value: Category.IndependentDiscoveries, translationKey: "categories.independentDiscoveries", icon: "🧩", imageSeed: "independent-discovery-lab", headline: "Report an Independent Discovery" },
  { value: Category.Allergies, translationKey: "categories.allergies", icon: "🥜", imageSeed: "laboratory-medical-safety", headline: "Report an Allergy Incident" },
  { value: Category.Clergy, translationKey: "categories.clergy", icon: "⛪️", imageSeed: "architecture-cathedral-shadow", headline: "Ensure Accountability in Faith Communities" },
  { value: Category.ConsumerScams, translationKey: "categories.consumerScams", icon: "💳", imageSeed: "digital-terminal-encryption", headline: "Expose Consumer Scams" },
  { value: Category.Education, translationKey: "categories.education", icon: "🎓", imageSeed: "university-hallway-cinematic", headline: "Advocate for Better Education" },
  { value: Category.Environment, translationKey: "categories.environment", icon: "🌳", imageSeed: "industrial-pollution-wasteland", headline: "Protect Our Environment" },
  { value: Category.EcologicalConservation, translationKey: "categories.ecologicalConservation", icon: "🌿", imageSeed: "landsat-forest-canopy-monitor", headline: "Monitor Ecological Conservation" },
  { value: Category.EarthObservation, translationKey: "categories.earthObservation", icon: "🛰️", imageSeed: "leo-earth-observation", headline: "Analyze Earth Observation Signals" },
  { value: Category.Infrastructure, translationKey: "categories.infrastructure", icon: "🏗️", imageSeed: "bridge-construction-night", headline: "Improve Public Infrastructure" },
  { value: Category.InsuranceFraud, translationKey: "categories.insuranceFraud", icon: "🚗", imageSeed: "vehicle-accident-forensics", headline: "Combat Insurance Fraud" },
  { value: Category.MedicalNegligence, translationKey: "categories.medicalNegligence", icon: "⚕️", imageSeed: "hospital-technology-medical", headline: "Demand Patient Safety" },
  { value: Category.Other, translationKey: "categories.other", icon: "❓", imageSeed: "abstract-data-nodes", headline: "Report Another Issue" },
  { value: Category.PoliceMisconduct, translationKey: "categories.policeMisconduct", icon: "👮", imageSeed: "patrol-car-night-lights", headline: "Uphold the Standard of Service" },
  { value: Category.PublicTransport, translationKey: "categories.publicTransport", icon: "🚌", imageSeed: "subway-station-commute", headline: "Enhance Public Transit" },
  { value: Category.VeteransServices, translationKey: "categories.veteransServices", icon: "🎖️", imageSeed: "military-memorial-honor", headline: "Support Our Veterans" },
  { value: Category.WaterViolations, translationKey: "categories.waterViolations", icon: "💧", imageSeed: "water-infrastructure-pipe", headline: "Safeguard Our Water" },
  { value: Category.WorkplaceIssues, translationKey: "categories.workplaceIssues", icon: "🏢", imageSeed: "corporate-office-tower", headline: "Champion Fair Workplaces" },
  { value: Category.CivicDuty, translationKey: "categories.civicDuty", icon: "⚖️", imageSeed: "government-hall-columns", headline: "Monitor Civic Duty Compliance" },
  { value: Category.AccidentsRoadHazards, translationKey: "categories.accidentsRoadHazards", icon: "🚨", imageSeed: "car-crash-highway-rain", headline: "Accidents & Road Hazards" },
  { value: Category.FireEnvironmentalHazards, translationKey: "categories.fireEnvironmentalHazards", icon: "🔥", imageSeed: "forest-fire-smoke-plume", headline: "Fire & Environmental Hazards" },
  { value: Category.PublicSafetyAlerts, translationKey: "categories.publicSafetyAlerts", icon: "⚠️", imageSeed: "public-safety-warning-sign", headline: "Public Safety Alerts" },
  { value: Category.StolenPropertyRegistry, translationKey: "categories.stolenPropertyRegistry", icon: "🔒", imageSeed: "stolen-property-registry-police-ledger", headline: "Stolen Property Registry" },
  { value: Category.HousingIssues, translationKey: "categories.housingIssues", icon: "🏚️", imageSeed: "unsafe-housing-repair-violation", headline: "Housing Issues" },
  { value: Category.P2PEscrowVerification, translationKey: "categories.p2pEscrowVerification", icon: "🤝", imageSeed: "digital-contract-signature-secure", headline: "P2P Escrow & Document Verification" },
  { value: Category.ProofOfLifeBiometric, translationKey: "categories.proofOfLifeBiometric", icon: "🧬", imageSeed: "biometric-fingerprint-face-scan", headline: "Proof of Life & Biometric Verification" },
  { value: Category.DpalLifts, translationKey: "categories.dpalLifts", icon: "🛡️", imageSeed: "dpal-lifts-assistance", headline: "Decentralized Public Assistance Lifts" },
  { value: Category.DpalWorkNetwork, translationKey: "categories.dpalWorkNetwork", icon: "🎯", imageSeed: "dpal-work-network-missions", headline: "DPAL Work Network" },
  { value: Category.DpalHelp, translationKey: "categories.dpalHelp", icon: "🛟", imageSeed: "dpal-help", headline: "Get help from DPAL" },
].sort((a, b) => a.value.localeCompare(b.value));

const GLOBAL_CORE = [
    { id: "GLB_01", section: "Event Context", label: "Date/time of incident", required: true, answer_type: "datetime", privacy_level: "public_safe", institutional_value_tag: "audit" },
    { id: "GLB_02", section: "Event Context", label: "Is it ongoing?", required: true, answer_type: "single_select", options: ["Yes", "No", "Unsure"], privacy_level: "public_safe", institutional_value_tag: "safety" },
    { id: "GLB_04", section: "Actor Role & System Involved", label: "Your relationship", required: true, answer_type: "single_select", options: ["Directly affected", "Witness", "Caregiver-advocate", "Employee-insider", "Third-party"], privacy_level: "sensitive", institutional_value_tag: "regulatory" },
    { id: "GLB_05", section: "Impact & Severity", label: "Primary impact", required: true, answer_type: "single_select", options: ["Health", "Safety", "Financial", "Environmental", "Rights & dignity", "Service access"], privacy_level: "public_safe", institutional_value_tag: "research" },
    { id: "GLB_06", section: "Evidence & Chain-of-Custody", label: "Evidence available", required: true, answer_type: "multi_select", options: ["Photo", "Video", "Audio", "Documents", "Messages", "None"], privacy_level: "public_safe", institutional_value_tag: "audit" }
];

export const FORM_BUNDLE: { bundle_version: string; categories: Record<string, any> } = {
    bundle_version: "2.2.0",
    categories: {
        [Category.AccidentsRoadHazards]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "ACC_01", section: "Tactical Data", label: "Type of Hazard", required: true, answer_type: "single_select", options: [
                    "Vehicle collision",
                    "Near miss / potential accident",
                    "Disabled vehicle",
                    "Road blockage / debris",
                    "Pothole / road surface damage",
                    "Damaged or missing sign",
                    "Traffic signal / light failure",
                    "Construction hazard",
                    "Animal in roadway",
                    "Fallen tree / branches",
                    "Flooding / standing water",
                    "Ice / snow / slick road",
                    "Fog / low visibility",
                    "High wind / blowing debris",
                    "Sinkhole / structural failure",
                    "Other"
                ], institutional_value_tag: "safety" },
                { id: "ACC_02", section: "Tactical Data", label: "Road Status", required: true, answer_type: "single_select", options: ["Completely Blocked", "Partially Blocked", "Traffic Moving Slow", "Clear but Dangerous"], institutional_value_tag: "safety" },
                { id: "ACC_03", section: "Impact & Severity", label: "Visible Injuries", required: true, answer_type: "single_select", options: ["Yes - Critical", "Yes - Minor", "No Visible Injuries", "Unsure/Unable to approach"], institutional_value_tag: "safety" },
                { id: "ACC_04", section: "Tactical Data", label: "Number of Vehicles involved", required: true, answer_type: "single_select", options: ["1", "2", "3-5", "Pileup (6+)", "None (Static Hazard)"], institutional_value_tag: "safety" },
                { id: "ACC_05", section: "Hazard Analysis", label: "Fluid Leaks Detected?", required: true, answer_type: "multi_select", options: ["Gasoline/Fuel", "Oil", "Coolant", "Chemical (Unknown)", "None"], institutional_value_tag: "fire_safety" }
            ],
            deep_dive_questions: [
                { id: "ACC_DD_01", section: "Emergency Response", label: "Estimated Responders Needed", required: false, answer_type: "multi_select", options: ["Ambulance", "Fire Engine", "Police", "Tow Truck", "Hazardous Mat Squad"] }
            ]
        },
        [Category.FireEnvironmentalHazards]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "FIR_01", section: "Tactical Data", label: "Hazard Type", required: true, answer_type: "single_select", options: ["Structure Fire", "Vegetation/Brush Fire", "Chemical/Gas Leak", "Electrical Fire", "Nuclear/Bio Spill"], institutional_value_tag: "hazard_response" },
                { id: "FIR_02", section: "Impact & Severity", label: "Is it Spreading?", required: true, answer_type: "single_select", options: ["Rapidly Spreading", "Contained but Active", "Smoldering", "Explosion Risk"], institutional_value_tag: "safety" },
                { id: "FIR_03", section: "Tactical Data", label: "Smoke Characteristics", required: true, answer_type: "single_select", options: ["Black/Thick", "White/Thin", "Yellow/Chemical Tint", "No Smoke (Fluid only)"], institutional_value_tag: "hazard_response" },
                { id: "FIR_04", section: "Context", label: "Residential Proximity", required: true, answer_type: "single_select", options: ["Directly Impacting Homes", "Near Residential Area", "Industrial Zone Only", "Isolated Area"], institutional_value_tag: "safety" }
            ],
            deep_dive_questions: [
                { id: "FIR_DD_01", section: "Evacuation", label: "Immediate Evacuation Needed?", required: false, answer_type: "single_select", options: ["Yes - In Progress", "Yes - Needed Now", "No", "Unsure"] }
            ]
        },
        [Category.PublicSafetyAlerts]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "PSA_01", section: "Tactical Data", label: "Alert Type", required: true, answer_type: "single_select", options: ["Active Threat", "Suspicious Package", "Crowd Instability", "Harassment/Assault", "Missing Person"], institutional_value_tag: "security" },
                { id: "PSA_02", section: "Tactical Data", label: "Suspect Status", required: true, answer_type: "single_select", options: ["On-Site (Active)", "Fled (On Foot)", "Fled (In Vehicle)", "No Suspect/Static Threat"], institutional_value_tag: "security" },
                { id: "PSA_03", section: "Tactical Data", label: "Visible Weapons?", required: true, answer_type: "single_select", options: ["Firearm", "Blade", "Explosive/Component", "Blunt Object", "None Visible"], institutional_value_tag: "security" },
                { id: "PSA_04", section: "Impact & Severity", label: "Crowd Size affected", required: true, answer_type: "single_select", options: ["Individual", "Small Group (2-10)", "Crowd (10-50)", "Mass Gathering (50+)"], institutional_value_tag: "safety" }
            ],
            deep_dive_questions: [
                { id: "PSA_DD_01", section: "Safe Zone", label: "Safe Assembly Point ID", required: false, answer_type: "short_text", help_text: "Nearest exit or safe-room ID" }
            ]
        },
        [Category.P2PEscrowVerification]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "ESC_01", section: "Trade Context", label: "Transaction type", required: true, answer_type: "single_select", options: ["Trading Card Sale", "Collectible Sale", "Electronics", "Service", "Rental", "Other"], institutional_value_tag: "audit" },
                { id: "ESC_02", section: "Trade Context", label: "Seller handle / name", required: true, answer_type: "short_text", help_text: "Who sold you the item?" , institutional_value_tag: "audit" },
                { id: "ESC_03", section: "Trade Context", label: "Buyer handle / name", required: true, answer_type: "short_text", help_text: "Who bought the item?" , institutional_value_tag: "audit" },
                { id: "ESC_04", section: "Item Details", label: "What was sold", required: true, answer_type: "short_text", help_text: "Card/item name, condition, serial, etc.", institutional_value_tag: "audit" },
                { id: "ESC_05", section: "Payment", label: "Payment amount range", required: true, answer_type: "single_select", options: ["<$20", "$20-$99", "$100-$499", "$500-$999", "$1000+"], institutional_value_tag: "financial_fraud" },
                { id: "ESC_06", section: "Payment", label: "Payment method", required: true, answer_type: "single_select", options: ["Cash", "Bank Transfer", "Card", "Crypto", "Escrow Wallet", "Other"], institutional_value_tag: "audit" },
                { id: "ESC_07", section: "Evidence", label: "Receipt evidence", required: true, answer_type: "multi_select", options: ["No receipt - creating one now", "Chat screenshot", "Transfer proof", "Invoice", "Tracking info", "Photo of item exchange"], institutional_value_tag: "regulatory" },
                { id: "ESC_08", section: "Verification", label: "Face verification status", required: true, answer_type: "single_select", options: ["Passed", "Failed", "Manual Review", "Not attempted"], institutional_value_tag: "safety" },
                { id: "ESC_09", section: "Verification", label: "Fingerprint verification status", required: true, answer_type: "single_select", options: ["Passed", "Failed", "Manual Review", "Not attempted"], institutional_value_tag: "safety" }
            ],
            deep_dive_questions: [
                { id: "ESC_DD_01", section: "Dispute", label: "Dispute reason", required: false, answer_type: "single_select", options: ["Non-delivery", "Wrong item / fake item", "Partial delivery", "Identity mismatch", "Payment mismatch", "Other"] }
            ]
        },
        [Category.ProofOfLifeBiometric]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "BIO_01", section: "Proof of Life", label: "Proof-of-life method", required: true, answer_type: "single_select", options: ["Live selfie video", "Challenge phrase", "Blink/Head movement", "Fingerprint + selfie", "Other"], institutional_value_tag: "safety" },
                { id: "BIO_02", section: "Verification", label: "Face match confidence", required: true, answer_type: "single_select", options: ["95-100%", "85-94%", "70-84%", "Below 70%", "Not available"], institutional_value_tag: "audit" },
                { id: "BIO_03", section: "Verification", label: "Fingerprint status", required: true, answer_type: "single_select", options: ["Matched", "Not matched", "Unreadable", "Not captured"], institutional_value_tag: "audit" },
                { id: "BIO_04", section: "Evidence & Chain-of-Custody", label: "Biometric evidence attached", required: true, answer_type: "multi_select", options: ["Face image", "Liveness video", "Fingerprint capture", "Government ID", "Session Logs", "None"], institutional_value_tag: "regulatory" }
            ],
            deep_dive_questions: [
                { id: "BIO_DD_01", section: "Risk", label: "Potential spoofing signal", required: false, answer_type: "single_select", options: ["None", "Replay suspected", "Static image suspected", "Fingerprint artifact suspected", "Unsure"] }
            ]
        },
        [Category.Allergies]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "ALG_01", section: "Event Context", label: "Exposure context", required: true, answer_type: "single_select", options: ["Food", "Medication", "Environmental", "Unknown"], institutional_value_tag: "public_health" },
                { id: "ALG_02", section: "Failure Mechanism", label: "Allergen suspected", required: true, answer_type: "multi_select", options: ["Peanuts", "Tree nuts", "Milk", "Eggs", "Wheat", "Soy", "Fish", "Shellfish", "Sesame", "Other (specify)", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "ALG_03", section: "Event Context", label: "Setting", required: true, answer_type: "single_select", options: ["Restaurant", "School", "Workplace", "Home", "Medical facility", "Public event", "Other"], institutional_value_tag: "safety" },
                { id: "ALG_04", section: "Failure Mechanism", label: "Labeling/disclosure present?", required: true, answer_type: "single_select", options: ["Clear", "Unclear", "None", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "ALG_05", section: "Impact & Severity", label: "Reaction severity", required: true, answer_type: "single_select", options: ["Mild", "Moderate", "Severe", "Life-threatening"], institutional_value_tag: "public_health" },
                { id: "ALG_06", section: "Actions Taken / Notifications", label: "Medical action", required: true, answer_type: "single_select", options: ["None", "OTC meds", "Epipen used", "Clinic", "ER", "Hospital"], institutional_value_tag: "public_health" },
                { id: "ALG_07", section: "Failure Mechanism", label: "Repeat issue at same place?", required: true, answer_type: "single_select", options: ["First time", "Happened before", "Frequent", "Unknown"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "ALG_DD_01", section: "Impact & Severity", label: "Time from exposure to symptoms", required: false, answer_type: "single_select", options: ["<15 min", "15–60 min", "1–6 hrs", ">6 hrs", "Unknown"] },
                { id: "ALG_DD_02", section: "Failure Mechanism", label: "Cross-contamination indicators", required: false, answer_type: "multi_select", options: ["Shared fryer", "Shared prep area", "Staff uncertainty", "“May contain” ignored", "Unknown"] },
                { id: "ALG_DD_03", section: "Evidence & Chain-of-Custody", label: "Supporting proof", required: false, answer_type: "multi_select", options: ["Receipt", "Menu screenshot", "Label photo", "Witness", "None"] }
            ]
        },
        [Category.CivicDuty]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "CIV_01", section: "Event Context", label: "Government level", required: true, answer_type: "single_select", options: ["City/County", "State/Province", "Federal", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "CIV_02", section: "Actor Role & System Involved", label: "Service type", required: true, answer_type: "single_select", options: ["Records request", "Inspection", "Permitting", "Public assistance", "Emergency response", "Court service", "Other"], institutional_value_tag: "regulatory" },
                { id: "CIV_03", section: "Failure Mechanism", label: "Failure type", required: true, answer_type: "single_select", options: ["No response", "Delay", "Incorrect action", "Denial without explanation", "Misconduct", "Other"], institutional_value_tag: "audit" },
                { id: "CIV_04", section: "Impact & Severity", label: "Delay length", required: true, answer_type: "single_select", options: ["<24 hrs", "1–3 days", "4–14 days", "2–8 weeks", ">2 months", "Unknown"], institutional_value_tag: "audit" },
                { id: "CIV_05", section: "Impact & Severity", label: "Harm type", required: true, answer_type: "multi_select", options: ["Financial", "Health", "Safety", "Rights", "Community impact", "Other"], institutional_value_tag: "civil_rights" },
                { id: "CIV_06", section: "Actions Taken / Notifications", label: "Was a formal request/complaint filed?", required: true, answer_type: "single_select", options: ["Yes", "No", "Unsure"], institutional_value_tag: "regulatory" }
            ],
            deep_dive_questions: [
                { id: "CIV_DD_01", section: "Evidence & Chain-of-Custody", label: "Proof of request", required: false, answer_type: "multi_select", options: ["Email", "Letter", "Portal screenshot", "Case #", "None"] },
                { id: "CIV_DD_02", section: "Actions Taken / Notifications", label: "Outcome so far", required: false, answer_type: "single_select", options: ["Resolved", "Partially resolved", "Unresolved", "Retaliation concerns", "Unknown"] }
            ]
        },
        [Category.Clergy]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "CLR_01", section: "Event Context", label: "Context", required: true, answer_type: "single_select", options: ["Worship", "Counseling", "Youth program", "School", "Fundraising", "Other"], institutional_value_tag: "regulatory" },
                { id: "CLR_02", section: "Failure Mechanism", label: "Concern type", required: true, answer_type: "single_select", options: ["Safeguarding risk", "Abuse of authority", "Financial transparency", "Discrimination", "Harassment", "Other"], institutional_value_tag: "civil_rights" },
                { id: "CLR_03", section: "Actor Role & System Involved", label: "Vulnerable persons involved?", required: true, answer_type: "multi_select", options: ["Minors", "Elderly", "Disabled", "None", "Unknown"], institutional_value_tag: "safety" },
                { id: "CLR_04", section: "Actions Taken / Notifications", label: "Was leadership notified?", required: true, answer_type: "single_select", options: ["Yes", "No", "Unsafe to do", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "CLR_05", section: "Failure Mechanism", label: "Pattern", required: true, answer_type: "single_select", options: ["One-time", "Repeated", "Ongoing", "Unknown"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "CLR_DD_01", section: "Actions Taken / Notifications", label: "Reporting channel exists?", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] },
                { id: "CLR_DD_03", section: "Impact & Severity", label: "Safety concern right now?", required: false, answer_type: "single_select", options: ["Yes", "No", "Unsure"] }
            ]
        },
        [Category.ConsumerScams]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "SCM_01", section: "Event Context", label: "Scam channel", required: true, answer_type: "single_select", options: ["Website", "App", "Phone", "Email", "Social media", "In-person", "Other"], institutional_value_tag: "financial_fraud" },
                { id: "SCM_02", section: "Failure Mechanism", label: "Scam type", required: true, answer_type: "single_select", options: ["Non-delivery", "Impersonation", "Subscription trap", "Fake refund", "Investment/crypto", "Job scam", "Romance", "Other"], institutional_value_tag: "financial_fraud" },
                { id: "SCM_03", section: "Actor Role & System Involved", label: "Payment method", required: true, answer_type: "multi_select", options: ["Credit/debit", "Wire", "Cash", "Crypto", "Gift cards", "Payment app", "Other"], institutional_value_tag: "audit" },
                { id: "SCM_04", section: "Impact & Severity", label: "Loss range", required: true, answer_type: "currency_range", options: ["None", "<$100", "$100–$500", "$500–$5k", "$5k+", "Unknown"], institutional_value_tag: "financial_fraud" },
                { id: "SCM_05", section: "Impact & Severity", label: "Data exposed?", required: true, answer_type: "multi_select", options: ["Password", "Bank info", "ID document", "SSN", "None", "Unknown"], institutional_value_tag: "civil_rights" },
                { id: "SCM_06", section: "Actor Role & System Involved", label: "Is the actor identifiable?", required: true, answer_type: "single_select", options: ["Yes (name/handle/site)", "No", "Unsure"], institutional_value_tag: "regulatory" }
            ],
            deep_dive_questions: [
                { id: "SCM_DD_01", section: "Failure Mechanism", label: "Tactics used", required: false, answer_type: "multi_select", options: ["Urgency", "Threats", "Fake authority", "Fake support", "Fake tracking", "Other"] },
                { id: "SCM_DD_02", section: "Evidence & Chain-of-Custody", label: "Evidence Type", required: false, answer_type: "multi_select", options: ["Screenshots", "Emails", "Transaction proof", "Call recording", "None"] }
            ]
        },
        [Category.StolenPropertyRegistry]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "SPR_01", section: "Event Context", label: "Report intent", required: true, answer_type: "single_select", options: ["Report stolen item", "Check before purchase", "Claim ownership", "Dispute ownership"], institutional_value_tag: "regulatory" },
                { id: "SPR_02", section: "Item Details", label: "Property type", required: true, answer_type: "single_select", options: ["Phone/electronics", "Vehicle", "Tool", "Jewelry", "Collectible", "Business equipment", "Other"], institutional_value_tag: "audit" },
                { id: "SPR_03", section: "Item Details", label: "Identifier available", required: true, answer_type: "multi_select", options: ["Serial number", "IMEI/VIN", "Unique marks", "Prior receipt", "Photos", "No identifier"], institutional_value_tag: "audit" },
                { id: "SPR_04", section: "Actor Role & System Involved", label: "Ownership status", required: true, answer_type: "single_select", options: ["Original owner", "Current possessor", "Potential buyer", "Witness/third party"], institutional_value_tag: "regulatory" },
                { id: "SPR_05", section: "Actions Taken / Notifications", label: "Official report status", required: true, answer_type: "single_select", options: ["Police report filed", "Insurance claim filed", "Both filed", "Not filed", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "SPR_06", section: "Impact & Severity", label: "Registry flag recommendation", required: true, answer_type: "single_select", options: ["Lost", "Stolen", "Disputed ownership", "Recovered", "Clear"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "SPR_DD_01", section: "Evidence & Chain-of-Custody", label: "Chain-of-custody proof", required: false, answer_type: "multi_select", options: ["Purchase receipt", "Transfer receipt", "Witness", "Repair records", "Photo timeline", "None"] },
                { id: "SPR_DD_02", section: "Actions Taken / Notifications", label: "Need immediate hold alert?", required: false, answer_type: "single_select", options: ["Yes", "No", "Unsure"] }
            ]
        },
        [Category.Education]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "EDU_01", section: "Event Context", label: "Setting", required: true, answer_type: "single_select", options: ["Public", "Private", "Charter", "University", "Daycare", "Other"], institutional_value_tag: "regulatory" },
                { id: "EDU_02", section: "Failure Mechanism", label: "Issue type", required: true, answer_type: "single_select", options: ["Bullying", "Safety hazard", "Staff misconduct", "Discrimination", "Special needs denial", "Food/health", "Underfunding", "Other"], institutional_value_tag: "civil_rights" },
                { id: "EDU_03", section: "Actor Role & System Involved", label: "Who is affected", required: true, answer_type: "single_select", options: ["Student", "Parent", "Staff", "Community"], institutional_value_tag: "research" },
                { id: "EDU_04", section: "Failure Mechanism", label: "Frequency", required: true, answer_type: "single_select", options: ["One-time", "Repeated", "Ongoing"], institutional_value_tag: "audit" },
                { id: "EDU_05", section: "Actions Taken / Notifications", label: "Admin notified?", required: true, answer_type: "single_select", options: ["Yes", "No", "Unsafe", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "EDU_06", section: "Actions Taken / Notifications", label: "Response", required: true, answer_type: "single_select", options: ["Adequate", "Inadequate", "None", "Unknown"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "EDU_DD_01", section: "Impact & Severity", label: "Number affected", required: false, answer_type: "single_select", options: ["1", "2–5", "6–20", "21+", "Unknown"] },
                { id: "EDU_DD_02", section: "Evidence & Chain-of-Custody", label: "Documentation", required: false, answer_type: "multi_select", options: ["Emails", "Incident reports", "Photos", "Witnesses", "None"] }
            ]
        },
        [Category.ElderlyCare]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "ELD_01", section: "Event Context", label: "Facility type", required: true, answer_type: "single_select", options: ["Nursing home", "Assisted living", "ARF", "Memory care", "Home care", "Other"], institutional_value_tag: "regulatory" },
                { id: "ELD_02", section: "Failure Mechanism", label: "Concern type", required: true, answer_type: "single_select", options: ["Neglect", "Medication error", "Hygiene/sanitation", "Nutrition/dehydration", "Falls/safety", "Abuse", "Financial exploitation", "Other"], institutional_value_tag: "public_health" },
                { id: "ELD_03", section: "Impact & Severity", label: "Urgency", required: true, answer_type: "single_select", options: ["No immediate risk", "Possible risk", "Immediate danger"], institutional_value_tag: "safety" },
                { id: "ELD_04", section: "Actor Role & System Involved", label: "Staffing level observed", required: true, answer_type: "single_select", options: ["Adequate", "Inadequate", "Unknown"], institutional_value_tag: "audit" },
                { id: "ELD_05", section: "Actions Taken / Notifications", label: "Management notified", required: true, answer_type: "single_select", options: ["Yes", "No", "Unsafe", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "ELD_06", section: "Failure Mechanism", label: "Pattern", required: true, answer_type: "single_select", options: ["One-time", "Repeated", "Ongoing", "Unknown"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "ELD_DD_01", section: "Impact & Severity", label: "Health impact", required: false, answer_type: "multi_select", options: ["Injury", "Infection", "Weight loss", "Dehydration", "Bedsores", "Hospitalization", "None", "Unknown"] },
                { id: "ELD_DD_02", section: "Evidence & Chain-of-Custody", label: "Evidence Type", required: false, answer_type: "multi_select", options: ["Photos conditions", "Care logs", "Bills", "Witnesses", "None"] }
            ]
        },
        [Category.Environment]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "ENV_01", section: "Event Context", label: "Medium affected", required: true, answer_type: "single_select", options: ["Air", "Water", "Soil", "Noise", "Wildlife", "Other"], institutional_value_tag: "environmental" },
                { id: "ENV_02", section: "Actor Role & System Involved", label: "Suspected source type", required: true, answer_type: "single_select", options: ["Industrial", "Municipal", "Agricultural", "Construction", "Landfill", "Unknown", "Other"], institutional_value_tag: "regulatory" },
                { id: "ENV_03", section: "Failure Mechanism", label: "What did you observe", required: true, answer_type: "multi_select", options: ["Odor", "Smoke", "Discoloration", "Oil sheen", "Dead wildlife", "Overflow", "Other"], institutional_value_tag: "environmental" },
                { id: "ENV_04", section: "Failure Mechanism", label: "Duration", required: true, answer_type: "single_select", options: ["Single event", "Days", "Weeks", "Months", "Unknown"], institutional_value_tag: "audit" },
                { id: "ENV_05", section: "Impact & Severity", label: "Human exposure likely", required: true, answer_type: "multi_select", options: ["Inhalation", "Skin contact", "Drinking/food chain", "None", "Unknown"], institutional_value_tag: "public_health" },
                { id: "ENV_06", section: "Impact & Severity", label: "Area size", required: true, answer_type: "single_select", options: ["Single site", "Neighborhood", "Citywide", "Unknown"], institutional_value_tag: "environmental" }
            ],
            deep_dive_questions: [
                { id: "ENV_DD_01", section: "Event Context", label: "Weather conditions", required: false, answer_type: "single_select", options: ["Normal", "Heavy rain", "High wind", "Heat", "Unknown"] },
                { id: "ENV_DD_02", section: "Impact & Severity", label: "Symptoms cluster", required: false, answer_type: "multi_select", options: ["Respiratory", "Skin", "GI", "Headache", "None", "Unknown"] },
                { id: "ENV_DD_03", section: "Failure Mechanism", label: "Prior complaints known", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.Events]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "EVT_01", section: "Event Context", label: "Event type", required: true, answer_type: "single_select", options: ["Concert", "Sports", "Festival", "Conference", "Other"], institutional_value_tag: "regulatory" },
                { id: "EVT_02", section: "Actor Role & System Involved", label: "Ticket source", required: true, answer_type: "single_select", options: ["Official", "Reseller", "Transfer", "Unknown"], institutional_value_tag: "financial_fraud" },
                { id: "EVT_03", section: "Failure Mechanism", label: "Verification method used", required: true, answer_type: "single_select", options: ["QR only", "Blockchain+QR", "Manual check", "None", "Unknown"], institutional_value_tag: "audit" },
                { id: "EVT_04", section: "Failure Mechanism", label: "Problem type", required: true, answer_type: "single_select", options: ["Duplicate/invalid", "Price gouging", "Hidden fees", "Seat mismatch", "Refund refused", "Entry denied", "Other"], institutional_value_tag: "financial_fraud" },
                { id: "EVT_05", section: "Impact & Severity", label: "Loss range", required: true, answer_type: "currency_range", options: ["None", "<$100", "$100–$500", "$500–$5k", "$5k+", "Unknown"], institutional_value_tag: "financial_fraud" },
                { id: "EVT_06", section: "Impact & Severity", label: "Scale affected", required: true, answer_type: "single_select", options: ["Just me", "Multiple attendees", "Widespread", "Unknown"], institutional_value_tag: "research" }
            ],
            deep_dive_questions: [
                { id: "EVT_DD_01", section: "Evidence & Chain-of-Custody", label: "Proof available", required: false, answer_type: "multi_select", options: ["Ticket screenshot", "Receipt", "Listing screenshot", "Venue communication", "None"] },
                { id: "EVT_DD_02", section: "Evidence & Chain-of-Custody", label: "QR/hash captured?", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.HousingIssues]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "HSI_01", section: "Actor Role & System Involved", label: "Role", required: true, answer_type: "single_select", options: ["Tenant", "Owner", "Neighbor", "Inspector", "Other"], institutional_value_tag: "regulatory" },
                { id: "HSI_02", section: "Failure Mechanism", label: "Issue category", required: true, answer_type: "multi_select", options: ["Unsafe wiring", "Water leak/mold", "No heat/AC", "Pests", "Structural damage", "Security/locks", "Sanitation", "Other"], institutional_value_tag: "safety" },
                { id: "HSI_03", section: "Impact & Severity", label: "Urgency", required: true, answer_type: "single_select", options: ["Low", "Medium", "High", "Immediate danger"], institutional_value_tag: "public_health" },
                { id: "HSI_04", section: "Actions Taken / Notifications", label: "Landlord/manager notified", required: true, answer_type: "single_select", options: ["Yes written", "Yes verbal", "No", "Unknown"], institutional_value_tag: "audit" },
                { id: "HSI_05", section: "Actions Taken / Notifications", label: "Authority notified", required: true, answer_type: "single_select", options: ["Housing authority", "Code enforcement", "Legal aid", "No", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "HSI_06", section: "Impact & Severity", label: "Residents at risk", required: true, answer_type: "multi_select", options: ["Children", "Elderly", "Disabled", "Pregnant", "None", "Unknown"], institutional_value_tag: "safety" }
            ],
            deep_dive_questions: [
                { id: "HSI_DD_01", section: "Impact & Severity", label: "Displacement risk", required: false, answer_type: "single_select", options: ["No", "Potential", "Already displaced", "Unknown"] },
                { id: "HSI_DD_02", section: "Evidence & Chain-of-Custody", label: "Evidence bundle", required: false, answer_type: "multi_select", options: ["Photos", "Inspection reports", "Medical notes", "Repair requests", "None"] }
            ]
        },
        [Category.Infrastructure]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "INF_01", section: "Actor Role & System Involved", label: "Asset type", required: true, answer_type: "single_select", options: ["Road", "Sidewalk", "Bridge", "Lighting", "Drainage", "Public building", "Utility", "Other"], institutional_value_tag: "regulatory" },
                { id: "INF_02", section: "Failure Mechanism", label: "Hazard type", required: true, answer_type: "single_select", options: ["Pothole", "Collapse", "Flooding", "Missing signage", "Accessibility barrier", "Exposed wiring", "Other"], institutional_value_tag: "safety" },
                { id: "INF_03", section: "Failure Mechanism", label: "Hazard marking", required: true, answer_type: "single_select", options: ["Marked", "Unmarked", "Poorly marked", "Unknown"], institutional_value_tag: "audit" },
                { id: "INF_04", section: "Impact & Severity", label: "Injury occurred", required: true, answer_type: "single_select", options: ["Yes", "No", "Unknown"], institutional_value_tag: "safety" },
                { id: "INF_05", section: "Impact & Severity", label: "Exposure level", required: true, answer_type: "single_select", options: ["Low", "Medium", "High"], institutional_value_tag: "audit" },
                { id: "INF_06", section: "Failure Mechanism", label: "Repeated issue", required: true, answer_type: "single_select", options: ["First time", "Recurring", "Unknown"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "INF_DD_01", section: "Impact & Severity", label: "Measurements", required: false, answer_type: "short_text", help_text: "depth/size estimate" },
                { id: "INF_DD_02", section: "Failure Mechanism", label: "Prior reports known", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.InsuranceFraud]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "INS_01", section: "Event Context", label: "Policy type", required: true, answer_type: "single_select", options: ["Auto", "Home", "Health", "Life", "Disability", "Other"], institutional_value_tag: "regulatory" },
                { id: "INS_02", section: "Actions Taken / Notifications", label: "Claim status", required: true, answer_type: "single_select", options: ["Not filed", "Filed", "Pending", "Denied", "Paid", "Closed"], institutional_value_tag: "audit" },
                { id: "INS_03", section: "Failure Mechanism", label: "Main issue", required: true, answer_type: "single_select", options: ["Delay", "Underpayment", "Denial without basis", "Misrepresentation", "Document obstruction", "Harassment", "Other"], institutional_value_tag: "financial_fraud" },
                { id: "INS_04", section: "Event Context", label: "Time since claim", required: true, answer_type: "single_select", options: ["<2 weeks", "2–8 weeks", "2–6 months", ">6 months", "Unknown"], institutional_value_tag: "audit" },
                { id: "INS_05", section: "Impact & Severity", label: "Financial impact", required: true, answer_type: "currency_range", options: ["None", "<$500", "$500–$5k", "$5k–$50k", "$50k+", "Unknown"], institutional_value_tag: "financial_fraud" },
                { id: "INS_06", section: "Evidence & Chain-of-Custody", label: "Evidence Type", required: true, answer_type: "multi_select", options: ["Emails", "Letters", "Call logs", "Estimate reports", "Denial letter", "None"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "INS_DD_01", section: "Failure Mechanism", label: "Contradictory reasons given", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] },
                { id: "INS_DD_02", section: "Impact & Severity", label: "Vulnerable status affected", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.MedicalNegligence]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "MED_01", section: "Event Context", label: "Setting", required: true, answer_type: "single_select", options: ["ER", "Hospital", "Clinic", "Telehealth", "Long-term care", "Other"], institutional_value_tag: "regulatory" },
                { id: "MED_02", section: "Actor Role & System Involved", label: "Care type", required: true, answer_type: "single_select", options: ["Diagnosis", "Medication", "Procedure", "Monitoring", "Discharge", "Follow-up"], institutional_value_tag: "public_health" },
                { id: "MED_03", section: "Failure Mechanism", label: "Observed failure", required: true, answer_type: "multi_select", options: ["Delay in care", "Wrong med/dose", "Missed diagnosis", "Failure to monitor", "Poor discharge", "Infection control issue", "Other"], institutional_value_tag: "safety" },
                { id: "MED_04", section: "Impact & Severity", label: "Outcome severity", required: true, answer_type: "single_select", options: ["No harm", "Temporary harm", "Serious harm", "Permanent harm", "Death"], institutional_value_tag: "public_health" },
                { id: "MED_05", section: "Event Context", label: "Timeline confidence", required: true, answer_type: "single_select", options: ["Exact", "Approximate", "Uncertain"], institutional_value_tag: "audit" },
                { id: "MED_06", section: "Evidence & Chain-of-Custody", label: "Records available", required: true, answer_type: "multi_select", options: ["Discharge papers", "Prescriptions", "Labs", "Imaging", "None"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "MED_DD_01", section: "Actions Taken / Notifications", label: "Second opinion obtained", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] },
                { id: "MED_DD_02", section: "Failure Mechanism", label: "Red-flag symptoms ignored?", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] },
                { id: "MED_DD_03", section: "Impact & Severity", label: "Hospitalization required", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.NonProfit]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "NPO_01", section: "Actor Role & System Involved", label: "Your role", required: true, answer_type: "single_select", options: ["Donor", "Volunteer", "Beneficiary", "Staff", "Observer"], institutional_value_tag: "regulatory" },
                { id: "NPO_02", section: "Failure Mechanism", label: "Concern type", required: true, answer_type: "single_select", options: ["Misuse of funds", "False advertising", "Lack of reporting", "Conflict of interest", "Services not delivered", "Other"], institutional_value_tag: "financial_fraud" },
                { id: "NPO_03", section: "Impact & Severity", label: "Funds involved", required: true, answer_type: "currency_range", options: ["<$100", "$100–$1k", "$1k–$10k", "$10k+", "Unknown"], institutional_value_tag: "financial_fraud" },
                { id: "NPO_04", section: "Failure Mechanism", label: "Transparency available", required: true, answer_type: "single_select", options: ["Public reports available", "Partial", "None", "Unknown"], institutional_value_tag: "audit" },
                { id: "NPO_05", section: "Failure Mechanism", label: "Pattern", required: true, answer_type: "single_select", options: ["One-time", "Repeated", "Ongoing", "Unknown"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "NPO_DD_01", section: "Evidence & Chain-of-Custody", label: "Evidence Type", required: false, answer_type: "multi_select", options: ["Receipts", "Campaign page", "Emails", "Photos", "Witnesses", "None"] },
                { id: "NPO_DD_02", section: "Impact & Severity", label: "Beneficiaries harmed?", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.PoliceMisconduct]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "POL_01", section: "Event Context", label: "Encounter type", required: true, answer_type: "single_select", options: ["Stop", "Search", "Arrest", "Detention", "Use of force", "Property seizure", "Other"], institutional_value_tag: "civil_rights" },
                { id: "POL_02", section: "Event Context", label: "Reason given", required: true, answer_type: "short_text", institutional_value_tag: "regulatory" },
                { id: "POL_03", section: "Failure Mechanism", label: "Force level", required: true, answer_type: "single_select", options: ["None", "Verbal threats", "Physical restraint", "Weapon displayed", "Weapon used"], institutional_value_tag: "civil_rights" },
                { id: "POL_04", section: "Impact & Severity", label: "Injury or medical need", required: true, answer_type: "single_select", options: ["Yes", "No", "Unknown"], institutional_value_tag: "safety" },
                { id: "POL_05", section: "Actor Role & System Involved", label: "Body camera observed", required: true, answer_type: "single_select", options: ["Yes", "No", "Unknown"], institutional_value_tag: "audit" },
                { id: "POL_06", section: "Actor Role & System Involved", label: "Witnesses", required: true, answer_type: "single_select", options: ["Yes", "No", "Unknown"], institutional_value_tag: "audit" },
                { id: "POL_07", section: "Actions Taken / Notifications", label: "Outcome", required: true, answer_type: "single_select", options: ["Released", "Cited", "Arrested", "Property seized", "Other"], institutional_value_tag: "regulatory" }
            ],
            deep_dive_questions: [
                { id: "POL_DD_01", section: "Impact & Severity", label: "Detention duration", required: false, answer_type: "single_select", options: ["<15 min", "15–60", "1–6 hrs", ">6 hrs", "Unknown"] },
                { id: "POL_DD_02", section: "Evidence & Chain-of-Custody", label: "Evidence Type", required: false, answer_type: "multi_select", options: ["Video", "Photos", "Medical record", "Witness contact (optional)", "None"] }
            ]
        },
        [Category.ProfessionalServices]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "PRF_01", section: "Actor Role & System Involved", label: "Profession", required: true, answer_type: "single_select", options: ["Legal", "Medical", "Accounting", "Engineering", "Financial", "Real estate", "Other"], institutional_value_tag: "regulatory" },
                { id: "PRF_02", section: "Event Context", label: "Engagement type", required: true, answer_type: "single_select", options: ["Consultation", "Ongoing contract", "One-time project", "Representation"], institutional_value_tag: "audit" },
                { id: "PRF_03", section: "Failure Mechanism", label: "Issue type", required: true, answer_type: "single_select", options: ["Abandonment", "Misrepresentation", "Billing irregularity", "Conflict of interest", "Confidentiality breach", "Gross incompetence", "Other"], institutional_value_tag: "financial_fraud" },
                { id: "PRF_04", section: "Actor Role & System Involved", label: "Scope disclosed", required: true, answer_type: "single_select", options: ["Yes", "No", "Unknown"], institutional_value_tag: "audit" },
                { id: "PRF_05", section: "Impact & Severity", label: "Harm type", required: true, answer_type: "multi_select", options: ["Financial", "Missed deadline", "Safety risk", "Regulatory exposure", "Other"], institutional_value_tag: "financial_fraud" },
                { id: "PRF_06", section: "Impact & Severity", label: "Loss range", required: true, answer_type: "currency_range", options: ["None", "<$100", "$100–$500", "$500–$5k", "$5k+", "Unknown"], institutional_value_tag: "financial_fraud" }
            ],
            deep_dive_questions: [
                { id: "PRF_DD_01", section: "Evidence & Chain-of-Custody", label: "Proof", required: false, answer_type: "multi_select", options: ["Contract", "Invoice", "Emails/messages", "Work product", "None"] },
                { id: "PRF_DD_02", section: "Impact & Severity", label: "Time impact", required: false, answer_type: "single_select", options: ["No impact", "Minor delay", "Major delay", "Lost rights/deadlines", "Unknown"] }
            ]
        },
        [Category.PublicTransport]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "TRN_01", section: "Actor Role & System Involved", label: "Mode", required: true, answer_type: "single_select", options: ["Bus", "Metro", "Train", "Ferry", "Other"], institutional_value_tag: "regulatory" },
                { id: "TRN_02", section: "Failure Mechanism", label: "Issue type", required: true, answer_type: "single_select", options: ["Safety hazard", "Accessibility", "Delay", "Overcrowding", "Harassment", "Fare enforcement", "Mechanical failure", "Other"], institutional_value_tag: "safety" },
                { id: "TRN_03", section: "Actor Role & System Involved", label: "Route/line known", required: true, answer_type: "single_select", options: ["Yes", "No", "Unknown"], institutional_value_tag: "audit" },
                { id: "TRN_04", section: "Actions Taken / Notifications", label: "Staff response", required: true, answer_type: "single_select", options: ["Adequate", "Inadequate", "None", "Unknown"], institutional_value_tag: "audit" },
                { id: "TRN_05", section: "Impact & Severity", label: "Accessibility impacted", required: true, answer_type: "single_select", options: ["Yes", "No", "Unknown"], institutional_value_tag: "civil_rights" },
                { id: "TRN_06", section: "Failure Mechanism", label: "Repeat issue", required: true, answer_type: "single_select", options: ["First time", "Repeated", "Ongoing", "Unknown"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "TRN_DD_01", section: "Impact & Severity", label: "Crowd level", required: false, answer_type: "single_select", options: ["Low", "Medium", "High", "Extreme"] },
                { id: "TRN_DD_02", section: "Evidence & Chain-of-Custody", label: "Evidence Type", required: false, answer_type: "multi_select", options: ["Photos", "Video", "Complaint #", "Witnesses", "None"] }
            ]
        },
        [Category.Travel]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "TRV_01", section: "Event Context", label: "Travel type", required: true, answer_type: "single_select", options: ["Airline", "Rail", "Bus", "Cruise", "Hotel", "Rideshare", "Other"], institutional_value_tag: "regulatory" },
                { id: "TRV_02", section: "Failure Mechanism", label: "Issue type", required: true, answer_type: "single_select", options: ["Cancellation", "Delay", "Overbooking", "Lost baggage/property", "Safety", "Accessibility", "Fraudulent charge", "Staff misconduct", "Other"], institutional_value_tag: "audit" },
                { id: "TRV_03", section: "Actions Taken / Notifications", label: "Assistance offered", required: true, answer_type: "single_select", options: ["Refund", "Voucher", "Rebook", "None", "Unknown"], institutional_value_tag: "financial_fraud" },
                { id: "TRV_04", section: "Impact & Severity", label: "Financial impact", required: true, answer_type: "currency_range", options: ["None", "<$100", "$100–$500", "$500–$5k", "$5k+", "Unknown"], institutional_value_tag: "financial_fraud" },
                { id: "TRV_05", section: "Actor Role & System Involved", label: "Vulnerable traveler", required: true, answer_type: "single_select", options: ["Yes", "No", "Unknown"], institutional_value_tag: "safety" },
                { id: "TRV_06", section: "Evidence & Chain-of-Custody", label: "Evidence Type", required: true, answer_type: "multi_select", options: ["Booking confirmation", "Receipts", "Messages", "Photos", "None"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "TRV_DD_01", section: "Impact & Severity", label: "Delay duration", required: false, answer_type: "single_select", options: ["<2 hrs", "2–6", "6–24", ">24", "Unknown"] },
                { id: "TRV_DD_02", section: "Actions Taken / Notifications", label: "Accommodation provided", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.VeteransServices]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "VET_01", section: "Actor Role & System Involved", label: "Service area", required: true, answer_type: "single_select", options: ["Benefits/claims", "Healthcare", "Housing", "Employment", "Records", "Mental health access", "Other"], institutional_value_tag: "regulatory" },
                { id: "VET_02", section: "Actor Role & System Involved", label: "Provider type", required: true, answer_type: "single_select", options: ["VA", "Contractor", "Local agency", "Nonprofit", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "VET_03", section: "Failure Mechanism", label: "Issue type", required: true, answer_type: "single_select", options: ["Delay", "Denial", "Lost records", "Poor treatment", "Access barriers", "Discrimination", "Other"], institutional_value_tag: "audit" },
                { id: "VET_04", section: "Event Context", label: "Waiting time", required: true, answer_type: "single_select", options: ["<2 weeks", "2–8 weeks", "2–6 months", ">6 months", "Unknown"], institutional_value_tag: "audit" },
                { id: "VET_05", section: "Impact & Severity", label: "Impact severity", required: true, answer_type: "single_select", options: ["Low", "Moderate", "High", "Critical"], institutional_value_tag: "public_health" },
                { id: "VET_06", section: "Actions Taken / Notifications", label: "Escalation attempted", required: true, answer_type: "single_select", options: ["Yes", "No", "Unsure"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "VET_DD_01", section: "Evidence & Chain-of-Custody", label: "Documentation available", required: false, answer_type: "multi_select", options: ["Decision letter", "Appointment records", "Emails", "Case #", "None"] },
                { id: "VET_DD_02", section: "Impact & Severity", label: "Housing/health crisis triggered", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.WaterViolations]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "WTR_01", section: "Actor Role & System Involved", label: "Water system", required: true, answer_type: "single_select", options: ["Drinking water", "Private well", "Wastewater/sewage", "Stormwater", "River/lake/ocean", "Industrial discharge", "Other", "Unknown"], institutional_value_tag: "environmental" },
                { id: "WTR_02", section: "Failure Mechanism", label: "Observation", required: true, answer_type: "multi_select", options: ["Odor", "Color change", "Sediment", "Oil sheen", "Foam", "Sewage overflow", "Dead wildlife", "Algae bloom", "Low pressure", "Flooding", "Other"], institutional_value_tag: "environmental" },
                { id: "WTR_03", section: "Impact & Severity", label: "Exposure pathway", required: true, answer_type: "multi_select", options: ["Drank/cooked", "Bathing", "Skin contact", "Inhalation", "Pets/livestock", "None", "Unknown"], institutional_value_tag: "public_health" },
                { id: "WTR_04", section: "Event Context", label: "Duration", required: true, answer_type: "single_select", options: ["Minutes", "Hours", "Days", "Weeks", "Months", "Unknown"], institutional_value_tag: "audit" },
                { id: "WTR_05", section: "Impact & Severity", label: "Symptoms reported", required: true, answer_type: "multi_select", options: ["None", "GI", "Skin", "Respiratory", "Headache/dizziness", "F fever", "Pet illness", "Unknown"], institutional_value_tag: "public_health" },
                { id: "WTR_06", section: "Impact & Severity", label: "Area affected", required: true, answer_type: "single_select", options: ["Single home/site", "Neighborhood", "Citywide", "Unknown"], institutional_value_tag: "environmental" },
                { id: "WTR_07", section: "Actions Taken / Notifications", label: "Reported to authority", required: true, answer_type: "multi_select", options: ["Utility", "Health dept", "Environmental agency", "City services", "Property manager", "No", "Unknown"], institutional_value_tag: "regulatory" }
            ],
            deep_dive_questions: [
                { id: "WTR_DD_01", section: "Failure Mechanism", label: "Suspected contaminant class", required: false, answer_type: "single_select", options: ["Sewage/pathogens", "Industrial chemicals", "Petroleum", "Heavy metals", "Pesticides/fertilizer", "Algae toxins", "Corrosion/rust", "Unknown"] },
                { id: "WTR_DD_02", section: "Evidence & Chain-of-Custody", label: "Sample/test available", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.WorkplaceIssues]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "WKP_01", section: "Event Context", label: "Workplace type", required: true, answer_type: "single_select", options: ["Office", "Retail", "Factory", "Construction", "Healthcare", "Warehouse", "Other"], institutional_value_tag: "regulatory" },
                { id: "WKP_02", section: "Failure Mechanism", label: "Issue type", required: true, answer_type: "single_select", options: ["Safety hazard", "Toxic exposure", "Wage theft", "Harassment", "Discrimination", "Retaliation", "Scheduling abuse", "Other"], institutional_value_tag: "civil_rights" },
                { id: "WKP_03", section: "Failure Mechanism", label: "Frequency", required: true, answer_type: "single_select", options: ["One-time", "Repeated", "Ongoing"], institutional_value_tag: "audit" },
                { id: "WKP_04", section: "Impact & Severity", label: "Immediate danger", required: true, answer_type: "single_select", options: ["Yes", "No", "Unsure"], institutional_value_tag: "safety" },
                { id: "WKP_05", section: "Actions Taken / Notifications", label: "Reported internally", required: true, answer_type: "single_select", options: ["Yes", "No", "Unsafe", "Unknown"], institutional_value_tag: "regulatory" },
                { id: "WKP_06", section: "Evidence & Chain-of-Custody", label: "Evidence Type", required: true, answer_type: "multi_select", options: ["Photos", "Policies", "Messages", "Pay records", "Witnesses", "None"], institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "WKP_DD_01", section: "Failure Mechanism", label: "PPE/safety controls missing", required: false, answer_type: "multi_select", options: ["Gloves", "Mask/respirator", "Ventilation", "Training", "Lockout-tagout", "Other", "Unknown"] },
                { id: "WKP_DD_02", section: "Impact & Severity", label: "Injury/near-miss count", required: false, answer_type: "single_select", options: ["0", "1", "2–5", "6+", "Unknown"] }
            ]
        },
        [Category.Other]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "OTH_01", section: "Event Context", label: "Best match", required: true, answer_type: "single_select", options: ["Health", "Safety", "Finance", "Environment", "Government", "Housing", "Education", "Workplace", "Other"], institutional_value_tag: "regulatory" },
                { id: "OTH_02", section: "Impact & Severity", label: "Immediate risk", required: true, answer_type: "single_select", options: ["None", "Possible", "High", "Unknown"], institutional_value_tag: "safety" },
                { id: "OTH_03", section: "Impact & Severity", label: "Who is affected", required: true, answer_type: "single_select", options: ["Individual", "Multiple people", "Vulnerable persons", "Unknown"], institutional_value_tag: "research" }
            ],
            deep_dive_questions: [
                { id: "OTH_DD_01", section: "Event Context", label: "Suggested new category name", required: false, answer_type: "short_text" },
                { id: "OTH_DD_02", section: "Evidence & Chain-of-Custody", label: "Time-sensitive evidence", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        }
        ,
        [Category.IndependentDiscoveries]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "IND_01", section: "Event Context", label: "Best match", required: true, answer_type: "single_select", options: ["Research breakthrough", "Observation", "Data anomaly", "Other"], institutional_value_tag: "research" },
                { id: "IND_02", section: "Impact & Severity", label: "Immediate risk", required: true, answer_type: "single_select", options: ["None", "Possible", "High", "Unknown"], institutional_value_tag: "safety" },
                { id: "IND_03", section: "Impact & Severity", label: "Who is affected", required: true, answer_type: "single_select", options: ["Individual", "Multiple people", "Community", "Unknown"], institutional_value_tag: "regulatory" }
            ],
            deep_dive_questions: [
                { id: "IND_DD_01", section: "Event Context", label: "Discovery title / label", required: false, answer_type: "short_text" },
                { id: "IND_DD_02", section: "Evidence & Chain-of-Custody", label: "Time-sensitive evidence", required: false, answer_type: "single_select", options: ["Yes", "No", "Unknown"] }
            ]
        },
        [Category.DpalHelp]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "DPH_01", section: "DPAL Help", label: "What do you need help with?", required: true, answer_type: "single_select", options: ["Reporting / app flow", "Account or profile", "Resources or referrals", "Technical issue", "Something else"], institutional_value_tag: "audit" },
                { id: "DPH_02", section: "DPAL Help", label: "Describe your question or blocker", required: true, answer_type: "short_text", institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "DPH_DD_01", section: "DPAL Help", label: "Screen or topic (if known)", required: false, answer_type: "short_text" },
                { id: "DPH_DD_02", section: "DPAL Help", label: "What have you already tried?", required: false, answer_type: "short_text" }
            ]
        },
        [Category.DpalLifts]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "DPL_01", section: "DPAL Lifts", label: "What assistance or ride context should we know?", required: true, answer_type: "short_text", institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "DPL_DD_01", section: "DPAL Lifts", label: "Pickup / destination or organization (if applicable)", required: false, answer_type: "short_text" }
            ]
        },
        [Category.DpalWorkNetwork]: {
            core_questions: [
                ...GLOBAL_CORE,
                { id: "DWN_01", section: "DPAL Work Network", label: "Mission or workplace objective (summary)", required: true, answer_type: "short_text", institutional_value_tag: "audit" }
            ],
            deep_dive_questions: [
                { id: "DWN_DD_01", section: "DPAL Work Network", label: "Category or skill tags (optional)", required: false, answer_type: "short_text" }
            ]
        }
    }
};

export const EDUCATION_ROLES = [
    { value: EducationRole.Teacher, translationKey: "educationRoles.teacher", descriptionKey: "educationRoles.teacherDesc", icon: "🍎" },
    { value: EducationRole.Student, translationKey: "educationRoles.student", descriptionKey: "educationRoles.studentDesc", icon: "🎒" },
    { value: EducationRole.Employee, translationKey: "educationRoles.employee", descriptionKey: "educationRoles.employeeDesc", icon: "📎" },
    { value: EducationRole.Observer, translationKey: "educationRoles.observer", descriptionKey: "educationRoles.observerDesc", icon: "👁️" },
];

export const ACADEMY_CURRICULUM: TrainingModule[] = [
    { 
        id: 'MOD-REP-01', 
        title: 'Protocol: Field Reporting', 
        description: 'Master the DPAL standard for capturing high-fidelity evidence. Learn to synchronize visual telemetry with geospatial anchors for maximum verification authority.', 
        skillType: 'Technical', 
        masteryReward: 100, 
        isLocked: false,
        notAskedToDo: 'This is a technical data gathering protocol. Do not attempt to engage with hostile subjects during reporting.',
        indicators: ['Clear line of sight', 'Multi-angle capture', 'Timestamp synchronization', 'Geolocation lock'],
        checklist: ['Establish secure perimeter', 'Calibrate optics for 4K capture', 'Verify P2P relay connection', 'Archive raw telemetry to buffer']
    },
    { 
        id: 'MOD-NVC-01', 
        title: 'NVC: Observation vs. Evaluation', 
        description: 'Marshall Rosenberg Protocol: Learning to record field data without personal judgment or moralistic filters.', 
        skillType: 'Social', 
        masteryReward: 75, 
        isLocked: false,
        notAskedToDo: 'This is not psychological therapy. Do not attempt to diagnose mental states of subjects.',
        indicators: ['Evaluation-heavy language', 'Judgmental adjectives', 'Assumption of intent', 'Neutral fact-stripping'],
        checklist: ['Isolate the visual fact', 'Remove "Good/Bad" labels', 'Identify the specific stimulus', 'Anchor to timestamps']
    },
    { 
        id: 'MOD-NVC-02', 
        title: 'NVC: Universal Needs Awareness', 
        description: 'Marshall Rosenberg Protocol: Identifying the unmet needs driving civic misconduct and communal friction.', 
        skillType: 'Empathy', 
        masteryReward: 80, 
        isLocked: false,
        notAskedToDo: 'You are not a counselor. This is for situational intelligence gathering only.',
        indicators: ['Demand-based language', 'Reactive hostility', 'Fear of scarcity', 'Need for recognition/safety'],
        checklist: ['Map subject Reactive patterns', 'Hypothesize underlying need', 'Formulate non-hostile inquiry', 'Log for mediator referral']
    },
    { 
        id: 'MOD-CE-01', 
        title: 'Char: Character Integrity Audit', 
        description: 'Character Evaluation: Self-assessment of operative bias when auditing high-emotion environments like clergy or police.', 
        skillType: 'Wisdom', 
        masteryReward: 100, 
        isLocked: false,
        notAskedToDo: 'Do not ignore evidence because of personal ideological alignment.',
        indicators: ['Confirmation bias', 'Selective data capture', 'Emotional mirroring', 'Operative fatigue'],
        checklist: ['Identify personal triggers', 'Verify counter-evidence exists', 'Perform 10-minute neutrality reset', 'Confirm evidence chain']
    },
];

export const RANKS: Rank[] = [
  { level: 1, title: 'Citizen', xpNeeded: 0, perk: 'Join neighbors who speak up with care.' },
  { level: 2, title: 'Scout', xpNeeded: 100, perk: 'Small steps—daily ways to help nearby.' },
  { level: 3, title: 'Guardian', xpNeeded: 500, perk: 'Stand with others to verify what matters.' },
  { level: 4, title: 'Sentinel', xpNeeded: 1500, perk: 'See patterns and protect your community.' },
  { level: 5, title: 'Legend', xpNeeded: 5000, perk: 'Inspire others—unity that lasts.' },
];

export const INITIAL_HERO_PROFILE: Hero = {
    name: "Jordan Rivera",
    handle: "jordan_helps",
    bio: "Parent, neighbor, and helper—here to lift others up and keep our community honest and kind.",
    operativeId: "849201",
    level: 3,
    xp: 650,
    xpToNextLevel: 1500,
    heroCredits: 4200,
    reputation: 850,
    legendTokens: 12,
    rank: 3,
    title: 'Guardian',
    unlockedTitles: ['Candidate', 'Citizen', 'Guardian'],
    equippedTitle: 'Guardian',
    inventory: [
        { id: 'aug-01', name: 'Neighbor Kindness Kit', type: 'Augmentation', icon: '🤝', resonance: 3, bonusSkill: 'Social', bonusValue: 15 },
        { id: 'aug-02', name: 'Clear-Sight Notes', type: 'Augmentation', icon: '📋', resonance: 2, bonusSkill: 'Forensic', bonusValue: 20 },
    ],
    base: { name: 'Home & neighborhood', level: 2, status: 'Active' },
    personas: [],
    equippedPersonaId: null,
    theme: 'light',
    masteryScore: 240,
    wisdomMastery: 45,
    socialMastery: 60,
    civicMastery: 35,
    environmentalMastery: 20,
    infrastructureMastery: 30,
    skills: [],
    path: HeroPath.Steward,
    unlockedItemSkus: ['badge_first_report'],
    activeParcels: [],
    subscriptionTier: SubscriptionTier.Scout,
    settings: {
        privacy: { publicProfile: true, showStats: true, showInventory: true, allowDms: true, anonymousReporting: false },
        notifications: { dailyChallenge: true, missionAvailable: true, verificationRequests: true, purchaseReceipts: true, mintConfirmations: true },
        preferences: { language: 'EN', locationPrecision: 'gps', theme: 'light' }
    },
    stats: {
        reportsSubmitted: 15,
        reportsVerified: 12,
        missionsCompleted: 5,
        upvotesReceived: 142,
        impactScore: 850,
        dollarsSaved: 4500,
        topCategories: [Category.Environment, Category.Infrastructure],
        strongestCategory: Category.Environment
    },
    streak: 5
};

export const MOCK_REPORTS: Report[] = [
    {
        id: 'rep-001',
        title: 'UNAUTHORIZED STOP & FRISK',
        description: 'Observed and recorded a plainclothes unit conducting non-consensual searches without probable cause at the Metro North intersection. Evidence includes 4K video of the badge avoidance and failure to provide documentation. Ledger timestamp sync confirms the unit was out of their assigned sector at the time of the encounter.',
        category: Category.PoliceMisconduct,
        location: 'Metro North, Block 12, Sector A',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        hash: '0x9d2f8c12a3b1b77e',
        blockchainRef: 'txn_0x4f128c9b2e',
        status: 'In Review',
        trustScore: 82,
        // FIX: Added missing required Report properties
        severity: 'Critical',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/police-patrol-night/800/600']
    },
    {
        id: 'rep-002',
        title: 'ALGORITHMIC RENT HIKING',
        description: 'Detected a 35% automated rent increase across properties owned by the Vertex Group. Trace data shows the price-fixing packets originating from a single central server node disguised as P2P market adjustments, redlining low-income sectors.',
        category: Category.HousingIssues,
        location: 'Riverside District, Units 101-112',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        hash: '0xe88aff4392c1002d',
        blockchainRef: 'txn_0x1122334455',
        status: 'Resolved',
        trustScore: 94,
        credsEarned: 450,
        // FIX: Added missing required Report properties
        severity: 'Critical',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/urban-housing-blueprint/800/600']
    },
    {
        id: 'rep-003',
        title: 'INDUSTRIAL EFFLUENT LEAK',
        description: 'Sensor nodes in storm drains behind the Chemical Reclamation Plant recorded pH levels of 2.8. Visual inspection confirms a viscous residue flowing directly into the public tributary. Chemical fingerprinting suggests high mercury concentrations.',
        category: Category.Environment,
        location: 'Lower Tributary, Industrial Zone 4',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
        hash: '0x33bc776da00129bc',
        blockchainRef: 'txn_0x9988776655',
        status: 'Submitted',
        trustScore: 71,
        // FIX: Added missing required Report properties
        severity: 'Critical',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/factory-pollution-river/800/600']
    },
    {
        id: 'rep-006',
        title: 'WAGE THEFT PROTOCHOL BREACH',
        description: 'Construction workers at the "Helix Tower" site reported missing overtime pay for three consecutive cycles. Manual audit of P2P attendance logs reveals a discrepancy between gate-sensor data and the central payroll ledger. Total stolen value estimated at 14,000 credits.',
        category: Category.WorkplaceIssues,
        location: 'Downtown Core, Helix Tower Site',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18),
        hash: '0x7e22cc81a1b44cce',
        blockchainRef: 'txn_0x82299cc11a',
        status: 'In Review',
        trustScore: 88,
        // FIX: Added missing required Report properties
        severity: 'Standard',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/construction-site-night/800/600']
    },
    {
        id: 'rep-007',
        title: 'VETERAN GRANT MISALLOCATION',
        description: 'Audit of the VFW Sector 9 ledger shows $50k in transition housing grants diverted to "Administrative Overhead" without member consent. Shard includes scanned receipts for non-essential luxury refurbishments in the admin node.',
        category: Category.VeteransServices,
        location: 'VFW Post 9, West Sector',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
        hash: '0x1199dd33cc77aa55',
        blockchainRef: 'txn_0x1234567890',
        status: 'Submitted',
        trustScore: 65,
        // FIX: Added missing required Report properties
        severity: 'Standard',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/military-memorial/800/600']
    },
    {
        id: 'rep-008',
        title: 'TRANSIT GHOSTING ANOMALY',
        description: 'Route 44 buses consistently "vanishing" from the public GPS relay despite active driver nodes. Field observation confirms drivers are skipping designated stops in lower-income sectors to meet "Optimization Quotas." 12 separate citizen dispatches synced.',
        category: Category.PublicTransport,
        location: 'Route 44, East End Loop',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        hash: '0xaa11bb22cc33dd44',
        blockchainRef: 'txn_0x9876543210',
        status: 'In Review',
        trustScore: 79,
        // FIX: Added missing required Report properties
        severity: 'Informational',
        isActionable: false,
        imageUrls: ['https://picsum.photos/seed/bus-station-rain/800/600']
    },
    {
        id: 'rep-009',
        title: 'STRUCTURAL STRESS ANOMALY',
        description: 'Pier 14 support columns showing severe salt-water erosion beyond public safety reports. Neural scan of the structural grid reveals a 22% weight-bearing deficit. Port Authority has ignored previous community alerts; ledger persistence requested.',
        category: Category.Infrastructure,
        location: 'Pier 14, Commercial Harbor',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
        hash: '0xff00ee11dd22cc33',
        blockchainRef: 'txn_0x5544332211',
        status: 'Resolved',
        trustScore: 91,
        credsEarned: 600,
        // FIX: Added missing required Report properties
        severity: 'Critical',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/bridge-understructure/800/600']
    },
    {
        id: 'rep-010',
        title: 'CULINARY TRACE CONTAMINATION',
        description: 'Restaurant "The Golden Plate" served an allergen-free dish containing trace peanut proteins. Field lab analysis of the sample shows improper hygiene in the prep sector. Shard contains the victim\'s medical bill and the failed lab audit.',
        category: Category.Allergies,
        location: 'Culinary Row, Unit 4B',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        hash: '0x9988776655443322',
        blockchainRef: 'txn_0x00aabbccdd',
        status: 'In Review',
        trustScore: 84,
        // FIX: Added missing required Report properties
        severity: 'Standard',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/restaurant-kitchen/800/600']
    },
    {
        id: 'rep-011',
        title: 'COLLISION PATTERN INFERENCE',
        description: 'Identified a recurring insurance fraud pattern at Intersection 5. Three "accidents" involving the same silver sedan over 6 months. Shard includes P2P dashcam footage showing the sedan intentionally braking in blind spots. Ring suspected.',
        category: Category.InsuranceFraud,
        location: 'Intersection 5, North Way',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
        hash: '0x1212343456567878',
        blockchainRef: 'txn_0x6677889900',
        status: 'Submitted',
        trustScore: 72,
        // FIX: Added missing required Report properties
        severity: 'Standard',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/car-accident/800/600']
    },
    {
        id: 'rep-012',
        title: 'STEWARDSHIP AUDIT FAILURE',
        description: 'Diocese Sector 3 redirected $12k in "Community Bread" funds to private luxury travel for clergy administrators. Handshake audit of the donation ledger reveals falsified allocation receipts. Permanent record committed for parishioner review.',
        category: Category.Clergy,
        location: 'St. Pauls Node, South Sector',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 50),
        hash: '0x887755331199eecc',
        blockchainRef: 'txn_0xabcdef1234',
        status: 'In Review',
        trustScore: 87,
        // FIX: Added missing required Report properties
        severity: 'Standard',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/cathedral-interior/800/600']
    },
    {
        id: 'rep-013',
        title: 'LEAD CONVERGENCE DETECTION',
        description: 'Toxicity sensors in neighborhood water mains recorded 15ppb lead levels, exceeding local health nodes. The Municipal Water Board has suppressed these readings in their public dashboard. P2P sensor grid provides the counter-evidence.',
        category: Category.WaterViolations,
        location: 'District 8, Residential Grid',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
        hash: '0xdeadbeef12345678',
        blockchainRef: 'txn_0x1337c0de',
        status: 'Resolved',
        trustScore: 98,
        credsEarned: 1200,
        // FIX: Added missing required Report properties
        severity: 'Catastrophic',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/water-fountain-rust/800/600']
    },
    {
        id: 'rep-014',
        title: 'ZONING TRANSPARENCY BREACH',
        description: 'The City Zoning Board held a "Closed-Loop" session regarding the demolition of the Heritage Park Node. No public notice was issued, violating Civic Protocol 12. Shard includes recording of the unauthorized session and late notice posting.',
        category: Category.CivicDuty,
        location: 'City Hall, Room 302',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
        hash: '0xf00dbabe88776655',
        blockchainRef: 'txn_0x99001122',
        status: 'In Review',
        trustScore: 76,
        // FIX: Added missing required Report properties
        severity: 'Informational',
        isActionable: false,
        imageUrls: ['https://picsum.photos/seed/government-hall/800/600']
    },
    {
        id: 'rep-015',
        title: 'SPECTRUM INTERFERENCE LOG',
        description: 'An unidentified signal jammer is suppressing P2P ledger sync within a 3-block radius. Signal origin traced to a private rooftop node. This interference prevents real-time reporting of environmental hazards in the sector.',
        category: Category.Other,
        location: 'Sector 4, High-Rise Block',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        hash: '0x7777888899990000',
        blockchainRef: 'txn_0x55554444',
        status: 'Submitted',
        trustScore: 68,
        // FIX: Added missing required Report properties
        severity: 'Informational',
        isActionable: false,
        imageUrls: ['https://picsum.photos/seed/radio-tower-night/800/600']
    },
    {
        id: 'rep-004',
        title: 'LIFE-LINE TRIAGE REFUSAL',
        description: 'Patient presented with severe respiratory distress and a valid DPAL Life-Line Medical Shard. On-duty staff at St. Mercy’s Node refused to scan the shard, citing "Incompatible Database Standards" and demanded a $500 cash-upfront fee.',
        category: Category.MedicalNegligence,
        location: 'St. Mercy Hospital, Emergency Bay',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
        hash: '0x77d1aa029984e11c',
        blockchainRef: 'txn_0x87654321ab',
        status: 'In Review',
        trustScore: 89,
        // FIX: Added missing required Report properties
        severity: 'Critical',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/medical-hospital-emergency/800/600']
    },
    {
        id: 'rep-005',
        title: 'YOUTH ACCOUNTABILITY DEFICIT',
        description: 'Public records show the Sector 7 High School has redirected 15% of its Special Education budget to "Security Augmentation" without a public hearing. Scanned receipts show non-functioning facial recognition software purchase.',
        category: Category.Education,
        location: 'Sector 7 High School, Main Office',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
        hash: '0xbb44ee9100284cca',
        blockchainRef: 'txn_0x00000000ed',
        status: 'Resolved',
        trustScore: 65,
        // FIX: Added missing required Report properties
        severity: 'Standard',
        isActionable: true,
        imageUrls: ['https://picsum.photos/seed/school-education-audit/800/600']
    },
    {
        id: 'rep-016',
        title: 'DIGITAL SCAM REPLICATOR',
        description: 'Detected a decentralized "Reward Doubler" scam targeting new DPAL operatives. The script impersonates the DPAL Oracle node to request HeroCredit transfers. Shard includes the malicious URL and script payload for automated whitelisting.',
        category: Category.ConsumerScams,
        location: 'P2P Network, Relay Node 9',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        hash: '0x55aa66bb77cc88dd',
        blockchainRef: 'txn_0xffeeddcc',
        status: 'Resolved',
        trustScore: 99,
        credsEarned: 800,
        // FIX: Added missing required Report properties
        severity: 'Standard',
        isActionable: false,
        imageUrls: ['https://picsum.photos/seed/digital-glitch-code/800/600']
    }
];

export const FORGE_TRAITS: any[] = [
    { id: 'T-01', name: 'Cryptographic_Glow', description: 'Adds a pulsing neon aura to the artifact frame.', cost: 150, bonusType: 'Reputation', bonusValue: 5 },
    { id: 'T-02', name: 'Verified_Badge', description: 'Includes a permanent "Certified Fact" stamp in the metadata.', cost: 300, bonusType: 'Trust', bonusValue: 12 },
    { id: 'T-03', name: 'Historical_Resonance', description: 'Links the shard to the genesis block of its category.', cost: 500, bonusType: 'Power', bonusValue: 20 }
];

export const SKILL_TREE_INITIAL: any[] = [];
export const IAP_PACKS: any[] = [];
export const STORE_ITEMS: any[] = [];

/** FIX: Updated STARTER_MISSION to satisfy the Mission interface requirements by removing invalid properties and adding required 'prompts' */
export const STARTER_MISSION: Mission = {
    id: "msn-starter",
    title: "SYNERGY_CHECK",
    backstory: "Verify link integrity to the decentralised public ledger.",
    category: Category.Other,
    successProbability: 1,
    reconActions: [],
    mainActions: [
        {
            id: 'act-starter',
            name: "Link Test",
            task: "Verify optics calibration by scanning the first block.",
            icon: "📸",
            priority: "High",
            isComplete: false,
            whyItMatters: "System initialization.",
            prompts: [
              {
                id: 'p-starter-1',
                type: 'confirmation',
                promptText: 'Optics alignment confirmed',
                required: true,
                responseType: 'checkbox',
                storedAs: { entity: 'missionLog', field: 'optics_verified' }
              }
            ],
            impactedSkills: ['Technical']
        }
    ],
    currentActionIndex: 0,
    phase: 'OPERATION',
    status: 'active',
    steps: [{ name: "Link Test", task: "Verify optics calibration by scanning the first block.", icon: "📸", priority: "High", isComplete: false }],
    finalReward: { hc: 50, nft: { name: "Starter Shard", icon: "🔰" } },
    currentStepIndex: 0
};

export const NFT_THEMES = [
    { value: NftTheme.Cyberpunk, label: 'Cyberpunk' },
    { value: NftTheme.Ancient, label: 'Ancient' },
    { value: NftTheme.Fantasy, label: 'Fantasy' },
    { value: NftTheme.OldWest, label: 'Western' },
    /** FIX: Changed NftTheme.Urban to NftTheme.Modern to match types.ts enum definition */
    { value: NftTheme.Modern, label: 'Urban' },
    { value: NftTheme.Mythical, label: 'Mythical' },
    { value: NftTheme.Steampunk, label: 'Steampunk' },
    { value: NftTheme.Apocalyptic, label: 'Wasteland' },
    { value: NftTheme.Solarpunk, label: 'Solarpunk' },
    { value: NftTheme.DeepSea, label: 'Abyssal' },
    { value: NftTheme.Cosmic, label: 'Cosmic' },
    { value: NftTheme.Noir, label: 'Noir' },
    { value: NftTheme.Glitch, label: 'Glitch' },
    { value: NftTheme.Biopunk, label: 'Genetic' },
    { value: NftTheme.Renaissance, label: 'Classical' },
    { value: NftTheme.Shogun, label: 'Dynastic' },
    { value: NftTheme.Nordic, label: 'Norse' },
    { value: NftTheme.Vaporwave, label: 'Vaporwave' },
    { value: NftTheme.Minimalist, label: 'Zen' },
    { value: NftTheme.Gothic, label: 'Gothic' },
    { value: NftTheme.Industrial, label: 'Industrial' },
    { value: NftTheme.Solstice, label: 'Celestial' },
    { value: NftTheme.Quantum, label: 'Quantum' },
    { value: NftTheme.Magma, label: 'Volcanic' },
];

export const LEGENDS_OF_THE_LEDGER_NFTS = [];

/** Single source of truth for achievement badges. Registry = one list, one purpose. */
export interface BadgeRegistryEntry {
  id: string;
  nameKey: string;
  descKey: string;
  criteriaKey: string;
  source: 'Reports' | 'Missions' | 'Escrow' | 'Community';
  icon?: string;
}

export const BADGE_REGISTRY: BadgeRegistryEntry[] = [
  { id: 'badge_first_report', nameKey: 'storeItems.badge_first_report', descKey: 'storeItems.badge_first_report_desc', criteriaKey: 'collectionCodex.badgeCriteria.firstReport', source: 'Reports', icon: '🔰' },
  { id: 'badge_truth_seeker', nameKey: 'storeItems.badge_truth_seeker', descKey: 'storeItems.badge_truth_seeker_desc', criteriaKey: 'collectionCodex.badgeCriteria.truthSeeker', source: 'Reports', icon: '🔍' },
  { id: 'badge_legend', nameKey: 'storeItems.badge_legend', descKey: 'storeItems.badge_legend_desc', criteriaKey: 'collectionCodex.badgeCriteria.legend', source: 'Community', icon: '⭐' },
];
