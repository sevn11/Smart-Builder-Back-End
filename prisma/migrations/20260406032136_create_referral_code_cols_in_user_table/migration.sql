-- AlterTable
ALTER TABLE "users" ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "referral_code_applied" BOOLEAN NOT NULL DEFAULT false;
