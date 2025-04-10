/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Lesson` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Course` MODIFY `videoUrl` VARCHAR(1024) NULL;

-- AlterTable
ALTER TABLE `Lesson` DROP COLUMN `imageUrl`,
    MODIFY `videoUrl` VARCHAR(1024) NULL;
