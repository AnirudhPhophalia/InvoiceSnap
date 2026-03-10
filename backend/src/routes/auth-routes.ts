import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { readDb, writeDb } from "../db.js";
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

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid signup payload" });
    return;
  }

  const db = await readDb();
  const email = parsed.data.email.toLowerCase();

  if (db.users.some((user) => user.email.toLowerCase() === email)) {
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

  db.users.push(newUser);
  await writeDb(db);

  const token = signToken(newUser);
  res.status(201).json({ token, user: publicUser(newUser) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid login payload" });
    return;
  }

  const db = await readDb();
  const user = db.users.find((candidate) => candidate.email.toLowerCase() === parsed.data.email.toLowerCase());

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
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

authRouter.post("/logout", requireAuth, async (_req, res) => {
  res.json({ ok: true });
});

authRouter.post("/logout-all", requireAuth, async (_req, res) => {
  res.json({ ok: true });
});

authRouter.patch("/password", requireAuth, async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid password payload" });
    return;
  }

  const db = await readDb();
  const target = db.users.find((candidate) => candidate.id === req.user!.id);

  if (!target) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, target.passwordHash);
  if (!valid) {
    res.status(400).json({ message: "Current password is incorrect" });
    return;
  }

  target.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await writeDb(db);

  res.json({ ok: true });
});
