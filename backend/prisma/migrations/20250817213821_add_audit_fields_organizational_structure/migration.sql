-- AlterTable
ALTER TABLE "gloria_ops"."departments" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "modified_by" TEXT;

-- AlterTable
ALTER TABLE "gloria_ops"."positions" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "modified_by" TEXT;

-- AlterTable
ALTER TABLE "gloria_ops"."schools" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "modified_by" TEXT;
