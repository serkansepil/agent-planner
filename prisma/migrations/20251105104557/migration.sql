-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('API', 'DATABASE', 'WEBHOOK', 'OAUTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "ExecutionProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "metadata" JSONB DEFAULT '{}',
    "refreshToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "avatar" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentAgentId" UUID,
    "templateId" TEXT,
    "capabilities" JSONB DEFAULT '[]',
    "rateLimitConfig" JSONB DEFAULT '{}',
    "costTrackingConfig" JSONB DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_versions" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "metadata" JSONB,
    "capabilities" JSONB,
    "changeLog" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_executions" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "ExecutionProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "context" JSONB,
    "response" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "cost" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "cacheKey" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_agents" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "agentId" UUID,
    "content" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "IntegrationType" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'INACTIVE',
    "config" JSONB NOT NULL DEFAULT '{}',
    "credentials" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "workspaceId" UUID,
    "userId" UUID NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "fileHash" TEXT,
    "embedding" vector(1536),
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB DEFAULT '{}',
    "processingConfig" JSONB DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentDocumentId" UUID,
    "workspaceId" UUID,
    "agentId" UUID,
    "userId" UUID NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "startPos" INTEGER NOT NULL,
    "endPos" INTEGER NOT NULL,
    "tokenCount" INTEGER,
    "embedding" vector(1536),
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_passwordResetToken_idx" ON "users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "agents_ownerId_idx" ON "agents"("ownerId");

-- CreateIndex
CREATE INDEX "agents_isActive_idx" ON "agents"("isActive");

-- CreateIndex
CREATE INDEX "agents_isPublic_idx" ON "agents"("isPublic");

-- CreateIndex
CREATE INDEX "agents_deletedAt_idx" ON "agents"("deletedAt");

-- CreateIndex
CREATE INDEX "agents_createdAt_idx" ON "agents"("createdAt");

-- CreateIndex
CREATE INDEX "agents_name_idx" ON "agents"("name");

-- CreateIndex
CREATE INDEX "agents_parentAgentId_idx" ON "agents"("parentAgentId");

-- CreateIndex
CREATE INDEX "agents_templateId_idx" ON "agents"("templateId");

-- CreateIndex
CREATE INDEX "agent_versions_agentId_idx" ON "agent_versions"("agentId");

-- CreateIndex
CREATE INDEX "agent_versions_version_idx" ON "agent_versions"("version");

-- CreateIndex
CREATE INDEX "agent_versions_createdAt_idx" ON "agent_versions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_versions_agentId_version_key" ON "agent_versions"("agentId", "version");

-- CreateIndex
CREATE INDEX "agent_executions_agentId_idx" ON "agent_executions"("agentId");

-- CreateIndex
CREATE INDEX "agent_executions_userId_idx" ON "agent_executions"("userId");

-- CreateIndex
CREATE INDEX "agent_executions_sessionId_idx" ON "agent_executions"("sessionId");

-- CreateIndex
CREATE INDEX "agent_executions_status_idx" ON "agent_executions"("status");

-- CreateIndex
CREATE INDEX "agent_executions_provider_idx" ON "agent_executions"("provider");

-- CreateIndex
CREATE INDEX "agent_executions_createdAt_idx" ON "agent_executions"("createdAt");

-- CreateIndex
CREATE INDEX "agent_executions_cacheKey_idx" ON "agent_executions"("cacheKey");

-- CreateIndex
CREATE INDEX "workspaces_ownerId_idx" ON "workspaces"("ownerId");

-- CreateIndex
CREATE INDEX "workspaces_isActive_idx" ON "workspaces"("isActive");

-- CreateIndex
CREATE INDEX "workspaces_createdAt_idx" ON "workspaces"("createdAt");

-- CreateIndex
CREATE INDEX "workspace_agents_workspaceId_idx" ON "workspace_agents"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_agents_agentId_idx" ON "workspace_agents"("agentId");

-- CreateIndex
CREATE INDEX "workspace_agents_isActive_idx" ON "workspace_agents"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_agents_workspaceId_agentId_key" ON "workspace_agents"("workspaceId", "agentId");

-- CreateIndex
CREATE INDEX "sessions_workspaceId_idx" ON "sessions"("workspaceId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- CreateIndex
CREATE INDEX "sessions_createdAt_idx" ON "sessions"("createdAt");

-- CreateIndex
CREATE INDEX "sessions_startedAt_idx" ON "sessions"("startedAt");

-- CreateIndex
CREATE INDEX "messages_sessionId_idx" ON "messages"("sessionId");

-- CreateIndex
CREATE INDEX "messages_agentId_idx" ON "messages"("agentId");

-- CreateIndex
CREATE INDEX "messages_role_idx" ON "messages"("role");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "integrations_workspaceId_idx" ON "integrations"("workspaceId");

-- CreateIndex
CREATE INDEX "integrations_userId_idx" ON "integrations"("userId");

-- CreateIndex
CREATE INDEX "integrations_type_idx" ON "integrations"("type");

-- CreateIndex
CREATE INDEX "integrations_status_idx" ON "integrations"("status");

-- CreateIndex
CREATE INDEX "integrations_createdAt_idx" ON "integrations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_documents_fileHash_key" ON "knowledge_documents"("fileHash");

-- CreateIndex
CREATE INDEX "knowledge_documents_workspaceId_idx" ON "knowledge_documents"("workspaceId");

-- CreateIndex
CREATE INDEX "knowledge_documents_agentId_idx" ON "knowledge_documents"("agentId");

-- CreateIndex
CREATE INDEX "knowledge_documents_userId_idx" ON "knowledge_documents"("userId");

-- CreateIndex
CREATE INDEX "knowledge_documents_status_idx" ON "knowledge_documents"("status");

-- CreateIndex
CREATE INDEX "knowledge_documents_tags_idx" ON "knowledge_documents"("tags");

-- CreateIndex
CREATE INDEX "knowledge_documents_fileHash_idx" ON "knowledge_documents"("fileHash");

-- CreateIndex
CREATE INDEX "knowledge_documents_parentDocumentId_idx" ON "knowledge_documents"("parentDocumentId");

-- CreateIndex
CREATE INDEX "knowledge_documents_createdAt_idx" ON "knowledge_documents"("createdAt");

-- CreateIndex
CREATE INDEX "document_chunks_documentId_idx" ON "document_chunks"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_documentId_chunkIndex_key" ON "document_chunks"("documentId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_parentAgentId_fkey" FOREIGN KEY ("parentAgentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_agents" ADD CONSTRAINT "workspace_agents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_agents" ADD CONSTRAINT "workspace_agents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "knowledge_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
