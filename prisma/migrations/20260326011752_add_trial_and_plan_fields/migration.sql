-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_status" TEXT DEFAULT 'active',
ADD COLUMN     "card_on_file" BOOLEAN DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "plan" TEXT DEFAULT 'yearly',
ADD COLUMN     "plan_starts_at" TIMESTAMP(3),
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);
