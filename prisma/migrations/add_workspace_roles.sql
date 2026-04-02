-- Create WorkspaceRole table
CREATE TABLE IF NOT EXISTS `WorkspaceRole` (
  `id`          VARCHAR(191) NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `color`       VARCHAR(191) NOT NULL DEFAULT '#6B7399',
  `position`    INT NOT NULL DEFAULT 0,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `workspaceId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `WorkspaceRole_workspaceId_fkey`
    FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add roleId to WorkspaceMember
ALTER TABLE `WorkspaceMember`
  ADD COLUMN IF NOT EXISTS `roleId` VARCHAR(191) NULL,
  ADD CONSTRAINT `WorkspaceMember_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `WorkspaceRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
