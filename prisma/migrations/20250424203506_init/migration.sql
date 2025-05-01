/*
  Warnings:

  - You are about to drop the column `isCorrect` on the `quiz_question_options` table. All the data in the column will be lost.
  - Added the required column `is_correct` to the `quiz_question_options` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `quiz_question_options` DROP COLUMN `isCorrect`,
    ADD COLUMN `is_correct` BOOLEAN NOT NULL;
