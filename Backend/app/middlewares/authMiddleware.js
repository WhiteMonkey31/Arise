import jwt from "jsonwebtoken";
import prisma from "../db/prisma.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ detail: "Could not validate credentials" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.SECRET_KEY || "secret");

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      return res.status(401).json({ detail: "User not found" });
    }

    if (!user.isActive) {
      return res.status(400).json({ detail: "Inactive user" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ detail: "Could not validate credentials" });
  }
};
