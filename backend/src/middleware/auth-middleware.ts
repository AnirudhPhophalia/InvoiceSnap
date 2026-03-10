import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../auth.js";
import { config } from "../config.js";
import { usersCollection } from "../db.js";
import type { UserRecord } from "../types.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  const cookieToken = typeof req.cookies?.[config.authCookieName] === "string" ? req.cookies[config.authCookieName] : null;
  const token = headerToken || cookieToken;

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const payload = verifyToken(token);
    const user = await usersCollection().findOne({ id: payload.sub });

    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
