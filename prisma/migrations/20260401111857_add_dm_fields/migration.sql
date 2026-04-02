-- Add DM fields (MySQL 5.7 compatible)
ALTER TABLE `DirectMessage` ADD COLUMN `edited` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `DirectMessage` ADD COLUMN `pinned` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `DirectMessage` ADD COLUMN `replyTo` JSON NULL;
