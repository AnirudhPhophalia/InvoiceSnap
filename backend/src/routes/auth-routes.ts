import { type Response, Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { config } from "../config.js";
import { usersCollection } from "../db.js";
import { publicUser, signToken } from "../auth.js";
import { requireAuth } from "../middleware/auth-middleware.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const authRouter = Router();

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

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
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

  const valid = await bcrypt.compare(parsed.data.currentPassword, target.passwordHash);
  if (!valid) {
    res.status(400).json({ message: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await users.updateOne({ id: target.id }, { $set: { passwordHash } });

  res.json({ ok: true });
});
