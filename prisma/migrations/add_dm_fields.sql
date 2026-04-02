-- Run this in MySQL to add new fields to DirectMessage table
ALTER TABLE `DirectMessage` 
  ADD COLUMN IF NOT EXISTS `edited` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `pinned` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `replyTo` JSON NULL;
