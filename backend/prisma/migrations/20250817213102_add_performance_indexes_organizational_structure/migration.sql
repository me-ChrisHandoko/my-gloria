-- CreateIndex
CREATE INDEX "departments_school_id_is_active_idx" ON "gloria_ops"."departments"("school_id", "is_active");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "gloria_ops"."departments"("parent_id");

-- CreateIndex
CREATE INDEX "position_hierarchy_reports_to_id_idx" ON "gloria_ops"."position_hierarchy"("reports_to_id");

-- CreateIndex
CREATE INDEX "position_hierarchy_coordinator_id_idx" ON "gloria_ops"."position_hierarchy"("coordinator_id");

-- CreateIndex
CREATE INDEX "positions_department_id_hierarchy_level_idx" ON "gloria_ops"."positions"("department_id", "hierarchy_level");

-- CreateIndex
CREATE INDEX "positions_school_id_is_active_idx" ON "gloria_ops"."positions"("school_id", "is_active");

-- CreateIndex
CREATE INDEX "schools_lokasi_is_active_idx" ON "gloria_ops"."schools"("lokasi", "is_active");

-- CreateIndex
CREATE INDEX "user_positions_start_date_end_date_idx" ON "gloria_ops"."user_positions"("start_date", "end_date");
