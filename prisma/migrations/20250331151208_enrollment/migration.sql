/*
  Warnings:

  - You are about to drop the column `enrolled` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `reviewsCount` on the `Course` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Course` DROP COLUMN `enrolled`,
    DROP COLUMN `reviewsCount`;

-- AlterTable
ALTER TABLE `users` MODIFY `bio` TEXT NULL;
