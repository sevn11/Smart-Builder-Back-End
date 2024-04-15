-- CreateTable
CREATE TABLE "jobs" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "lot_budget" TEXT,
    "total_budget" TEXT,
    "financing" TEXT,
    "time_frame" TEXT,
    "about_us" TEXT,
    "is_closed" BOOLEAN NOT NULL,
    "is_deleted" BOOLEAN NOT NULL,
    "is_gas_at_lot" BOOLEAN NOT NULL,
    "is_water_at_lot" BOOLEAN NOT NULL,
    "is_electricity_at_lot" BOOLEAN NOT NULL,
    "is_sewer_at_lot" BOOLEAN NOT NULL,
    "company_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
