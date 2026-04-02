import prisma from "../lib/prisma.js";

// POST /api/blocks/:userId — toggle block
export const blockUser = async (req, res, next) => {
  try {
    const blockerId = req.user.id;
    const { userId: blockedId } = req.params;

    if (blockerId === blockedId) {
      return res.status(400).json({ ok: false, message: "You cannot block yourself" });
    }

    const existing = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    if (existing) {
      await prisma.block.delete({ where: { id: existing.id } });
      return res.json({ ok: true, message: "User unblocked", data: { blocked: false } });
    }

    await prisma.block.create({
      data: {
        blocker: { connect: { id: blockerId } },
        blocked: { connect: { id: blockedId } },
      },
    });

    res.status(201).json({ ok: true, message: "User blocked", data: { blocked: true } });
  } catch (err) {
    next(err);
  }
};

// GET /api/blocks
export const getBlockedUsers = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.json({ ok: true, message: "Blocked users fetched", data: blocks.map((b) => b.blocked) });
  } catch (err) {
    next(err);
  }
};

// GET /api/blocks/check/:userId — did I block them?
export const checkBlock = async (req, res, next) => {
  try {
    const blockerId = req.user.id;
    const { userId: blockedId } = req.params;

    const block = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    res.json({ ok: true, message: "Block status", data: { blocked: !!block } });
  } catch (err) {
    next(err);
  }
};

// GET /api/blocks/blocked-by/:userId — did they block me?
export const checkBlockedBy = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { userId: blockerId } = req.params;

    const block = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId: userId } },
    });

    res.json({ ok: true, message: "Blocked by status", data: { blockedBy: !!block } });
  } catch (err) {
    next(err);
  }
};