const onlineUsers = new Map();

export const setUserOnline = (userId, socketId) => {
  onlineUsers.set(userId, { socketId, connectedAt: new Date() });
};

export const setUserOffline = (userId) => {
  onlineUsers.delete(userId);
};

export const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

export const getExistingSocket = (userId) => {
  return onlineUsers.get(userId)?.socketId || null;
};

export { onlineUsers };