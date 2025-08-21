-- CreateEnum
CREATE TYPE "gloria_ops"."PolicyType" AS ENUM ('TIME_BASED', 'LOCATION_BASED', 'ATTRIBUTE_BASED', 'CONTEXTUAL', 'HIERARCHICAL');

-- CreateEnum
CREATE TYPE "gloria_ops"."AssigneeType" AS ENUM ('ROLE', 'USER', 'DEPARTMENT', 'POSITION');

-- DropIndex
DROP INDEX "gloria_ops"."permissions_is_active_idx";

-- AlterTable
ALTER TABLE "gloria_ops"."permissions" ADD COLUMN     "group_id" TEXT;

-- CreateTable
CREATE TABLE "gloria_ops"."permission_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "gloria_ops"."ModuleCategory",
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."permission_dependencies" (
    "id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "depends_on_id" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "permission_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."resource_permissions" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "granted_by" TEXT NOT NULL,
    "grant_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."role_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "role_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."permission_policies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "policy_type" "gloria_ops"."PolicyType" NOT NULL,
    "rules" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "permission_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."policy_assignments" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "assignee_type" "gloria_ops"."AssigneeType" NOT NULL,
    "assignee_id" TEXT NOT NULL,
    "conditions" JSONB,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "assigned_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."permission_check_logs" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT,
    "resource_id" TEXT,
    "is_allowed" BOOLEAN NOT NULL,
    "denied_reason" TEXT,
    "check_duration" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_check_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_groups_code_key" ON "gloria_ops"."permission_groups"("code");

-- CreateIndex
CREATE INDEX "permission_groups_category_is_active_idx" ON "gloria_ops"."permission_groups"("category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "permission_dependencies_permission_id_depends_on_id_key" ON "gloria_ops"."permission_dependencies"("permission_id", "depends_on_id");

-- CreateIndex
CREATE INDEX "resource_permissions_user_profile_id_resource_type_resource_idx" ON "gloria_ops"."resource_permissions"("user_profile_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "resource_permissions_permission_id_idx" ON "gloria_ops"."resource_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_permissions_user_profile_id_permission_id_resource_key" ON "gloria_ops"."resource_permissions"("user_profile_id", "permission_id", "resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_templates_code_key" ON "gloria_ops"."role_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_policies_code_key" ON "gloria_ops"."permission_policies"("code");

-- CreateIndex
CREATE INDEX "permission_policies_policy_type_is_active_idx" ON "gloria_ops"."permission_policies"("policy_type", "is_active");

-- CreateIndex
CREATE INDEX "policy_assignments_assignee_type_assignee_id_idx" ON "gloria_ops"."policy_assignments"("assignee_type", "assignee_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_assignments_policy_id_assignee_type_assignee_id_key" ON "gloria_ops"."policy_assignments"("policy_id", "assignee_type", "assignee_id");

-- CreateIndex
CREATE INDEX "permission_check_logs_user_profile_id_created_at_idx" ON "gloria_ops"."permission_check_logs"("user_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "permission_check_logs_resource_action_created_at_idx" ON "gloria_ops"."permission_check_logs"("resource", "action", "created_at");

-- CreateIndex
CREATE INDEX "permissions_group_id_is_active_idx" ON "gloria_ops"."permissions"("group_id", "is_active");

-- AddForeignKey
ALTER TABLE "gloria_ops"."permissions" ADD CONSTRAINT "permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "gloria_ops"."permission_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."permission_dependencies" ADD CONSTRAINT "permission_dependencies_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "gloria_ops"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."permission_dependencies" ADD CONSTRAINT "permission_dependencies_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "gloria_ops"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."resource_permissions" ADD CONSTRAINT "resource_permissions_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."resource_permissions" ADD CONSTRAINT "resource_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "gloria_ops"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."policy_assignments" ADD CONSTRAINT "policy_assignments_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "gloria_ops"."permission_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
