-- CreateTable
CREATE TABLE "master_project_estimator_template" (
    "id" SERIAL NOT NULL,
    "templateName" TEXT NOT NULL,
    "profilt_calculation_type" "ProfitCalculationType" DEFAULT 'MARGIN',
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_project_estimator_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_project_estimator_template_header" (
    "id" SERIAL NOT NULL,
    "master_project_estimator_template_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "header_order" INTEGER DEFAULT 0,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_project_estimator_template_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_project_estimator_template_data" (
    "id" SERIAL NOT NULL,
    "item" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost_type" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "actual_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "gross_profit" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "contract_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "is_lot_cost" BOOLEAN DEFAULT false,
    "is_courtesy_credit" BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    "master_project_estimator_template_header_id" INTEGER,
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_project_estimator_template_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_questionnaire_template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "templateType" TEXT NOT NULL DEFAULT 'Questionnaire',
    "m_pet_id" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_questionnaire_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_template_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "link_to_phase" BOOLEAN NOT NULL DEFAULT false,
    "phase_id" INTEGER,
    "link_to_initial_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_paint_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_questionnaire" BOOLEAN NOT NULL DEFAULT true,
    "questionnaire_order" INTEGER NOT NULL,
    "initial_order" INTEGER NOT NULL DEFAULT 0,
    "paint_order" INTEGER NOT NULL DEFAULT 0,
    "master_questionnaire_template_id" INTEGER,
    "phaseIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_template_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_template_question" (
    "id" SERIAL NOT NULL,
    "link_to_phase" BOOLEAN NOT NULL DEFAULT false,
    "link_to_initial_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_paint_selection" BOOLEAN NOT NULL DEFAULT false,
    "link_to_questionnaire" BOOLEAN NOT NULL DEFAULT true,
    "question" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "multipleOptions" JSONB,
    "master_questionnaire_template_id" INTEGER,
    "master_t_category_id" INTEGER,
    "phase_id" INTEGER,
    "question_order" INTEGER NOT NULL DEFAULT 0,
    "initial_question_order" INTEGER NOT NULL DEFAULT 0,
    "paint_question_order" INTEGER NOT NULL DEFAULT 0,
    "phaseIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_template_question_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "master_project_estimator_template_header" ADD CONSTRAINT "master_project_estimator_template_header_master_project_es_fkey" FOREIGN KEY ("master_project_estimator_template_id") REFERENCES "master_project_estimator_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_project_estimator_template_data" ADD CONSTRAINT "master_project_estimator_template_data_master_project_esti_fkey" FOREIGN KEY ("master_project_estimator_template_header_id") REFERENCES "master_project_estimator_template_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_questionnaire_template" ADD CONSTRAINT "master_questionnaire_template_m_pet_id_fkey" FOREIGN KEY ("m_pet_id") REFERENCES "master_project_estimator_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_template_categories" ADD CONSTRAINT "master_template_categories_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "contractor_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_template_categories" ADD CONSTRAINT "master_template_categories_master_questionnaire_template_i_fkey" FOREIGN KEY ("master_questionnaire_template_id") REFERENCES "master_questionnaire_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_template_question" ADD CONSTRAINT "master_template_question_master_questionnaire_template_id_fkey" FOREIGN KEY ("master_questionnaire_template_id") REFERENCES "master_questionnaire_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_template_question" ADD CONSTRAINT "master_template_question_master_t_category_id_fkey" FOREIGN KEY ("master_t_category_id") REFERENCES "master_template_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_template_question" ADD CONSTRAINT "master_template_question_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "contractor_phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
