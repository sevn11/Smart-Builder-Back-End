-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "seo_settings" (
    "id" SERIAL NOT NULL,
    "yearly_plan_amount" DECIMAL(10,2) NOT NULL,
    "monthly_plan_amount" DECIMAL(10,2) NOT NULL,
    "additional_employee_fee" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "seo_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_details" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "address" TEXT,
    "phone_number" TEXT,

    CONSTRAINT "employee_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_details_user_id_key" ON "employee_details"("user_id");

-- AddForeignKey
ALTER TABLE "employee_details" ADD CONSTRAINT "employee_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
