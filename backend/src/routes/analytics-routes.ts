import { Router } from "express";
import { invoicesCollection } from "../db.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import {
  buildMonthlyCategorySummary,
  buildMonthlyTrends,
  buildStatusDistribution,
  buildSummary,
  buildTopVendors,
} from "../utils/analytics.js";
import { buildVendorBrainSnapshot } from "../utils/vendor-brain.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get("/summary", async (req, res) => {
  const invoices = await invoicesCollection().find({ userId: req.user!.id }).toArray();

  res.json({ summary: buildSummary(invoices) });
});

analyticsRouter.get("/trends", async (req, res) => {
  const invoices = await invoicesCollection().find({ userId: req.user!.id }).toArray();

  res.json({ trends: buildMonthlyTrends(invoices) });
});

analyticsRouter.get("/status-distribution", async (req, res) => {
  const invoices = await invoicesCollection().find({ userId: req.user!.id }).toArray();

  res.json({ distribution: buildStatusDistribution(invoices) });
});

analyticsRouter.get("/top-vendors", async (req, res) => {
  const invoices = await invoicesCollection().find({ userId: req.user!.id }).toArray();

  res.json({ vendors: buildTopVendors(invoices) });
});

analyticsRouter.get("/monthly-categories", async (req, res) => {
  const invoices = await invoicesCollection().find({ userId: req.user!.id }).toArray();

  res.json({ rows: buildMonthlyCategorySummary(invoices) });
});

analyticsRouter.get("/vendor-brain", async (req, res) => {
  const invoices = await invoicesCollection().find({ userId: req.user!.id }).toArray();

  res.json(buildVendorBrainSnapshot(invoices));
});
