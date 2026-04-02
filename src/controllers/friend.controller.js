import prisma from "../lib/prisma.js";

// POST /api/friends/request
export const sendRequest = async (req, res, next) => {
  try {
    const { username } = req.body;
    const senderId = req.user.id;

    if (!username) {
      return res.status(400).json({ ok: false, message: "Username is required" });
    }

    const receiver = await prisma.user.findFirst({ where: { username } });

    if (!receiver) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    if (receiver.id === senderId) {
      return res.status(400).json({ ok: false, message: "You cannot add yourself" });
    }

    // Check if request already exists
    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        return res.status(409).json({ ok: false, message: "Already friends" });
      }
      return res.status(409).json({ ok: false, message: "Friend request already sent" });
    }

    const request = await prisma.friendRequest.create({
      data: {
        sender: { connect: { id: senderId } },
        receiver: { connect: { id: receiver.id } },
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.status(201).json({ ok: true, message: "Friend request sent", data: request });
  } catch (err) {
    next(err);
  }
};

// POST /api/friends/accept/:requestId
export const acceptRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ ok: false, message: "Request not found" });
    }

    if (request.receiverId !== userId) {
      return res.status(403).json({ ok: false, message: "Not authorized" });
    }

    const updated = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.json({ ok: true, message: "Friend request accepted", data: updated });
  } catch (err) {
    next(err);
  }
};

// POST /api/friends/decline/:requestId
export const declineRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ ok: false, message: "Request not found" });
    }

    if (request.receiverId !== userId) {
      return res.status(403).json({ ok: false, message: "Not authorized" });
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "DECLINED" },
    });

    res.json({ ok: true, message: "Friend request declined", data: null });
  } catch (err) {
    next(err);
  }
};

// GET /api/friends
export const getFriends = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.friendRequest.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: "ACCEPTED",
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    });

    const friends = requests.map((r) =>
      r.senderId === userId ? r.receiver : r.sender
    );

    res.json({ ok: true, message: "Friends fetched", data: friends });
  } catch (err) {
    next(err);
  }
};

// GET /api/friends/requests
export const getPendingRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ ok: true, message: "Pending requests fetched", data: requests });
  } catch (err) {
    next(err);
  }
};
// DELETE /api/friends/:userId — unfriend
export const unfriend = async (req, res, next) => {
  try {
    const { userId: targetId } = req.params;
    const myId = req.user.id;

    const request = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: myId,     receiverId: targetId },
          { senderId: targetId, receiverId: myId },
        ],
        status: "ACCEPTED",
      },
    });

    if (!request) return res.status(404).json({ ok: false, message: "Найзын холбоо олдсонгүй" });

    await prisma.friendRequest.delete({ where: { id: request.id } });
    res.json({ ok: true, message: "Найзаас хасагдлаа" });
  } catch (err) { next(err); }
};
