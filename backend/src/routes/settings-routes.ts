import { Router } from "express";
import { z } from "zod";
import { readDb, writeDb } from "../db.js";
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

  const db = await readDb();
  const target = db.users.find((user) => user.id === req.user!.id);

  if (!target) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (typeof parsed.data.name === "string") {
    target.name = parsed.data.name;
  }
  if (typeof parsed.data.company === "string") {
    target.company = parsed.data.company;
  }

  await writeDb(db);

  res.json({ user: publicUser(target) });
});
