-- CreateTable
CREATE TABLE "gloria_ops"."permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" "gloria_ops"."PermissionAction" NOT NULL,
    "scope" "gloria_ops"."PermissionScope",
    "conditions" JSONB,
    "metadata" JSONB,
    "is_system_permission" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "granted_by" TEXT,
    "grant_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."user_permissions" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "granted_by" TEXT NOT NULL,
    "grant_reason" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_temporary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."role_hierarchy" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "parent_role_id" TEXT NOT NULL,
    "inherit_permissions" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gloria_ops"."permission_cache" (
    "id" TEXT NOT NULL,
    "user_profile_id" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "permission_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "gloria_ops"."permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_resource_action_idx" ON "gloria_ops"."permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "permissions_is_active_idx" ON "gloria_ops"."permissions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_scope_key" ON "gloria_ops"."permissions"("resource", "action", "scope");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_is_granted_idx" ON "gloria_ops"."role_permissions"("role_id", "is_granted");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "gloria_ops"."role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "gloria_ops"."role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_permissions_user_profile_id_is_granted_idx" ON "gloria_ops"."user_permissions"("user_profile_id", "is_granted");

-- CreateIndex
CREATE INDEX "user_permissions_permission_id_idx" ON "gloria_ops"."user_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_permissions_valid_from_valid_until_idx" ON "gloria_ops"."user_permissions"("valid_from", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_profile_id_permission_id_key" ON "gloria_ops"."user_permissions"("user_profile_id", "permission_id");

-- CreateIndex
CREATE INDEX "role_hierarchy_parent_role_id_idx" ON "gloria_ops"."role_hierarchy"("parent_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_hierarchy_role_id_parent_role_id_key" ON "gloria_ops"."role_hierarchy"("role_id", "parent_role_id");

-- CreateIndex
CREATE INDEX "permission_cache_expires_at_idx" ON "gloria_ops"."permission_cache"("expires_at");

-- CreateIndex
CREATE INDEX "permission_cache_is_valid_idx" ON "gloria_ops"."permission_cache"("is_valid");

-- CreateIndex
CREATE UNIQUE INDEX "permission_cache_user_profile_id_cache_key_key" ON "gloria_ops"."permission_cache"("user_profile_id", "cache_key");

-- AddForeignKey
ALTER TABLE "gloria_ops"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "gloria_ops"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "gloria_ops"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_permissions" ADD CONSTRAINT "user_permissions_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "gloria_ops"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "gloria_ops"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_parent_role_id_fkey" FOREIGN KEY ("parent_role_id") REFERENCES "gloria_ops"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."permission_cache" ADD CONSTRAINT "permission_cache_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
