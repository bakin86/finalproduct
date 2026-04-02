import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { banMember, unbanMember, getBannedMembers } from "../controllers/ban.controller.js";

const router = Router();

router.post("/:workspaceId/:userId", protect, banMember);
router.delete("/:workspaceId/:userId", protect, unbanMember);
router.get("/:workspaceId", protect, getBannedMembers);

export default router;