/*
  Warnings:

  - You are about to drop the column `imageDeleteToken` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "imageDeleteToken",
ADD COLUMN     "position" TEXT;
