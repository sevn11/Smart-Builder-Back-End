-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "telephone" TEXT,
    "mobile_number_1" TEXT NOT NULL,
    "mobile_number_2" TEXT NOT NULL,
    "email_address_1" TEXT NOT NULL,
    "email_address_2" TEXT NOT NULL,
    "employer_1" TEXT NOT NULL,
    "employer_2" TEXT NOT NULL,
    "work_telephone_1" TEXT NOT NULL,
    "work_telephone_2" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
