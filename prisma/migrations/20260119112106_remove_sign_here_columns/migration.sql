/*
  Warnings:

  - You are about to drop the column `signedPdf` on the `sign_here` table. All the data in the column will be lost.
  - You are about to drop the column `signImage` on the `signers` table. All the data in the column will be lost.
  - You are about to drop the column `signedAt` on the `signers` table. All the data in the column will be lost.
  - You are about to drop the column `signerType` on the `signers` table. All the data in the column will be lost.
  - You are about to drop the column `typedName` on the `signers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sign_here" DROP COLUMN "signedPdf";

-- AlterTable
ALTER TABLE "signers" DROP COLUMN "signImage",
DROP COLUMN "signedAt",
DROP COLUMN "signerType",
DROP COLUMN "typedName";
