-- CreateTable
CREATE TABLE "job_schedules" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "job_id" INTEGER,
    "contractor_id" INTEGER,
    "event_id" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "job_schedules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_schedules" ADD CONSTRAINT "job_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_schedules" ADD CONSTRAINT "job_schedules_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_schedules" ADD CONSTRAINT "job_schedules_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
