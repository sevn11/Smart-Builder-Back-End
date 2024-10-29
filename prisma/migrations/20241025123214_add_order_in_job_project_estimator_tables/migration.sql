-- AlterTable
ALTER TABLE "job_project_estimator" ADD COLUMN     "order" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "job_project_estimator_header" ADD COLUMN     "header_order" INTEGER DEFAULT 0;
