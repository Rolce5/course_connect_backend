/*
  Warnings:

  - Added the required column `transaction_id` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Enrollment` ADD COLUMN `status` ENUM('COMPLETED', 'IN_PROGRESS', 'NOT_STARTED') NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `transaction_id` VARCHAR(191) NOT NULL;
