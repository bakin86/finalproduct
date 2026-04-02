-- Add replyTo to Message table (channel messages)
ALTER TABLE `Message` 
  ADD COLUMN IF NOT EXISTS `replyTo` JSON NULL;

-- Add edited, pinned, replyTo to DirectMessage table (already may exist)
ALTER TABLE `DirectMessage` 
  ADD COLUMN IF NOT EXISTS `edited` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `pinned` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `replyTo` JSON NULL;
