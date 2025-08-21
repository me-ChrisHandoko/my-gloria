-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "gloria_master";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "gloria_ops";

-- CreateEnum
CREATE TYPE "gloria_ops"."ModuleCategory" AS ENUM ('SERVICE', 'PERFORMANCE', 'QUALITY', 'FEEDBACK', 'TRAINING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "gloria_ops"."PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT', 'IMPORT', 'PRINT', 'ASSIGN', 'CLOSE');

-- CreateEnum
CREATE TYPE "gloria_ops"."PermissionScope" AS ENUM ('OWN', 'DEPARTMENT', 'SCHOOL', 'ALL');

-- CreateEnum
CREATE TYPE "gloria_ops"."ApproverType" AS ENUM ('POSITION', 'DEPARTMENT', 'SPECIFIC_USER', 'ROLE');

-- CreateEnum
CREATE TYPE "gloria_ops"."RequestStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "gloria_ops"."ApprovalStatus" AS ENUM ('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'SKIPPED', 'DELEGATED');

-- CreateEnum
CREATE TYPE "gloria_ops"."ApprovalAction" AS ENUM ('APPROVE', 'REJECT', 'RETURN', 'ESCALATE', 'DELEGATE');

-- CreateEnum
CREATE TYPE "gloria_ops"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "gloria_ops"."NotificationType" AS ENUM ('APPROVAL_REQUEST', 'APPROVAL_RESULT', 'WORK_ORDER_UPDATE', 'KPI_REMINDER', 'TRAINING_INVITATION', 'SYSTEM_ALERT', 'GENERAL', 'DELEGATION');

-- CreateEnum
CREATE TYPE "gloria_ops"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'ASSIGN', 'REVOKE', 'DELEGATE');

-- CreateTable
CREATE TABLE "gloria_master"."data_karyawan" (
    "nip" VARCHAR(15) NOT NULL,
    "nama" VARCHAR(109),
    "jenis_kelamin" VARCHAR(1),
    "tgl_mulai_bekerja" TIMESTAMP(6),
    "tgl_tetap" TIMESTAMP(6),
    "status" VARCHAR(10),
    "waktu_kerja_kependidikan" VARCHAR(10),
    "bagian_kerja" VARCHAR(50),
    "lokasi" VARCHAR(20),
    "bidang_kerja" VARCHAR(70),
    "jenis_karyawan" VARCHAR(20),
    "status_aktif" VARCHAR(8),
    "no_ponsel" VARCHAR(25),
    "email" VARCHAR(100),
    "birthdate" TIMESTAMP(6),
    "rfid" VARCHAR(100),

    CONSTRAINT "data_karyawan_pkey" PRIMARY KEY ("nip")
);

