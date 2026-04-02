import prisma from "../lib/prisma.js";
import { getIO } from "../socket/socket.js";

const messageInclude = {
  sender: { select: { id: true, username: true, avatar: true } },
  receiver: { select: { id: true, username: true, avatar: true } },
};

// GET /api/dm/conversations
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        deleted: false,
      },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
    });

    // Get unique conversation partners
    const seen = new Set();
    const conversations = [];

    for (const msg of messages) {
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!seen.has(partner.id)) {
        seen.add(partner.id);
        conversations.push({ partner, lastMessage: msg });
      }
    }

    res.json({ ok: true, message: "Conversations fetched", data: conversations });
  } catch (err) {
    next(err);
  }
};

// GET /api/dm/:userId
export const getMessages = async (req, res, next) => {
  try {
    const myId = req.user.id;
    const { userId } = req.params;
    const { limit = 30, cursor } = req.query;

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: userId },
          { senderId: userId, receiverId: myId },
        ],
        deleted: false,
      },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    res.json({ ok: true, message: "Messages fetched", data: messages.reverse() });
  } catch (err) {
    next(err);
  }
};

// POST /api/dm/:userId
export const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { userId: receiverId } = req.params;
    const { content, fileUrl, fileType, replyTo } = req.body;

    if (!content && !fileUrl) {
      return res.status(400).json({ ok: false, message: "Message must have content or a file" });
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    // Check if sender is blocked by receiver
    const block = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: receiverId, blockedId: senderId } },
    });

    if (block) {
      return res.status(403).json({ ok: false, message: "You cannot send messages to this user" });
    }

    const message = await prisma.directMessage.create({
      data: {
        content: content?.trim() || "",
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        replyTo: replyTo ? (typeof replyTo === "string" ? JSON.parse(replyTo) : replyTo) : undefined,
        sender: { connect: { id: senderId } },
        receiver: { connect: { id: receiverId } },
      },
      include: messageInclude,
    });

    res.status(201).json({ ok: true, message: "Message sent", data: message });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/dm/:messageId
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ ok: false, message: "Message not found" });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ ok: false, message: "You can only delete your own messages" });
    }

    await prisma.directMessage.update({
      where: { id: messageId },
      data: { deleted: true },
    });

    res.json({ ok: true, message: "Message deleted", data: null });
  } catch (err) {
    next(err);
  }
};

// GET /api/dm/users/:workspaceId — list workspace members to DM
export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId, NOT: { userId } },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.json({
      ok: true,
      message: "Members fetched",
      data: members.map((m) => m.user),
    });
  } catch (err) {
    next(err);
  }
};
// PATCH /api/dm/:messageId — edit DM
export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content }   = req.body;
    const userId        = req.user.id;

    const msg = await prisma.directMessage.findUnique({ where: { id: messageId } });
    if (!msg) return res.status(404).json({ ok: false, message: "Мессеж олдсонгүй" });
    if (msg.senderId !== userId) return res.status(403).json({ ok: false, message: "Зөвхөн өөрийн мессежийг засах боломжтой" });

    const updated = await prisma.directMessage.update({
      where: { id: messageId },
      data: { content, edited: true },
    });
    // Emit reaction notification to message owner (if different from reactor)
    if (msg.receiverId !== userId && msg.senderId !== userId) {
      // skip - neither sender nor receiver
    } else {
      const ownerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (ownerId && ownerId !== userId) {
        try {
          const io = getIO();
          if (io) {
            const sockets = [...io.sockets.sockets.values()];
            const ownerSocket = sockets.find(s => s.user?.id === ownerId);
            if (ownerSocket) {
              ownerSocket.emit("reaction_notification", { reactorName: username, emoji, messageId });
            }
          }
        } catch {}
      }
    }

    res.json({ ok: true, data: updated });
  } catch (err) { next(err); }
};

// PATCH /api/dm/:messageId/pin — pin/unpin DM
export const pinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const msg = await prisma.directMessage.findUnique({ where: { id: messageId } });
    if (!msg) return res.status(404).json({ ok: false, message: "Мессеж олдсонгүй" });
    const updated = await prisma.directMessage.update({
      where: { id: messageId },
      data: { pinned: !msg.pinned },
    });
    res.json({ ok: true, data: updated });
  } catch (err) { next(err); }
};

// POST /api/dm/:messageId/react — toggle reaction on DM
export const reactToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji }     = req.body;
    const userId        = req.user.id;
    const username      = req.user.username;

    if (!emoji) return res.status(400).json({ ok: false, message: "Emoji required" });

    const msg = await prisma.directMessage.findUnique({ where: { id: messageId } });
    if (!msg) return res.status(404).json({ ok: false, message: "Message not found" });

    // reactions stored as JSON array: [{emoji, userId, username}]
    const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];
    const idx = reactions.findIndex(r => r.emoji === emoji && r.userId === userId);

    if (idx >= 0) {
      reactions.splice(idx, 1); // remove
    } else {
      reactions.push({ emoji, userId, username }); // add
    }

    const updated = await prisma.directMessage.update({
      where: { id: messageId },
      data: { reactions },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    });

    // Emit reaction notification to message owner (if different from reactor)
    if (msg.receiverId !== userId && msg.senderId !== userId) {
      // skip - neither sender nor receiver
    } else {
      const ownerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (ownerId && ownerId !== userId) {
        try {
          const io = getIO();
          if (io) {
            const sockets = [...io.sockets.sockets.values()];
            const ownerSocket = sockets.find(s => s.user?.id === ownerId);
            if (ownerSocket) {
              ownerSocket.emit("reaction_notification", { reactorName: username, emoji, messageId });
            }
          }
        } catch {}
      }
    }

    res.json({ ok: true, data: updated });
  } catch (err) { next(err); }
};
