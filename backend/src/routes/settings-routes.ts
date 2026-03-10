import { Router } from "express";
import { z } from "zod";
import { usersCollection } from "../db.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { publicUser } from "../auth.js";

const patchSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional(),
});

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get("/", async (req, res) => {
  res.json({ user: publicUser(req.user!) });
});

settingsRouter.patch("/", async (req, res) => {
  const parsed = patchSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid settings payload" });
    return;
  }

  const users = usersCollection();
  const target = await users.findOne({ id: req.user!.id });

  if (!target) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const updates: { name?: string; company?: string } = {};
  if (typeof parsed.data.name === "string") {
    updates.name = parsed.data.name;
    target.name = parsed.data.name;
  }
  if (typeof parsed.data.company === "string") {
    updates.company = parsed.data.company;
    target.company = parsed.data.company;
  }

  if (Object.keys(updates).length > 0) {
    await users.updateOne({ id: target.id }, { $set: updates });
  }

  res.json({ user: publicUser(target) });
});