-- CreateTable
CREATE TABLE "gloria_ops"."user_profiles" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "nip" VARCHAR(15) NOT NULL,
    "is_superadmin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active" TIMESTAMP(3),
    "preferences" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."schools" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lokasi" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "principal" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bagian_kerja" TEXT,
    "school_id" TEXT,
    "parent_id" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."positions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department_id" TEXT,
    "school_id" TEXT,
    "hierarchy_level" INTEGER NOT NULL,
    "max_holders" INTEGER NOT NULL DEFAULT 1,
    "is_unique" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."user_positions" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_plt" BOOLEAN NOT NULL DEFAULT false,
    "appointed_by" TEXT,
    "sk_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."position_hierarchy" (
    "id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "reports_to_id" TEXT,
    "coordinator_id" TEXT,

    CONSTRAINT "position_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hierarchy_level" INTEGER NOT NULL,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."user_roles" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."modules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "gloria_ops"."ModuleCategory" NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "path" TEXT,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "required_plan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."module_permissions" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "action" "gloria_ops"."PermissionAction" NOT NULL,
    "scope" "gloria_ops"."PermissionScope" NOT NULL,
    "description" TEXT,

    CONSTRAINT "module_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."role_module_access" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "position_id" TEXT,
    "permissions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "role_module_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."user_module_access" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "granted_by" TEXT NOT NULL,
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_module_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."user_overrides" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "permission_type" "gloria_ops"."PermissionAction" NOT NULL,
    "is_granted" BOOLEAN NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."approval_matrix" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "requester_role" TEXT,
    "requester_position" TEXT,
    "approval_sequence" INTEGER NOT NULL,
    "approver_type" "gloria_ops"."ApproverType" NOT NULL,
    "approver_value" TEXT NOT NULL,
    "conditions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "approval_matrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."requests" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "requester_profile_id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "status" "gloria_ops"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."approval_steps" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "approver_profile_id" TEXT NOT NULL,
    "approver_type" TEXT NOT NULL,
    "status" "gloria_ops"."ApprovalStatus" NOT NULL DEFAULT 'WAITING',
    "action" "gloria_ops"."ApprovalAction",
    "notes" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."approval_delegations" (
    "id" TEXT NOT NULL,
    "delegator_profile_id" TEXT NOT NULL,
    "delegate_profile_id" TEXT NOT NULL,
    "module" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "approval_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."request_attachments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."notifications" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "type" "gloria_ops"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "priority" "gloria_ops"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_profile_id" TEXT,
    "action" "gloria_ops"."AuditAction" NOT NULL,
    "module" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_display" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "changed_fields" JSONB,
    "target_user_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_clerk_user_id_key" ON "gloria_ops"."user_profiles"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_nip_key" ON "gloria_ops"."user_profiles"("nip");

-- CreateIndex
CREATE INDEX "user_profiles_clerk_user_id_idx" ON "gloria_ops"."user_profiles"("clerk_user_id");

-- CreateIndex
CREATE INDEX "user_profiles_nip_idx" ON "gloria_ops"."user_profiles"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "schools_code_key" ON "gloria_ops"."schools"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "gloria_ops"."departments"("code");

-- CreateIndex
CREATE INDEX "departments_bagian_kerja_idx" ON "gloria_ops"."departments"("bagian_kerja");

-- CreateIndex
CREATE UNIQUE INDEX "positions_code_key" ON "gloria_ops"."positions"("code");

-- CreateIndex
CREATE INDEX "user_positions_user_profile_id_is_active_idx" ON "gloria_ops"."user_positions"("user_profile_id", "is_active");

-- CreateIndex
CREATE INDEX "user_positions_position_id_is_active_idx" ON "gloria_ops"."user_positions"("position_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_positions_user_profile_id_position_id_start_date_key" ON "gloria_ops"."user_positions"("user_profile_id", "position_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "position_hierarchy_position_id_key" ON "gloria_ops"."position_hierarchy"("position_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "gloria_ops"."roles"("code");

-- CreateIndex
CREATE INDEX "user_roles_user_profile_id_is_active_idx" ON "gloria_ops"."user_roles"("user_profile_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_profile_id_role_id_key" ON "gloria_ops"."user_roles"("user_profile_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "modules_code_key" ON "gloria_ops"."modules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "module_permissions_module_id_action_scope_key" ON "gloria_ops"."module_permissions"("module_id", "action", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "role_module_access_role_id_module_id_key" ON "gloria_ops"."role_module_access"("role_id", "module_id");

-- CreateIndex
CREATE INDEX "user_module_access_user_profile_id_module_id_is_active_idx" ON "gloria_ops"."user_module_access"("user_profile_id", "module_id", "is_active");

-- CreateIndex
CREATE INDEX "user_overrides_user_profile_id_module_id_is_granted_idx" ON "gloria_ops"."user_overrides"("user_profile_id", "module_id", "is_granted");

-- CreateIndex
CREATE INDEX "approval_matrix_module_is_active_idx" ON "gloria_ops"."approval_matrix"("module", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "approval_matrix_module_requester_role_approval_sequence_key" ON "gloria_ops"."approval_matrix"("module", "requester_role", "approval_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "requests_request_number_key" ON "gloria_ops"."requests"("request_number");

-- CreateIndex
CREATE INDEX "requests_requester_profile_id_status_idx" ON "gloria_ops"."requests"("requester_profile_id", "status");

-- CreateIndex
CREATE INDEX "requests_module_status_idx" ON "gloria_ops"."requests"("module", "status");

-- CreateIndex
CREATE INDEX "approval_steps_approver_profile_id_status_idx" ON "gloria_ops"."approval_steps"("approver_profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_request_id_sequence_key" ON "gloria_ops"."approval_steps"("request_id", "sequence");

-- CreateIndex
CREATE INDEX "approval_delegations_delegator_profile_id_is_active_idx" ON "gloria_ops"."approval_delegations"("delegator_profile_id", "is_active");

-- CreateIndex
CREATE INDEX "approval_delegations_delegate_profile_id_is_active_idx" ON "gloria_ops"."approval_delegations"("delegate_profile_id", "is_active");

-- CreateIndex
CREATE INDEX "notifications_user_profile_id_is_read_idx" ON "gloria_ops"."notifications"("user_profile_id", "is_read");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "gloria_ops"."audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_module_action_created_at_idx" ON "gloria_ops"."audit_logs"("module", "action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "gloria_ops"."audit_logs"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_profiles" ADD CONSTRAINT "user_profiles_nip_fkey" FOREIGN KEY ("nip") REFERENCES "gloria_master"."data_karyawan"("nip") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."departments" ADD CONSTRAINT "departments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "gloria_ops"."schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "gloria_ops"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."positions" ADD CONSTRAINT "positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "gloria_ops"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."positions" ADD CONSTRAINT "positions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "gloria_ops"."schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_positions" ADD CONSTRAINT "user_positions_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_positions" ADD CONSTRAINT "user_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "gloria_ops"."positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."position_hierarchy" ADD CONSTRAINT "position_hierarchy_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "gloria_ops"."positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."position_hierarchy" ADD CONSTRAINT "position_hierarchy_reports_to_id_fkey" FOREIGN KEY ("reports_to_id") REFERENCES "gloria_ops"."positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."position_hierarchy" ADD CONSTRAINT "position_hierarchy_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "gloria_ops"."positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_roles" ADD CONSTRAINT "user_roles_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "gloria_ops"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."modules" ADD CONSTRAINT "modules_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "gloria_ops"."modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."module_permissions" ADD CONSTRAINT "module_permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "gloria_ops"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."role_module_access" ADD CONSTRAINT "role_module_access_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "gloria_ops"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."role_module_access" ADD CONSTRAINT "role_module_access_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "gloria_ops"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."role_module_access" ADD CONSTRAINT "role_module_access_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "gloria_ops"."positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_module_access" ADD CONSTRAINT "user_module_access_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_module_access" ADD CONSTRAINT "user_module_access_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "gloria_ops"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_overrides" ADD CONSTRAINT "user_overrides_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_overrides" ADD CONSTRAINT "user_overrides_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "gloria_ops"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."requests" ADD CONSTRAINT "requests_requester_profile_id_fkey" FOREIGN KEY ("requester_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."approval_steps" ADD CONSTRAINT "approval_steps_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "gloria_ops"."requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."approval_steps" ADD CONSTRAINT "approval_steps_approver_profile_id_fkey" FOREIGN KEY ("approver_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."approval_delegations" ADD CONSTRAINT "approval_delegations_delegator_profile_id_fkey" FOREIGN KEY ("delegator_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."approval_delegations" ADD CONSTRAINT "approval_delegations_delegate_profile_id_fkey" FOREIGN KEY ("delegate_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."request_attachments" ADD CONSTRAINT "request_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "gloria_ops"."requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."notifications" ADD CONSTRAINT "notifications_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."audit_logs" ADD CONSTRAINT "audit_logs_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
