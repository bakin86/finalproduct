import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  sendMessage,
  getMessages,
  deleteMessage,
  editMessage,
  searchMessages,
  pinMessage,
  getPinnedMessages,
} from "../controllers/message.controller.js";

const router = Router();

router.post("/:channelId", protect, sendMessage);
router.get("/:channelId", protect, getMessages);
router.get("/:channelId/pinned", protect, getPinnedMessages);
router.get("/:channelId/search", protect, searchMessages);
router.delete("/:messageId", protect, deleteMessage);
router.patch("/:messageId", protect, editMessage);
router.patch("/:messageId/pin", protect, pinMessage);

export default router;