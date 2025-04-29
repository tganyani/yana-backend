/*
  Warnings:

  - Added the required column `text` to the `Comments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Comments" ADD COLUMN     "text" TEXT NOT NULL;
