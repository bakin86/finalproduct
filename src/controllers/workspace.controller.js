import prisma from "../lib/prisma.js";

// POST /api/workspaces
export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ ok: false, message: "Workspace name is required" });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        members: {
          create: { userId, role: "OWNER" },
        },
      },
    });

    await prisma.channel.create({
      data: { name: "general", workspaceId: workspace.id },
    });

    res.status(201).json({ ok: true, message: "Workspace created", data: workspace });
  } catch (err) {
    next(err);
  }
};

// GET /api/workspaces
export const getMyWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });

    const workspaces = memberships.map((m) => m.workspace);

    res.json({ ok: true, message: "Workspaces fetched", data: workspaces });
  } catch (err) {
    next(err);
  }
};

// POST /api/workspaces/join
export const joinWorkspace = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    const requesterId = req.user.id;

    if (!inviteCode) {
      return res.status(400).json({ ok: false, message: "Invite code is required" });
    }

    const workspace = await prisma.workspace.findUnique({ where: { inviteCode } });

    if (!workspace) {
      return res.status(404).json({ ok: false, message: "Invalid invite code" });
    }

    // Check if banned
    const ban = await prisma.workspaceBan.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId: workspace.id } },
    });

    if (ban) {
      return res.status(403).json({ ok: false, message: "You are banned from this workspace" });
    }

    // Check if already a member
    const existing = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId: workspace.id } },
    });

    if (existing) {
      return res.status(409).json({ ok: false, message: "You are already a member" });
    }

    await prisma.workspaceMember.create({
      data: { userId: requesterId, workspaceId: workspace.id, role: "MEMBER" },
    });

    res.json({ ok: true, message: "Joined workspace", data: workspace });
  } catch (err) {
    next(err);
  }
};
export const updateWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member || member.role !== "OWNER") {
      return res.status(403).json({
        ok: false,
        message: "Only owners can update workspace",
      });
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name, description },
    });

    res.json({
      ok: true,
      message: "Workspace updated",
      data: workspace,
    });
  } catch (err) {
    next(err);
  }
};
// GET /api/workspaces/:workspaceId/members
export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, username: true, avatar: true, lastSeen: true },
        },
        workspaceRole: true,
      },
      orderBy: { joinedAt: "asc" },
    });

    res.json({
      ok: true,
      message: "Members fetched",
      data: members.map((m) => ({ ...m.user, role: m.role, workspaceRole: m.workspaceRole || null })),
    });
  } catch (err) {
    next(err);
  }
};
// PATCH /api/workspaces/:workspaceId/avatar
export const updateWorkspaceAvatar = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member || member.role !== "OWNER") {
      return res.status(403).json({ ok: false, message: "Only owners can update workspace avatar" });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No file uploaded" });
    }

    const avatar = `/uploads/${req.file.filename}`;

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { avatar },
    });

    res.json({ ok: true, message: "Workspace avatar updated", data: workspace });
  } catch (err) {
    next(err);
  }
};
// GET /api/workspaces/invite/:code — preview without joining
export const getInvitePreview = async (req, res, next) => {
  try {
    const { code } = req.params;
    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode: code },
      select: {
        id: true, name: true, description: true, avatar: true,
        _count: { select: { members: true } },
      },
    });
    if (!workspace) return res.status(404).json({ ok: false, message: "Урилга хүчингүй байна" });

    // Check if requester is already a member (if authenticated)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { verifyToken } = await import("../config/jwt.js");
        const decoded = verifyToken(authHeader.split(" ")[1]);
        const member = await prisma.workspaceMember.findUnique({
          where: { userId_workspaceId: { userId: decoded.id, workspaceId: workspace.id } },
        });
        if (member) return res.status(409).json({ ok: false, message: "Та аль хэдийн гишүүн байна", data: workspace });
      } catch { }
    }

    res.json({ ok: true, data: { ...workspace, memberCount: workspace._count.members } });
  } catch (err) { next(err); }
};

// POST /api/workspaces/:workspaceId/invite-user
export const inviteUserToWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { username }    = req.body;
    const requesterId     = req.user.id;

    // Only owner/admin can invite
    const requester = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId } },
    });
    if (!requester || requester.role === "MEMBER") {
      return res.status(403).json({ ok: false, message: "Зөвхөн эзэмшигч урилга явуулах эрхтэй" });
    }

    // Find user by username (case-sensitive for SQLite compatibility)
    const target = await prisma.user.findFirst({
      where: { username },
      select: { id: true, username: true, avatar: true },
    });
    if (!target) return res.status(404).json({ ok: false, message: `"${username}" хэрэглэгч олдсонгүй` });
    if (target.id === requesterId) return res.status(400).json({ ok: false, message: "Өөртөө урилга явуулах боломжгүй" });

    // Already a member?
    const existing = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: target.id, workspaceId } },
    });
    if (existing) return res.status(409).json({ ok: false, message: `${target.username} аль хэдийн гишүүн байна` });

    // Banned?
    const ban = await prisma.workspaceBan.findUnique({
      where: { userId_workspaceId: { userId: target.id, workspaceId } },
    });
    if (ban) return res.status(403).json({ ok: false, message: `${target.username} энэ workspace-аас хасагдсан байна` });

    // Add as member
    await prisma.workspaceMember.create({
      data: { userId: target.id, workspaceId, role: "MEMBER" },
    });

    res.json({ ok: true, message: `${target.username}-г workspace-д нэмлээ`, data: target });
  } catch (err) { next(err); }
};

// DELETE /api/workspaces/:workspaceId — delete workspace (owner only)
export const deleteWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member || member.role !== "OWNER") {
      return res.status(403).json({ ok: false, message: "Зөвхөн эзэмшигч устгах эрхтэй" });
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
    res.json({ ok: true, message: "Workspace устгагдлаа" });
  } catch (err) { next(err); }
};

// DELETE /api/workspaces/:workspaceId/leave — leave workspace (non-owner)
export const leaveWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) return res.status(404).json({ ok: false, message: "Та энэ workspace-ийн гишүүн биш байна" });
    if (member.role === "OWNER") return res.status(400).json({ ok: false, message: "Эзэмшигч workspace-г орхиж болохгүй. Эхлээд устга." });

    await prisma.workspaceMember.delete({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    res.json({ ok: true, message: "Workspace-аас гарлаа" });
  } catch (err) { next(err); }
};
