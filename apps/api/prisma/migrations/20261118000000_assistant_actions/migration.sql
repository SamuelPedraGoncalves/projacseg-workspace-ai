-- Ações pedidas ao assistente pelo chat (proposta, confirmação, resultado) e auditoria.
-- Aditiva: só cria a tabela nova. Não revisada para produção.
CREATE TABLE "AssistantAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "result" TEXT,

    CONSTRAINT "AssistantAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantAction_tenantId_userId_status_idx" ON "AssistantAction"("tenantId", "userId", "status");

ALTER TABLE "AssistantAction" ADD CONSTRAINT "AssistantAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
