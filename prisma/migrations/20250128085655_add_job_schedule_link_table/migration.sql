-- CreateEnum
CREATE TYPE "TypeEnum" AS ENUM ('0', '1', '2', '3');

-- CreateTable
CREATE TABLE "job_schedule_link" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "job_id" INTEGER,
    "source_id" INTEGER NOT NULL,
    "target_id" INTEGER NOT NULL,
    "type" "TypeEnum" NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_schedule_link_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_schedule_link" ADD CONSTRAINT "job_schedule_link_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_schedule_link" ADD CONSTRAINT "job_schedule_link_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_schedule_link" ADD CONSTRAINT "job_schedule_link_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "job_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_schedule_link" ADD CONSTRAINT "job_schedule_link_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "job_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
