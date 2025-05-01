/*
  Warnings:

  - You are about to drop the column `topic` on the `quiz_questions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `quiz_answers` DROP FOREIGN KEY `quiz_answers_question_id_fkey`;

-- DropForeignKey
ALTER TABLE `quiz_question_options` DROP FOREIGN KEY `quiz_question_options_quiz_question_id_fkey`;

-- DropIndex
DROP INDEX `quiz_answers_question_id_fkey` ON `quiz_answers`;

-- AlterTable
ALTER TABLE `quiz_questions` DROP COLUMN `topic`;

-- AddForeignKey
ALTER TABLE `quiz_question_options` ADD CONSTRAINT `quiz_question_options_quiz_question_id_fkey` FOREIGN KEY (`quiz_question_id`) REFERENCES `quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_answers` ADD CONSTRAINT `quiz_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
