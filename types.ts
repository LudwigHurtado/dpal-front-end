// Complete types for DPAL application

export enum Category {
    Travel = 'Travel',
    ElderlyCare = 'Elderly Care',
    ProfessionalServices = 'Professional Services',
    NonProfit = 'Non-Profit & Charity',
    Events = 'Event Transparency',
    PoliceMisconduct = 'Police Misconduct',
    Housing = 'Housing',
    MedicalNegligence = 'Medical Negligence',
    ConsumerScams = 'Consumer Scams',
    Education = 'Education',
    Environment = 'Environment',
    WorkplaceIssues = 'Workplace Issues',
    VeteransServices = 'Veterans\' Services',
    PublicTransport = 'Public Transport',
    Infrastructure = 'Infrastructure',
    Allergies = 'Allergies',
    InsuranceFraud = 'Insurance Fraud',
    Clergy = 'Clergy',
    WaterViolations = 'Water Related Violations',
    Other = 'Other',
    CivicDuty = 'Civic Duty',
    AccidentsRoadHazards = 'Accidents & Road Hazards',
    MedicalEmergencies = 'Medical Emergencies',
    FireEnvironmentalHazards = 'Fire & Environmental Hazards',
    PublicSafetyAlerts = 'Public Safety Alerts',
    P2PEscrowVerification = 'P2P Escrow & Document Verification',
    ProofOfLifeBiometric = 'Proof of Life & Biometric Verification'
}

export enum SubscriptionTier {
    Scout = 'Scout',
    Guardian = 'Guardian',
    Sentinel = 'Sentinel',
    Oracle = 'Oracle'
}

export type SeverityLevel = 'Informational' | 'Standard' | 'Critical' | 'Catastrophic';
export type ReportStatus = 'Submitted' | 'In Review' | 'Resolved';

export enum NftRarity {
    Common = 'Common',
    Rare = 'Rare',
    Epic = 'Epic',
    Legendary = 'Legendary'
}

export interface Report {
    id: string;
    title: string;
    description: string;
    category: Category;
    location: string;
    timestamp: Date;
    hash: string;
    blockchainRef: string;
    blockNumber?: number;
    txHash?: string;
    chain?: string;
    anchoredAt?: Date;
    status: ReportStatus;
    trustScore: number;
    severity: SeverityLevel;
    isActionable: boolean;
    imageUrls?: string[];
    attachments?: File[];
    credsEarned?: number;
    isAuthor?: boolean;
    isGeneratingNft?: boolean;
    earnedNft?: {
        source: string;
        title: string;
        imageUrl: string;
        mintCategory: Category;
        blockNumber: number;
        txHash: string;
        rarity: NftRarity;
        grade: string;
    };
    structuredData?: any;
}

export enum SkillLevel {
    Beginner = 'Beginner',
    Intermediate = 'Intermediate',
    Expert = 'Expert'
}

export enum EducationRole {
    Teacher = 'Teacher',
    Student = 'Student',
    Employee = 'Employee',
    Observer = 'Observer'
}

export enum NftTheme {
    Cyberpunk = 'Cyberpunk',
    Ancient = 'Ancient',
    Fantasy = 'Fantasy',
    OldWest = 'OldWest',
    Modern = 'Modern',
    Mythical = 'Mythical',
    Steampunk = 'Steampunk',
    Apocalyptic = 'Apocalyptic',
    Solarpunk = 'Solarpunk',
    DeepSea = 'DeepSea',
    Cosmic = 'Cosmic',
    Noir = 'Noir',
    Glitch = 'Glitch',
    Biopunk = 'Biopunk',
    Renaissance = 'Renaissance',
    Shogun = 'Shogun',
    Nordic = 'Nordic',
    Vaporwave = 'Vaporwave',
    Minimalist = 'Minimalist',
    Gothic = 'Gothic',
    Industrial = 'Industrial',
    Solstice = 'Solstice',
    Quantum = 'Quantum',
    Magma = 'Magma'
}

export enum Archetype {
    Analyst = 'Analyst',
    Shepherd = 'Shepherd',
    Seeker = 'Seeker',
    Sentinel = 'Sentinel',
    Firefighter = 'Firefighter',
    Seraph = 'Seraph',
    Guide = 'Guide'
}

export type SkillType = 'Logic' | 'Empathy' | 'Social' | 'Tactical' | 'Wisdom' | 'Civic' | 'Environmental' | 'Infrastructure' | 'Technical' | 'Forensic';

export enum HeroPath {
    Sentinel = 'Path of the Sentinel',
    Steward = 'Path of the Steward',
    Seeker = 'Path of the Seeker',
    Arbiter = 'Path of the Arbiter',
    Ghost = 'Path of the Ghost'
}

export enum SimulationMode {
    Synthesist = 'Synthesist',
    Dynamic = 'Dynamic',
    Mediation = 'Mediation',
    Forensic = 'Forensic',
    Regulatory = 'Regulatory'
}

export enum SimulationDifficulty {
    Entry = 'Entry',
    Standard = 'Standard',
    Elite = 'Elite'
}

