-- CreateEnum
CREATE TYPE "HazardousWasteAuditRiskLevel" AS ENUM ('low', 'medium', 'high', 'needs_more_data');

-- CreateTable
CREATE TABLE "hazardous_waste_audits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "epaId" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "generatorStatus" TEXT NOT NULL,
    "permitStatus" TEXT NOT NULL,
    "complianceStatus" TEXT NOT NULL,
    "correctiveActionStatus" TEXT NOT NULL,
    "baselineYear" INTEGER NOT NULL,
    "currentYear" INTEGER NOT NULL,
    "baselineHazardousWasteTons" DOUBLE PRECISION NOT NULL,
    "currentHazardousWasteTons" DOUBLE PRECISION NOT NULL,
    "baselineManifestCount" DOUBLE PRECISION NOT NULL,
    "currentManifestCount" DOUBLE PRECISION NOT NULL,
    "violationsCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enforcementActionsCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wasteChangePct" DOUBLE PRECISION,
    "manifestChangePct" DOUBLE PRECISION,
    "complianceRiskScore" DOUBLE PRECISION,
    "integrityScore" DOUBLE PRECISION,
    "riskLevel" "HazardousWasteAuditRiskLevel" NOT NULL DEFAULT 'needs_more_data',
    "claimText" TEXT,
    "claimAnalysisJson" JSONB NOT NULL,
    "verificationSummaryJson" JSONB NOT NULL,
    "netCarbonRealityJson" JSONB,
    "evidencePacketJson" JSONB,
    "sourceMode" TEXT NOT NULL,
    "dataSourcesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "linkedMRVProjectId" TEXT,
    "linkedEvidenceVaultId" TEXT,
    "linkedReportId" TEXT,
    CONSTRAINT "hazardous_waste_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hazardous_waste_audits_userId_createdAt_idx" ON "hazardous_waste_audits"("userId", "createdAt");
CREATE INDEX "hazardous_waste_audits_epaId_idx" ON "hazardous_waste_audits"("epaId");
CREATE INDEX "hazardous_waste_audits_facilityName_idx" ON "hazardous_waste_audits"("facilityName");
CREATE INDEX "hazardous_waste_audits_riskLevel_idx" ON "hazardous_waste_audits"("riskLevel");
CREATE INDEX "hazardous_waste_audits_deletedAt_idx" ON "hazardous_waste_audits"("deletedAt");

-- AddForeignKey
ALTER TABLE "hazardous_waste_audits"
ADD CONSTRAINT "hazardous_waste_audits_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "dpal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
