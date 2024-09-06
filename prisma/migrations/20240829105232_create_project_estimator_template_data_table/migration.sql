-- CreateTable
CREATE TABLE "project_estimator_template_data" (
    "id" SERIAL NOT NULL,
    "item" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost_type" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "actual_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "gross_profit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "contract_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "invoice_id" INTEGER,
    "is_deleted" BOOLEAN DEFAULT false,
    "project_estimator_template_header_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_estimator_template_data_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "project_estimator_template_data" ADD CONSTRAINT "project_estimator_template_data_project_estimator_template_fkey" FOREIGN KEY ("project_estimator_template_header_id") REFERENCES "project_estimator_template_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
