-- CreateTable
CREATE TABLE "contractor_files" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "customer_id" INTEGER NOT NULL,
    "job_id" INTEGER,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contractor_files" ADD CONSTRAINT "contractor_files_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_files" ADD CONSTRAINT "contractor_files_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_files" ADD CONSTRAINT "contractor_files_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