export enum MissionApproach {
    EVIDENCE_FIRST = 'EVIDENCE_FIRST',
    COMMUNITY_FIRST = 'COMMUNITY_FIRST',
    SYSTEMS_FIRST = 'SYSTEMS_FIRST'
}

export enum MissionGoal {
    STOP_HARM = 'STOP_HARM',
    DOCUMENT_HARM = 'DOCUMENT_HARM',
    GET_REMEDY = 'GET_REMEDY'
}

export interface FieldPrompt {
    id: string;
    type: 'confirmation' | 'evidence' | 'observation' | 'safety';
    promptText: string;
    required: boolean;
    responseType: 'checkbox' | 'photo' | 'video' | 'text' | 'multi-select';
    options?: string[];
    storedAs: {
        entity: 'report' | 'evidence' | 'missionLog' | 'riskAssessment';
        field: string;
    };
}

export interface MissionAction {
    id: string;
    name: string;
    task: string;
    whyItMatters: string;
    icon: string;
    priority: 'High' | 'Medium' | 'Low';
    isComplete: boolean;
    prompts: FieldPrompt[];
    impactedSkills: string[];
}

export interface Mission {
    id: string;
    title: string;
    backstory: string;
    category: Category;
    successProbability: number;
    reconActions: MissionAction[];
    mainActions: MissionAction[];
    currentActionIndex: number;
    phase: 'RECON' | 'OPERATION' | 'COMPLETED';
    status: 'active' | 'completed';
    steps: any[];
    finalReward: {
        hc: number;
        legendTokens?: number;
        nft: { name: string; icon: string };
    };
    currentStepIndex: number;
    location?: string;
}

export interface FeedAnalysis {
    summary: string;
    hot_topics: Array<{ topic: string, report_ids: string[] }>;
}

export interface Rank {
    level: number;
    title: string;
    xpNeeded: number;
    perk: string;
}

export interface IapPack {
    sku: string;
    hcAmount: number;
    price: number;
    isBestValue?: boolean;
}

export interface StoreItem {
    sku: string;
    name: string;
    icon: string;
    type: 'Gear' | 'Tool' | 'Consumable' | 'Badge' | 'Frame';
    price: number;
}

export interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
    imageUrl?: string;
    audioUrl?: string;
    ledgerProof: string;
}

export interface IntelItem {
    id: string;
    category: Category;
    title: string;
    location: string;
    time: string;
    summary: string;
    source: string;
    links?: Array<{ uri: string, title: string }>;
}

export interface HeroPersona {
    id: string;
    name: string;
    backstory: string;
    combatStyle: string;
    imageUrl: string;
    prompt: string;
    archetype: Archetype;
}

export interface TacticalDossier {
    id: string;
    name: string;
    description: string;
    reportIds: string[];
    author: string;
    timestamp: number;
}

export interface TeamMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    rank: number;
    avatarUrl?: string;
    attachment?: {
        type: 'invite' | 'mission' | 'dossier';
        refId: string;
        label: string;
    };
}

export interface HealthRecord {
    id: string;
    ownerName: string;
    relationship: string;
    bloodType: string;
    dob: string;
    allergies: string[];
    medications: string[];
    emergencyContact: string;
    sharedFolderUri?: string;
    criticalNotes?: string;
    profilePicture?: string;
    isCloudSynced: boolean;
    timestamp: number;
}

export interface WorkStep {
    id: string;
    name: string;
    task: string;
    instruction: string;
    isComplete: boolean;
    requiresProof: boolean;
    proofType?: 'photo' | 'video' | 'text' | 'location';
    order: number;
    proofUrl?: string;
}

export interface WorkPhase {
    id: string;
    name: string;
    description: string;
    phaseType: 'RECON' | 'EXECUTION' | 'VERIFICATION' | 'COMPLETION';
    steps: WorkStep[];
    compensation: {
        hc: number;
        xp: number;
        bonusMultiplier?: number;
    };
    isComplete: boolean;
    completedAt?: number;
    estimatedDuration: string;
}

export interface AiDirective {
    id: string;
    title: string;
    description: string;
    instruction: string;
    rewardHc: number;
    rewardXp: number;
    difficulty: 'Entry' | 'Standard' | 'Elite';
    category: Category;
    status: 'available' | 'completed' | 'in_progress';
    timestamp: number;
    recommendedNextAction?: string;
    proofImageUrl?: string;
    auditHash?: string;
    // New phased structure
    phases?: WorkPhase[];
    currentPhaseIndex?: number;
    // Legacy packet structure (maintained for backward compatibility)
    packet?: {
        priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        confidence: number;
        timeWindow: string;
        geoRadiusMeters: number;
        primaryAction: string;
        steps: Array<{ verb: string; actor: string; detail: string; eta: string; safety: string }>;
        escalation: Array<{ trigger: string; action: string }>;
        evidenceMissing: Array<{ item: string; howToCaptureSafely: string }>;
        resourceRequests?: any[];
        safetyFlags: string[];
    };
}

