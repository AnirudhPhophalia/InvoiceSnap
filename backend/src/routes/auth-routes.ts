import { type Response, Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { config } from "../config.js";
import { usersCollection } from "../db.js";
import { publicUser, signToken } from "../auth.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { UserRecord } from "../types.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const authRouter = Router();

interface GoogleTokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie(config.authCookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.authCookieSameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(config.authCookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.authCookieSameSite,
    path: "/",
  });
}

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid signup payload" });
    return;
  }

  const users = usersCollection();
  const email = parsed.data.email.toLowerCase();

  const existingUser = await users.findOne({ email });
  if (existingUser) {
    res.status(409).json({ message: "User already exists" });
    return;
  }

  const newUser = {
    id: uuid(),
    email,
    name: parsed.data.name,
    company: "",
    passwordHash: await bcrypt.hash(parsed.data.password, 10),
    authProvider: "local" as const,
    createdAt: new Date().toISOString(),
  };

  await users.insertOne(newUser);

  const token = signToken(newUser);
  setAuthCookie(res, token);
  res.status(201).json({ token, user: publicUser(newUser) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid login payload" });
    return;
  }

  const users = usersCollection();
  const user = await users.findOne({ email: parsed.data.email.toLowerCase() });

  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  if (!user.passwordHash) {
    res.status(401).json({ message: "This account uses Google sign-in" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ token, user: publicUser(user) });
});

authRouter.post("/google", async (req, res) => {
  if (!config.googleClientId) {
    res.status(503).json({ message: "Google auth is not configured" });
    return;
  }

  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid Google auth payload" });
    return;
  }

  let tokenInfo: GoogleTokenInfo | null = null;
  try {
    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(parsed.data.idToken)}`,
    );

    if (!tokenInfoResponse.ok) {
      res.status(401).json({ message: "Invalid Google token" });
      return;
    }

    tokenInfo = (await tokenInfoResponse.json()) as GoogleTokenInfo;
  } catch {
    res.status(401).json({ message: "Invalid Google token" });
    return;
  }

  if (tokenInfo.aud !== config.googleClientId) {
    res.status(401).json({ message: "Google token audience mismatch" });
    return;
  }

  const email = tokenInfo.email?.toLowerCase();
  const googleId = tokenInfo.sub;

  if (!email || !googleId || tokenInfo.email_verified !== "true") {
    res.status(401).json({ message: "Google account email is not verified" });
    return;
  }

  const users = usersCollection();
  const existingUser = await users.findOne({ email });
  let user: UserRecord;

  if (!existingUser) {
    const fallbackName = email.split("@")[0] || "User";
    const newUser: UserRecord = {
      id: uuid(),
      email,
      name: tokenInfo.name || fallbackName,
      company: "",
      authProvider: "google",
      googleId,
      createdAt: new Date().toISOString(),
    };
    await users.insertOne(newUser);
    user = newUser;
  } else {
    const { _id: _ignored, ...existingUserRecord } = existingUser;
    user = existingUserRecord;
    const updates: Record<string, string> = {};
    if (!user.googleId) {
      updates.googleId = googleId;
    }
    if (!user.authProvider) {
      updates.authProvider = user.passwordHash ? "local" : "google";
    }
    if (!user.name && tokenInfo.name) {
      updates.name = tokenInfo.name;
    }
    if (Object.keys(updates).length > 0) {
      await users.updateOne({ id: user.id }, { $set: updates });
      user = { ...user, ...updates };
    }
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

authRouter.post("/logout", requireAuth, async (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.post("/logout-all", requireAuth, async (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.patch("/password", requireAuth, async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid password payload" });
    return;
  }

  const users = usersCollection();
  const target = await users.findOne({ id: req.user!.id });

  if (!target) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (!target.passwordHash) {
    res.status(400).json({ message: "Password changes are unavailable for Google-only accounts" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, target.passwordHash);
  if (!valid) {
    res.status(400).json({ message: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await users.updateOne({ id: target.id }, { $set: { passwordHash } });

  res.json({ ok: true });
});
