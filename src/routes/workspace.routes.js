import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  createWorkspace, getMyWorkspaces, joinWorkspace, getWorkspaceMembers,
  updateWorkspaceAvatar, updateWorkspace, getInvitePreview,
  inviteUserToWorkspace, deleteWorkspace, leaveWorkspace,
} from "../controllers/workspace.controller.js";
import { assignRole } from "../controllers/role.controller.js";
import { upload } from "../middleware/upload.js";

const router = Router();
router.get("/invite/:code",              getInvitePreview);
router.post("/",                         protect, createWorkspace);
router.get("/",                          protect, getMyWorkspaces);
router.post("/join",                     protect, joinWorkspace);
router.get("/:workspaceId/members",      protect, getWorkspaceMembers);
router.post("/:workspaceId/invite-user", protect, inviteUserToWorkspace);
router.patch("/:workspaceId/avatar",     protect, upload.single("avatar"), updateWorkspaceAvatar);
router.patch("/:workspaceId",            protect, updateWorkspace);
router.delete("/:workspaceId/leave",     protect, leaveWorkspace);
router.delete("/:workspaceId",           protect, deleteWorkspace);
router.patch("/:workspaceId/members/:memberId/role", protect, assignRole);
export default router;
