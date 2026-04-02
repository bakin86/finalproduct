import prisma from "../lib/prisma.js";

export const sendMessage = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { content, fileUrl, fileType, replyTo } = req.body;
    const userId = req.user.id;

    if (!content && !fileUrl) {
      return res.status(400).json({ ok: false, message: "Message must have content or a file" });
    }

    if (content && content.length > 2000) {
      return res.status(400).json({ ok: false, message: "Message too long (max 2000 chars)" });
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });

    if (!channel) {
      return res.status(404).json({ ok: false, message: "Channel not found" });
    }

    const message = await prisma.message.create({
      data: {
        content: content?.trim() || "",
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        replyTo: replyTo || null,
        user: { connect: { id: userId } },
        channel: { connect: { id: channelId } },
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        reactions: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    res.status(201).json({ ok: true, message: "Message sent", data: message });
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { cursor, limit = 30 } = req.query;

    const messages = await prisma.message.findMany({
      where: { channelId, deleted: false },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        reactions: {
          include: { user: { select: { id: true, username: true } } },
        },
        thread: {
          include: { replies: { select: { id: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    res.json({ ok: true, message: "Messages fetched", data: messages.reverse() });
  } catch (err) {
    next(err);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await prisma.message.findUnique({ where: { id: messageId } });

    if (!message) {
      return res.status(404).json({ ok: false, message: "Message not found" });
    }

    if (message.userId !== userId) {
      return res.status(403).json({ ok: false, message: "You can only delete your own messages" });
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deleted: true },
    });

    res.json({ ok: true, message: "Message deleted", data: null });
  } catch (err) {
    next(err);
  }
};
export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === "") {
      return res.status(400).json({ ok: false, message: "Content is required" });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ ok: false, message: "Message not found" });
    }

    if (message.userId !== userId) {
      return res.status(403).json({ ok: false, message: "You can only edit your own messages" });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: content.trim() },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        reactions: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    res.json({ ok: true, message: "Message updated", data: updated });
  } catch (err) {
    next(err);
  }
};
// GET /api/messages/:channelId/search?q=text
export const searchMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Query must be at least 2 characters" });
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        deleted: false,
        content: { contains: q.trim() },
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({ ok: true, message: "Messages found", data: messages.reverse() });
  } catch (err) {
    next(err);
  }
};
// PATCH /api/messages/:messageId/pin
export const pinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ ok: false, message: "Message not found" });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { pinned: !message.pinned },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.json({ ok: true, message: updated.pinned ? "Message pinned" : "Message unpinned", data: updated });
  } catch (err) {
    next(err);
  }
};

// GET /api/messages/:channelId/pinned
export const getPinnedMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const messages = await prisma.message.findMany({
      where: { channelId, pinned: true, deleted: false },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ ok: true, message: "Pinned messages fetched", data: messages });
  } catch (err) {
    next(err);
  }
};
