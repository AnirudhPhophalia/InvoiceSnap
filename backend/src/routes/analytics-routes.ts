import { Router } from "express";
import { readDb } from "../db.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import {
  buildMonthlyTrends,
  buildStatusDistribution,
  buildSummary,
  buildTopVendors,
} from "../utils/analytics.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get("/summary", async (req, res) => {
  const db = await readDb();
  const invoices = db.invoices.filter((invoice) => invoice.userId === req.user!.id);

  res.json({ summary: buildSummary(invoices) });
});

analyticsRouter.get("/trends", async (req, res) => {
  const db = await readDb();
  const invoices = db.invoices.filter((invoice) => invoice.userId === req.user!.id);

  res.json({ trends: buildMonthlyTrends(invoices) });
});

analyticsRouter.get("/status-distribution", async (req, res) => {
  const db = await readDb();
  const invoices = db.invoices.filter((invoice) => invoice.userId === req.user!.id);

  res.json({ distribution: buildStatusDistribution(invoices) });
});

analyticsRouter.get("/top-vendors", async (req, res) => {
  const db = await readDb();
  const invoices = db.invoices.filter((invoice) => invoice.userId === req.user!.id);

  res.json({ vendors: buildTopVendors(invoices) });
});
