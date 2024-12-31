-- AlterTable
ALTER TABLE "job_project_estimator" ADD COLUMN     "is_courtesy_credit" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "project_estimator_template_data" ADD COLUMN     "is_courtesy_credit" BOOLEAN DEFAULT false;
