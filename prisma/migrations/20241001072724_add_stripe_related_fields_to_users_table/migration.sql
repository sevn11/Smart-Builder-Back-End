-- AlterTable
ALTER TABLE "users" ADD COLUMN     "product_id" TEXT,
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "subscription_id" TEXT;
