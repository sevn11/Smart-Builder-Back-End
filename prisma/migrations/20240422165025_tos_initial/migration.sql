-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_tos_accepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tos_acceptance_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tos_version" TEXT DEFAULT 'v1';
