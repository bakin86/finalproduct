import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  getConversations,
  getMessages,
  sendMessage,
  deleteMessage,
  getWorkspaceMembers,
  editMessage,
  pinMessage,
  reactToMessage,
} from "../controllers/dm.controller.js";

const router = Router();

router.get("/conversations",       protect, getConversations);
router.get("/users/:workspaceId",  protect, getWorkspaceMembers);
router.get("/:userId",             protect, getMessages);
router.post("/:userId",            protect, sendMessage);
router.delete("/:messageId",       protect, deleteMessage);
router.patch("/:messageId/pin",    protect, pinMessage);
router.patch("/:messageId",        protect, editMessage);
router.post("/:messageId/react",    protect, reactToMessage);

export default router;
