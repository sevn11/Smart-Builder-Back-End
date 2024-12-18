-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "phaseIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "client_categories" ADD COLUMN     "phaseIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "client_template_question" ADD COLUMN     "phaseIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "template_question" ADD COLUMN     "phaseIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
