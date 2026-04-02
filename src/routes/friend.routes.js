import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { sendRequest, acceptRequest, declineRequest, getFriends, getPendingRequests, unfriend } from "../controllers/friend.controller.js";

const router = Router();
router.post("/request",             protect, sendRequest);
router.post("/accept/:requestId",   protect, acceptRequest);
router.post("/decline/:requestId",  protect, declineRequest);
router.get("/",                     protect, getFriends);
router.get("/requests",             protect, getPendingRequests);
router.delete("/:userId",           protect, unfriend);
export default router;
