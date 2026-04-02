import prisma from "../lib/prisma.js";
import { getIO } from "../socket/socket.js";

// POST /api/bans/:workspaceId/:userId
export const banMember = async (req, res, next) => {
  try {
    const { workspaceId, userId } = req.params;
    const { reason } = req.body;
    const requesterId = req.user.id;

    const requester = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId } },
    });

    if (!requester || requester.role !== "OWNER") {
      return res.status(403).json({ ok: false, message: "Only owners can ban members" });
    }

    if (userId === requesterId) {
      return res.status(400).json({ ok: false, message: "You cannot ban yourself" });
    }

    // Remove from workspace
    await prisma.workspaceMember.delete({
      where: { userId_workspaceId: { userId, workspaceId } },
    }).catch(() => {});

    // Create ban record
    const ban = await prisma.workspaceBan.upsert({
      where: { userId_workspaceId: { userId, workspaceId } },
      update: { reason },
      create: {
        user: { connect: { id: userId } },
        workspace: { connect: { id: workspaceId } },
        reason,
      },
    });

    // Kick user via socket in realtime
    const io = getIO();
    if (io) {
      const sockets = [...io.sockets.sockets.values()];
      const targetSocket = sockets.find((s) => s.user?.id === userId);
      if (targetSocket) {
        targetSocket.emit("kicked_from_workspace", {
          workspaceId,
          message: reason || "You have been banned from this workspace.",
        });
      }
    }

    res.json({ ok: true, message: "Member banned", data: ban });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/bans/:workspaceId/:userId
export const unbanMember = async (req, res, next) => {
  try {
    const { workspaceId, userId } = req.params;
    const requesterId = req.user.id;

    const requester = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId } },
    });

    if (!requester || requester.role !== "OWNER") {
      return res.status(403).json({ ok: false, message: "Only owners can unban members" });
    }

    await prisma.workspaceBan.delete({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    res.json({ ok: true, message: "Member unbanned", data: null });
  } catch (err) {
    next(err);
  }
};

// GET /api/bans/:workspaceId
export const getBannedMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const requesterId = req.user.id;

    const requester = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId } },
    });

    if (!requester || requester.role !== "OWNER") {
      return res.status(403).json({ ok: false, message: "Only owners can view bans" });
    }

    const bans = await prisma.workspaceBan.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ ok: true, message: "Banned members fetched", data: bans });
  } catch (err) {
    next(err);
  }
};