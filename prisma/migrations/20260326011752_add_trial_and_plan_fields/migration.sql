-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_status" TEXT DEFAULT 'active',
ADD COLUMN     "card_on_file" BOOLEAN DEFAULT false,
ADD COLUMN     "plan" TEXT DEFAULT 'yearly';
