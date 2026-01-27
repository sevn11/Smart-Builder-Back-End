-- AlterTable
ALTER TABLE "sign_here" ADD COLUMN     "company_id" INTEGER,
ADD COLUMN     "job_id" INTEGER,
ADD COLUMN     "user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "sign_here" ADD CONSTRAINT "sign_here_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_here" ADD CONSTRAINT "sign_here_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_here" ADD CONSTRAINT "sign_here_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
