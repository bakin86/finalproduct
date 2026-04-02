import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  blockUser,
  getBlockedUsers,
  checkBlock,
  checkBlockedBy,
} from "../controllers/block.controller.js";

const router = Router();

router.post("/:userId", protect, blockUser);
router.get("/", protect, getBlockedUsers);
router.get("/check/:userId", protect, checkBlock);
router.get("/blocked-by/:userId", protect, checkBlockedBy);

export default router;