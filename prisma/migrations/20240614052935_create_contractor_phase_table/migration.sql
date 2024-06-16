-- CreateTable
CREATE TABLE "contractor_phase" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_phase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contractor_phase" ADD CONSTRAINT "contractor_phase_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
