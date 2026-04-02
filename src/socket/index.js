import { Server } from "socket.io";
import { verifyToken } from "../config/jwt.js";
import { setUserOnline, setUserOffline, getExistingSocket } from "./presence.js";
import { setIO } from "./socket.js";
import prisma from "../lib/prisma.js";

// Find socket by userId
const findSocket = (io, userId) =>
  [...io.sockets.sockets.values()].find(s => s.user?.id === userId) || null;

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  setIO(io);

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    try {
      const decoded = verifyToken(token);
      socket.user = {
        id:       decoded.id,
        username: decoded.username || decoded.email?.split("@")[0] || "User",
      };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const { id: userId, username } = socket.user;
    console.log(`[Socket] connected: ${username} (${socket.id})`);

    // Single session enforcement
    const existing = getExistingSocket(userId);
    if (existing && existing !== socket.id) {
      io.sockets.sockets.get(existing)?.emit("session_expired", { message: "Өөр төхөөрөмжөөс нэвтэрлээ." });
      io.sockets.sockets.get(existing)?.disconnect(true);
    }

    setUserOnline(userId, socket.id);
    io.emit("user_online", { userId });

    // Update lastSeen
    prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } }).catch(() => {});

    // ── Workspace / Channel ──────────────────────────────────────
    socket.on("join_workspace", (workspaceId) => socket.join(`workspace:${workspaceId}`));
    socket.on("join_channel",   (channelId)   => socket.join(`channel:${channelId}`));

    // ── Channel Messages ─────────────────────────────────────────
    socket.on("send_message", (message) => {
      // Emit to channel members (for real-time chat)
      io.to(`channel:${message.channelId}`).emit("new_message", message);
      // Emit separate notification event to workspace (won't duplicate for channel members)
      if (message.workspaceId) {
        io.to(`workspace:${message.workspaceId}`).emit("channel_notification", message);
      }
    });
    socket.on("delete_message", ({ messageId, channelId }) => {
      io.to(`channel:${channelId}`).emit("message_deleted", { messageId });
    });
    socket.on("message_edited", ({ message, channelId }) => {
      io.to(`channel:${channelId}`).emit("message_edited", { message, channelId });
    });
    socket.on("message_pinned", ({ message, channelId }) => {
      io.to(`channel:${channelId}`).emit("message_pinned", { message, channelId });
    });
    socket.on("reaction_updated", ({ messageId, channelId, reactions, reactorId, reactorName, emoji, messageOwnerId }) => {
      // Update UI for all channel members
      io.to(`channel:${channelId}`).emit("reaction_updated", { messageId, reactions, reactorId, reactorName, emoji, messageOwnerId });
      // Broadcast reaction notification to channel (frontend filters out own reactions)
      if (reactorName && emoji) {
        socket.to(`channel:${channelId}`).emit("reaction_notification", { reactorName, emoji, messageId, reactorId });
      }
    });

    // ── Typing ───────────────────────────────────────────────────
    socket.on("typing_start", ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit("user_typing", { userId, username, typing: true });
    });
    socket.on("typing_stop", ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit("user_typing", { userId, username, typing: false });
    });

    // ── Channel Voice/Video Calls ────────────────────────────────
    socket.on("call_join", ({ channelId }) => {
      socket.join(`channel:${channelId}`);
      socket.to(`channel:${channelId}`).emit("call_user_joined", { userId, username, socketId: socket.id });
    });
    socket.on("call_leave", ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit("call_user_left", { userId, username });
    });
    socket.on("call_offer", ({ offer, toSocketId }) => {
      io.to(toSocketId).emit("call_offer", { offer, fromSocketId: socket.id, username, userId });
    });
    socket.on("call_answer", ({ answer, toSocketId }) => {
      io.to(toSocketId).emit("call_answer", { answer, fromSocketId: socket.id, username, userId });
    });
    socket.on("call_ice_candidate", ({ candidate, toSocketId }) => {
      io.to(toSocketId).emit("call_ice_candidate", { candidate, fromSocketId: socket.id });
    });

    // ── DM Direct Calls ──────────────────────────────────────────
    socket.on("dm_call_offer", ({ offer, toUserId, withVideo }) => {
      if (!offer?.type || !offer?.sdp) {
        console.error(`[DM-Call] bad offer from ${username}`);
        return;
      }
      const target = findSocket(io, toUserId);
      if (target) {
        console.log(`[DM-Call] offer: ${username} → ${target.user.username}`);
        target.emit("dm_call_offer", {
          offer: { type: offer.type, sdp: offer.sdp },
          fromSocketId: socket.id,
          fromUserId: userId,
          fromUsername: username,
          withVideo: !!withVideo,
        });
      } else {
        console.warn(`[DM-Call] ${toUserId} offline`);
        socket.emit("dm_call_user_offline", { toUserId });
      }
    });

    socket.on("dm_call_answer", ({ answer, toSocketId }) => {
      if (!answer?.type || !answer?.sdp) {
        console.error(`[DM-Call] bad answer from ${username}`);
        return;
      }
      console.log(`[DM-Call] answer: ${username} → ${toSocketId}`);
      io.to(toSocketId).emit("dm_call_answer", {
        answer: { type: answer.type, sdp: answer.sdp },
        fromSocketId: socket.id,
      });
    });

    socket.on("dm_call_ice_candidate", ({ candidate, toSocketId }) => {
      if (!candidate || !toSocketId) return;
      io.to(toSocketId).emit("dm_call_ice_candidate", { candidate, fromSocketId: socket.id });
    });

    socket.on("dm_call_end", async ({ toUserId, duration, withVideo }) => {
      const target = findSocket(io, toUserId);
      if (target) target.emit("dm_call_ended", { fromUserId: userId });

      // Emit call log event to both parties (UI handles display)
      const mins = Math.floor((duration || 0) / 60);
      const secs = (duration || 0) % 60;
      const durationStr = duration > 0
        ? `${mins > 0 ? mins + "м " : ""}${secs}с`
        : null;
      const callLog = {
        type: "call_log",
        withVideo: !!withVideo,
        duration: durationStr,
        callerId: userId,
        calleeId: toUserId,
        callerName: username,
        time: new Date().toISOString(),
        id: `call_${Date.now()}`,
      };
      // Delay slightly so DMPage has time to mount and register listener
      setTimeout(() => {
        socket.emit("dm_call_log", callLog);
        if (target) target.emit("dm_call_log", callLog);
      }, 1500);
    });

    // ── DM Messages ──────────────────────────────────────────────
    socket.on("dm_send", ({ toUserId, message }) => {
      const target = findSocket(io, toUserId);
      if (target) target.emit("dm_new_message", message);
    });

    // ── Friends ──────────────────────────────────────────────────
    socket.on("friend_request_sent", ({ toUserId, request }) => {
      findSocket(io, toUserId)?.emit("friend_request_received", request);
    });
    socket.on("friend_request_accepted", ({ toUserId }) => {
      findSocket(io, toUserId)?.emit("friend_accepted", { userId, username });
    });

    // ── Disconnect ───────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`[Socket] disconnected: ${username}`);
      setUserOffline(userId);
      io.emit("user_offline", { userId });
      prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } }).catch(() => {});
    });
  });

  return io;
};
