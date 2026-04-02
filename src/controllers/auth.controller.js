import prisma from "../lib/prisma.js";
import { signToken } from "../config/jwt.js";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//
// 🔥 GOOGLE LOGIN
//
export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        ok: false,
        message: "No credential provided",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      sub: googleId,
      email,
      name,
      picture,
      email_verified,
    } = payload;

    if (!email_verified) {
      return res.status(401).json({
        ok: false,
        message: "Google email not verified",
      });
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          username: name || email.split("@")[0],
          avatar: picture,
          provider: "google",
          googleId,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider: "google",
          googleId,
          avatar: picture || user.avatar,
        },
      });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
    });

    res.json({
      ok: true,
      message: "Google login success",
      data: { token, user },
    });
  } catch (err) {
    console.error("Google login error:", err);
    next(err);
  }
};

//
// 🔥 GET ME
//
export const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        provider: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "User not found",
      });
    }

    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
};

//
// 🔥 UPDATE PROFILE (username солих)
//
export const updateProfile = async (req, res, next) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    if (!username || username.trim() === "") {
      return res.status(400).json({
        ok: false,
        message: "Username is required",
      });
    }

    const existing = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existing) {
      return res.status(409).json({
        ok: false,
        message: "Username already taken",
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username: username.trim() },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
      },
    });

    res.json({
      ok: true,
      message: "Profile updated",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

//
// 🔥 UPDATE AVATAR
//
export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "No file uploaded",
      });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
      },
    });

    res.json({
      ok: true,
      message: "Avatar updated",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

//
// 🔥 SEARCH USERS
//
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        ok: false,
        message: "Query must be at least 2 characters",
      });
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: q.trim(),
        },
        NOT: { id: userId },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
      take: 10,
    });

    res.json({
      ok: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};