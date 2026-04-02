import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { getThread, addReply, deleteReply } from "../controllers/thread.controller.js";

const router = Router();

router.get("/:messageId",        protect, getThread);
router.post("/:messageId/reply", protect, addReply);
router.delete("/reply/:replyId", protect, deleteReply);

export default router;
