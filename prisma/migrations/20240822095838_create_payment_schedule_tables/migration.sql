-- CreateTable
CREATE TABLE "payment_schedule" (
    "id" SERIAL NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "company_id" INTEGER,
    "job_id" INTEGER,
    "is_deleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedule_draw" (
    "id" SERIAL NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "draw_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bank_fees" DOUBLE PRECISION DEFAULT 0,
    "received" BOOLEAN NOT NULL DEFAULT false,
    "payment_schedule_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedule_draw_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_schedule" ADD CONSTRAINT "payment_schedule_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedule" ADD CONSTRAINT "payment_schedule_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedule_draw" ADD CONSTRAINT "payment_schedule_draw_payment_schedule_id_fkey" FOREIGN KEY ("payment_schedule_id") REFERENCES "payment_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
