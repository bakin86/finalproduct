import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { toggleReaction, getReactions } from "../controllers/reaction.controller.js";

const router = Router();
router.post("/:messageId", protect, toggleReaction);
router.get("/:messageId", protect, getReactions);
export default router;
