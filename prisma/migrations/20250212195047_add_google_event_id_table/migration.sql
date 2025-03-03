-- CreateTable
CREATE TABLE "google_event_id" (
    "id" SERIAL NOT NULL,
    "event_id" TEXT,
    "company_id" INTEGER NOT NULL,
    "job_id" INTEGER,
    "job_schedule_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_event_id_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "google_event_id" ADD CONSTRAINT "google_event_id_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_event_id" ADD CONSTRAINT "google_event_id_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_event_id" ADD CONSTRAINT "google_event_id_job_schedule_id_fkey" FOREIGN KEY ("job_schedule_id") REFERENCES "job_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_event_id" ADD CONSTRAINT "google_event_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
