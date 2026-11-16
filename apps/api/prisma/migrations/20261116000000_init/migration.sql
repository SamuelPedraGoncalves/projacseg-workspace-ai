-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "clientEndpoint" TEXT NOT NULL,
    "applicationToken" TEXT,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "config" JSONB NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "homologated" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealSnapshot" (
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "stageEnteredAt" TIMESTAMP(3) NOT NULL,
    "assignedById" TEXT NOT NULL,
    "responsibleName" TEXT NOT NULL,
    "branch" TEXT,
    "insuranceType" TEXT,
    "closed" BOOLEAN NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealSnapshot_pkey" PRIMARY KEY ("tenantId","dealId")
);

-- CreateTable
CREATE TABLE "Occurrence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "stageEnteredAt" TIMESTAMP(3) NOT NULL,
    "responsibleId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "riskAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "resolveReason" TEXT,

    CONSTRAINT "Occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccurrenceEvent" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccurrenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemePreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bitrixUserId" TEXT NOT NULL,
    "baseColor" VARCHAR(7) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_memberId_key" ON "Tenant"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_tenantId_code_key" ON "Rule"("tenantId", "code");

-- CreateIndex
CREATE INDEX "DealSnapshot_tenantId_assignedById_idx" ON "DealSnapshot"("tenantId", "assignedById");

-- CreateIndex
CREATE INDEX "Occurrence_tenantId_status_idx" ON "Occurrence"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Occurrence_tenantId_responsibleId_idx" ON "Occurrence"("tenantId", "responsibleId");

-- CreateIndex
CREATE UNIQUE INDEX "Occurrence_tenantId_dealId_ruleCode_stageEnteredAt_key" ON "Occurrence"("tenantId", "dealId", "ruleCode", "stageEnteredAt");

-- CreateIndex
CREATE INDEX "OccurrenceEvent_occurrenceId_createdAt_idx" ON "OccurrenceEvent"("occurrenceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_tenantId_dedupeKey_key" ON "NotificationLog"("tenantId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ThemePreference_tenantId_bitrixUserId_key" ON "ThemePreference"("tenantId", "bitrixUserId");

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealSnapshot" ADD CONSTRAINT "DealSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceEvent" ADD CONSTRAINT "OccurrenceEvent_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "Occurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemePreference" ADD CONSTRAINT "ThemePreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

