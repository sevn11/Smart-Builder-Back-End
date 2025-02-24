-- AlterTable
ALTER TABLE "permission_sets" ADD COLUMN     "settings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ytd_report" BOOLEAN NOT NULL DEFAULT false;
