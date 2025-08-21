-- DropForeignKey
ALTER TABLE "gloria_ops"."departments" DROP CONSTRAINT "departments_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "gloria_ops"."departments" DROP CONSTRAINT "departments_school_id_fkey";

-- DropForeignKey
ALTER TABLE "gloria_ops"."position_hierarchy" DROP CONSTRAINT "position_hierarchy_position_id_fkey";

-- DropForeignKey
ALTER TABLE "gloria_ops"."positions" DROP CONSTRAINT "positions_school_id_fkey";

-- DropForeignKey
ALTER TABLE "gloria_ops"."user_positions" DROP CONSTRAINT "user_positions_user_profile_id_fkey";

-- AddForeignKey
ALTER TABLE "gloria_ops"."departments" ADD CONSTRAINT "departments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "gloria_ops"."schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "gloria_ops"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."positions" ADD CONSTRAINT "positions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "gloria_ops"."schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."user_positions" ADD CONSTRAINT "user_positions_user_profile_id_fkey" FOREIGN KEY ("user_profile_id") REFERENCES "gloria_ops"."user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gloria_ops"."position_hierarchy" ADD CONSTRAINT "position_hierarchy_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "gloria_ops"."positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
