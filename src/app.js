import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { fileURLToPath } from "url";
import path from "path";

import authRoutes from "./routes/auth.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import channelRoutes from "./routes/channel.routes.js";
import messageRoutes from "./routes/message.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import reactionRoutes from "./routes/reaction.routes.js";
import dmRoutes from "./routes/dm.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import blockRoutes from "./routes/block.routes.js";
import banRoutes from "./routes/ban.routes.js";
import roleRoutes from "./routes/role.routes.js";
import threadRoutes from "./routes/thread.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { initSocket } from "./socket/index.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// ── CORS ─────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin (curl, mobile, server-to-server) or whitelisted origins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Static uploads ───────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Health check ─────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ ok: true, message: "AuraSync API running", version: "1.0.0" }));
app.get("/health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ── Routes ───────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/dm", dmRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/blocks", blockRoutes);
app.use("/api/bans", banRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/workspaces/:workspaceId/roles", roleRoutes);
app.use("/api/threads", threadRoutes);

// ── Error handlers ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Socket.IO ────────────────────────────────────────────────────
initSocket(httpServer);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`✅ AuraSync server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});

export default app;
