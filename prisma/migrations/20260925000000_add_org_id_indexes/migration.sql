-- CreateIndex
CREATE INDEX "bots_orgId_idx" ON "bots"("orgId");

-- CreateIndex
CREATE INDEX "integrations_orgId_idx" ON "integrations"("orgId");

-- CreateIndex
CREATE INDEX "bot_config_versions_orgId_idx" ON "bot_config_versions"("orgId");

-- CreateIndex
CREATE INDEX "knowledge_sources_orgId_idx" ON "knowledge_sources"("orgId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_orgId_idx" ON "knowledge_chunks"("orgId");

-- CreateIndex
CREATE INDEX "conversations_orgId_idx" ON "conversations"("orgId");

-- CreateIndex
CREATE INDEX "messages_orgId_idx" ON "messages"("orgId");

-- CreateIndex
CREATE INDEX "tool_call_logs_orgId_idx" ON "tool_call_logs"("orgId");
