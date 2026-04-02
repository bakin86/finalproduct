import { Router } from "express";
import {
  googleLogin,
  me,
  updateProfile,
  updateAvatar,
  searchUsers,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post("/google", googleLogin);
router.get("/me", protect, me);
router.patch("/profile", protect, updateProfile);
router.post("/avatar", protect, upload.single("avatar"), updateAvatar);
router.get("/search", protect, searchUsers);
router.get("/user/:id", protect, getUserById);

export default router;