export interface MissionCompletionSummary {
    title: string;
    rewardHeroCredits: number;
    rewardLegendTokens?: number;
    rewardNft: { name: string, icon: string };
}

export interface ProfileSettings {
    privacy: {
        publicProfile: boolean;
        showStats: boolean;
        showInventory: boolean;
        allowDms: boolean;
        anonymousReporting: boolean;
    };
    notifications: {
        dailyChallenge: boolean;
        missionAvailable: boolean;
        verificationRequests: boolean;
        purchaseReceipts: boolean;
        mintConfirmations: boolean;
    };
    preferences: {
        language: string;
        locationPrecision: 'city' | 'gps';
        theme: 'light' | 'neon';
    };
}

export interface DailyChallengeTask {
    id: string;
    label: string;
    target: number;
    current: number;
    isComplete: boolean;
}

export interface DailyChallenge {
    id: string;
    expiresAt: number;
    tasks: DailyChallengeTask[];
    reward: { hc: number; xp: number; badgeId?: string };
    isClaimed: boolean;
}

export interface LedgerEvent {
    id: string;
    type: 'CREDIT_SPEND' | 'MISSION_COMPLETED' | 'MINT_CONFIRMED' | 'PURCHASE_CONFIRMED' | 'VERIFICATION_BONUS' | 'DAILY_REWARD';
    amount: number;
    timestamp: number;
    refId: string;
    hash: string;
}

export interface HeroStats {
    reportsSubmitted: number;
    reportsVerified: number;
    missionsCompleted: number;
    upvotesReceived: number;
    impactScore: number;
    dollarsSaved: number;
    topCategories: Category[];
    strongestCategory: Category;
}

export interface Item {
    id: string;
    name: string;
    type: 'Augmentation' | 'Gear' | 'Tool' | 'Consumable' | 'Badge' | 'Frame';
    icon: string;
    resonance?: number;
    bonusSkill?: string;
    bonusValue?: number;
}

export interface SkillNode {
    id: string;
    name: string;
    level: number;
    maxLevel: number;
}

export interface QrParcel {
    id: string;
    type: 'credits' | 'item';
    amount?: number;
    item?: Item;
    sender: string;
    senderId: string;
    targetOperativeId?: string;
    isClaimed: boolean;
    timestamp: number;
}

export interface TrainingScenario {
    id: string;
    title: string;
    description: string;
    environment: string;
    bgKeyword: string;
    objectives: string[];
    masterDebrief: string;
    difficulty: number;
    options: Array<{
        id: string;
        text: string;
        successOutcome: string;
        failOutcome: string;
        dc: number;
        rationale: string;
    }>;
}

export interface IntelAnalysis {
    threatScore: number;
    communityImpact: string;
    investigativeComplexity: string;
    verificationDifficulty: 'Simple' | 'Complex' | 'Classified';
    aiAssessment: string;
    targetEntity: string;
}

export type ActionOutcome = 'CLEAN_SUCCESS' | 'RISKY_SUCCESS' | 'PARTIAL_CONFIRMATION';

export interface EvidenceItem {
    id: string;
    name: string;
    type: 'photo' | 'video' | 'text' | 'geo';
    status: 'Strong' | 'Fair' | 'Weak';
    content?: string;
    previewUrl?: string;
}

export interface LiveMissionState {
    id: string;
    title: string;
    category: Category;
    checklist: Array<{ id: string, s: 'todo' | 'done', label: string }>;
    score: number;
    risk: 'Low' | 'Medium' | 'High';
    evidence: EvidenceItem[];
}

export interface LiveIntelligenceUI {
    next: string;
    why: string;
    eta: number;
    score: number;
    risk: 'Low' | 'Medium' | 'High';
}

export interface CharacterNft {
    title: string;
    imageUrl: string;
    collection: string;
}

export interface TrainingModule {
    id: string;
    title: string;
    description: string;
    skillType: SkillType;
    masteryReward: number;
    isLocked: boolean;
    notAskedToDo: string;
    indicators: string[];
    checklist: string[];
    isScripture?: boolean;
}

export interface TacticalIntel {
    objective: string;
    threatLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
    keyInsight: string;
    protocol: string;
}

export interface Hero {
    name: string;
    handle: string;
    bio: string;
    heroOath?: string;
    operativeId: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    heroCredits: number;
    reputation: number;
    legendTokens: number;
    rank: number;
    title: string;
    unlockedTitles: string[];
    equippedTitle: string | null;
    inventory: Item[];
    personas: HeroPersona[];
    equippedPersonaId: null | string;
    theme: 'light' | 'neon';
    masteryScore: number;
    wisdomMastery: number;
    socialMastery: number;
    civicMastery: number;
    environmentalMastery: number;
    infrastructureMastery: number;
    base: { name: string; level: number; status: string };
    skills: SkillNode[];
    path: HeroPath;
    hasMadeFirstPurchase?: boolean;
    unlockedItemSkus: string[];
    activeParcels: QrParcel[];
    subscriptionTier: SubscriptionTier;
    subscriptionRenewal?: number;
    settings: ProfileSettings;
    stats: HeroStats;
    streak: number;
}
