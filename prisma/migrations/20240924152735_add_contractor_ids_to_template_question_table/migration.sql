-- AlterTable
ALTER TABLE "template_question" ADD COLUMN     "contractorIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
