import prisma from "../lib/prisma.js";

// POST /api/reactions/:messageId
export const toggleReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({ ok: false, message: "Emoji is required" });
    }

    const existing = await prisma.reaction.findUnique({
      where: { userId_messageId_emoji: { userId, messageId, emoji } },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return res.json({ ok: true, message: "Reaction removed", data: { removed: true, emoji } });
    }

    const reaction = await prisma.reaction.create({
      data: {
        emoji,
        user: { connect: { id: userId } },
        message: { connect: { id: messageId } },
      },
      include: { user: { select: { id: true, username: true } } },
    });

    res.status(201).json({ ok: true, message: "Reaction added", data: { removed: false, reaction } });
  } catch (err) {
    next(err);
  }
};

// GET /api/reactions/:messageId
export const getReactions = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const reactions = await prisma.reaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, username: true } } },
    });

    res.json({ ok: true, message: "Reactions fetched", data: reactions });
  } catch (err) {
    next(err);
  }
};
