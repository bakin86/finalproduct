import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { createChannel, getWorkspaceChannels } from "../controllers/channel.controller.js";

const router = Router();
router.post("/", protect, createChannel);
router.get("/workspace/:workspaceId", protect, getWorkspaceChannels);
export default router;
