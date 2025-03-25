-- CreateTable
CREATE TABLE "contractor_mail_info" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "contractor_id" INTEGER NOT NULL,
    "is_details_attached" BOOLEAN DEFAULT false,
    "is_schedule_sent" BOOLEAN DEFAULT false,
    "contractorFiles" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "is_sent_to_builder" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_mail_info_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contractor_mail_info" ADD CONSTRAINT "contractor_mail_info_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_mail_info" ADD CONSTRAINT "contractor_mail_info_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_mail_info" ADD CONSTRAINT "contractor_mail_info_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
