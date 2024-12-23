-- AlterTable
ALTER TABLE "permission_sets" ADD COLUMN     "accounting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proposal" BOOLEAN NOT NULL DEFAULT false;
