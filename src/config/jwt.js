import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Main token generator — always include username
export const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username || user.name || user.email?.split("@")[0] || "user",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Keep generateToken as alias for compatibility
export const generateToken = signToken;

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
