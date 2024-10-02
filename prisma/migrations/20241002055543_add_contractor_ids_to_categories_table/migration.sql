-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "contractorIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
