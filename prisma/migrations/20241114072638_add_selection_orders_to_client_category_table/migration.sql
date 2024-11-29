-- AlterTable
ALTER TABLE "client_categories" ADD COLUMN     "initial_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paint_order" INTEGER NOT NULL DEFAULT 0;
