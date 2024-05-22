/*
  Warnings:

  - You are about to drop the column `link_to_selection` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `link_to_selection` on the `template_question` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "categories" DROP COLUMN "link_to_selection",
ADD COLUMN     "link_to_initial_selection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "link_to_paint_selection" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "template_question" DROP COLUMN "link_to_selection",
ADD COLUMN     "link_to_initial_selection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "link_to_paint_selection" BOOLEAN NOT NULL DEFAULT false;
