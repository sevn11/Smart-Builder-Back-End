-- AlterTable
ALTER TABLE "project_estimator_template_data" ADD COLUMN     "is_sales_tax_applicable" BOOLEAN DEFAULT false,
ADD COLUMN     "sales_tax_percentage" DECIMAL(10,2) DEFAULT 0.00;
