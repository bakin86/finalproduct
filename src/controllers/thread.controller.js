import prisma from "../lib/prisma.js";

// GET /api/threads/:messageId
export const getThread = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: { select: { id:true, username:true, avatar:true } },
        thread: {
          include: {
            replies: {
              orderBy: { createdAt: "asc" },
              include: {
                user: { select: { id:true, username:true, avatar:true } },
              },
            },
          },
        },
      },
    });

    if (!message) return res.status(404).json({ ok:false, message:"Message not found" });
    res.json({ ok:true, data: message });
  } catch (err) { next(err); }
};

// POST /api/threads/:messageId/reply
export const addReply = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) return res.status(400).json({ ok:false, message:"Content required" });

    let thread = await prisma.thread.findUnique({ where: { messageId } });
    if (!thread) thread = await prisma.thread.create({ data: { messageId } });

    const reply = await prisma.reply.create({
      data: { threadId: thread.id, userId, content: content.trim() },
      include: {
        user: { select: { id:true, username:true, avatar:true } },
      },
    });

    res.json({ ok:true, data: { reply, threadId: thread.id } });
  } catch (err) { next(err); }
};

// DELETE /api/threads/reply/:replyId
export const deleteReply = async (req, res, next) => {
  try {
    const { replyId } = req.params;
    const userId = req.user.id;

    const reply = await prisma.reply.findUnique({ where: { id: replyId } });
    if (!reply) return res.status(404).json({ ok:false, message:"Reply not found" });
    if (reply.userId !== userId) return res.status(403).json({ ok:false, message:"Forbidden" });

    await prisma.reply.delete({ where: { id: replyId } });
    res.json({ ok:true, message:"Reply deleted" });
  } catch (err) { next(err); }
};
