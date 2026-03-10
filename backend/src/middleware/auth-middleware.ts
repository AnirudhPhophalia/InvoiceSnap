import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../auth.js";
import { readDb } from "../db.js";
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

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = verifyToken(token);
    const db = await readDb();
    const user = db.users.find((candidate) => candidate.id === payload.sub);

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
