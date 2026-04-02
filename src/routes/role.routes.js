import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { getRoles, createRole, updateRole, deleteRole } from "../controllers/role.controller.js";

const router = Router({ mergeParams: true });

// Works for both:
//   /api/roles/:workspaceId
//   /api/workspaces/:workspaceId/roles
router.get("/",                  protect, getRoles);
router.post("/",                 protect, createRole);
router.patch("/:roleId",         protect, updateRole);
router.delete("/:roleId",        protect, deleteRole);

export default router;
