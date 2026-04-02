import prisma from "../lib/prisma.js";

// GET /api/workspaces/:workspaceId/roles
export const getRoles = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const roles = await prisma.workspaceRole.findMany({
      where: { workspaceId },
      orderBy: { position: "asc" },
    });
    res.json({ ok: true, data: roles });
  } catch (err) { next(err); }
};

// POST /api/workspaces/:workspaceId/roles — create role (OWNER only)
export const createRole = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { name, color } = req.body;
    const userId = req.user.id;

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member || member.role !== "OWNER")
      return res.status(403).json({ ok: false, message: "Only the server owner can manage roles" });

    if (!name?.trim())
      return res.status(400).json({ ok: false, message: "Role name is required" });

    const count = await prisma.workspaceRole.count({ where: { workspaceId } });
    const role = await prisma.workspaceRole.create({
      data: { name: name.trim(), color: color || "#6B7399", workspaceId, position: count },
    });
    res.status(201).json({ ok: true, data: role });
  } catch (err) { next(err); }
};

// PATCH /api/workspaces/:workspaceId/roles/:roleId — rename/recolor (OWNER only)
export const updateRole = async (req, res, next) => {
  try {
    const { workspaceId, roleId } = req.params;
    const { name, color } = req.body;
    const userId = req.user.id;

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member || member.role !== "OWNER")
      return res.status(403).json({ ok: false, message: "Only the server owner can manage roles" });

    const role = await prisma.workspaceRole.update({
      where: { id: roleId },
      data: {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
      },
    });
    res.json({ ok: true, data: role });
  } catch (err) { next(err); }
};

// DELETE /api/workspaces/:workspaceId/roles/:roleId (OWNER only)
export const deleteRole = async (req, res, next) => {
  try {
    const { workspaceId, roleId } = req.params;
    const userId = req.user.id;

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member || member.role !== "OWNER")
      return res.status(403).json({ ok: false, message: "Only the server owner can manage roles" });

    await prisma.workspaceRole.delete({ where: { id: roleId } });
    res.json({ ok: true, message: "Role deleted" });
  } catch (err) { next(err); }
};

// PATCH /api/workspaces/:workspaceId/members/:memberId/role — assign role (OWNER only)
export const assignRole = async (req, res, next) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { roleId } = req.body;
    const userId = req.user.id;

    const me = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!me || me.role !== "OWNER")
      return res.status(403).json({ ok: false, message: "Only the server owner can assign roles" });

    const updated = await prisma.workspaceMember.update({
      where: { userId_workspaceId: { userId: memberId, workspaceId } },
      data: { roleId: roleId || null },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        workspaceRole: true,
      },
    });
    res.json({ ok: true, data: updated });
  } catch (err) { next(err); }
};
