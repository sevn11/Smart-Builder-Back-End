-- AlterTable
ALTER TABLE "seo_settings" ADD COLUMN     "sign_now_monthly_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "sign_now_yearly_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
