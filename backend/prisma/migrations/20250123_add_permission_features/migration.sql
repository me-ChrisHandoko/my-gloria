-- CreateTable
CREATE TABLE "gloria_ops"."permission_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "moduleAccess" JSONB,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "permission_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."permission_template_applications" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "applied_by" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_by" TEXT,
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "permission_template_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."permission_delegations" (
    "id" TEXT NOT NULL,
    "delegator_id" TEXT NOT NULL,
    "delegate_id" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_by" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."permission_change_history" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB NOT NULL,
    "metadata" JSONB,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rollback_of" TEXT,
    "rolled_back_by" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "is_rollbackable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "permission_change_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."permission_analytics" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "permission_code" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resource_id" TEXT,
    "result" TEXT,
    "response_time" INTEGER,
    "context" JSONB,
    "anomaly_score" DOUBLE PRECISION,
    "anomaly_reasons" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_templates_code_key" ON "gloria_ops"."permission_templates"("code");

-- CreateIndex
CREATE INDEX "permission_templates_category_is_active_idx" ON "gloria_ops"."permission_templates"("category", "is_active");

-- CreateIndex
CREATE INDEX "permission_templates_id_version_idx" ON "gloria_ops"."permission_templates"("id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "permission_template_applications_template_id_target_type_target_id_key" ON "gloria_ops"."permission_template_applications"("template_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "permission_template_applications_target_type_target_id_is_active_idx" ON "gloria_ops"."permission_template_applications"("target_type", "target_id", "is_active");

-- CreateIndex
CREATE INDEX "permission_delegations_delegator_id_is_revoked_idx" ON "gloria_ops"."permission_delegations"("delegator_id", "is_revoked");

-- CreateIndex
CREATE INDEX "permission_delegations_delegate_id_is_revoked_idx" ON "gloria_ops"."permission_delegations"("delegate_id", "is_revoked");

-- CreateIndex
CREATE INDEX "permission_delegations_valid_from_valid_until_idx" ON "gloria_ops"."permission_delegations"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "permission_change_history_entity_type_entity_id_idx" ON "gloria_ops"."permission_change_history"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "permission_change_history_performed_by_performed_at_idx" ON "gloria_ops"."permission_change_history"("performed_by", "performed_at");

-- CreateIndex
CREATE INDEX "permission_change_history_rollback_of_idx" ON "gloria_ops"."permission_change_history"("rollback_of");

-- CreateIndex
CREATE INDEX "permission_analytics_user_profile_id_timestamp_idx" ON "gloria_ops"."permission_analytics"("user_profile_id", "timestamp");

-- CreateIndex
CREATE INDEX "permission_analytics_permission_code_timestamp_idx" ON "gloria_ops"."permission_analytics"("permission_code", "timestamp");

-- CreateIndex
CREATE INDEX "permission_analytics_anomaly_score_idx" ON "gloria_ops"."permission_analytics"("anomaly_score");

-- AddForeignKey
ALTER TABLE "gloria_ops"."permission_template_applications" ADD CONSTRAINT "permission_template_applications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "gloria_ops"."permission_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."permission_delegations" ADD CONSTRAINT "permission_delegations_delegator_id_fkey" FOREIGN KEY ("delegator_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."permission_delegations" ADD CONSTRAINT "permission_delegations_delegate_id_fkey" FOREIGN KEY ("delegate_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;