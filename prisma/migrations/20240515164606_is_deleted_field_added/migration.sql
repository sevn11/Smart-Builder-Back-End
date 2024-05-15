-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "is_deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "permission_sets" ADD COLUMN     "is_deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_deleted" BOOLEAN DEFAULT false;
