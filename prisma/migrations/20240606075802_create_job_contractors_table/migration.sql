-- CreateTable
CREATE TABLE "job_contractors" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "job_id" INTEGER,
    "contractor_id" INTEGER,

    CONSTRAINT "job_contractors_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_contractors" ADD CONSTRAINT "job_contractors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_contractors" ADD CONSTRAINT "job_contractors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_contractors" ADD CONSTRAINT "job_contractors_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
