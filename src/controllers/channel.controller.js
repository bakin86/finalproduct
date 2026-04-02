import prisma from "../lib/prisma.js";

export const createChannel = async (req, res, next) => {
  try {
    const { name, workspaceId, description } = req.body;

    if (!name || !workspaceId) {
      return res.status(400).json({ ok: false, message: "Name and workspaceId are required" });
    }

    const channel = await prisma.channel.create({
      data: { name: name.toLowerCase().replace(/\s+/g, "-"), workspaceId, description },
    });

    res.status(201).json({ ok: true, message: "Channel created", data: channel });
  } catch (err) {
    next(err);
  }
};

export const getWorkspaceChannels = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const channels = await prisma.channel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    res.json({ ok: true, message: "Channels fetched", data: channels });
  } catch (err) {
    next(err);
  }
};
