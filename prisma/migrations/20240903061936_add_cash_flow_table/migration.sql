-- CreateTable
CREATE TABLE "cash_flow" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "sales_deduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depreciation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expense" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "cash_flow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_flow_company_id_key" ON "cash_flow"("company_id");

-- AddForeignKey
ALTER TABLE "cash_flow" ADD CONSTRAINT "cash_flow_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
