-- CreateTable
CREATE TABLE `lesson_progress` (
    `user_id` INTEGER NOT NULL,
    `lesson_id` INTEGER NOT NULL,
    `module_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `video_progress` INTEGER NULL,
    `last_accessed_at` DATETIME(3) NULL,
    `first_completed_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `lesson_progress_module_id_idx`(`module_id`),
    INDEX `lesson_progress_course_id_idx`(`course_id`),
    PRIMARY KEY (`user_id`, `lesson_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_lesson_id_fkey` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
