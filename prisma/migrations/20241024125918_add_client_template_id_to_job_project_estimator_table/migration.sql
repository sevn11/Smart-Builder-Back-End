-- AlterTable
ALTER TABLE "job_project_estimator_header" ADD COLUMN     "client_template_id" INTEGER;

-- AddForeignKey
ALTER TABLE "job_project_estimator_header" ADD CONSTRAINT "job_project_estimator_header_client_template_id_fkey" FOREIGN KEY ("client_template_id") REFERENCES "client_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
