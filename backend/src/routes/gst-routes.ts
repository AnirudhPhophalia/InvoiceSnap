import { Router } from "express";
import { readDb } from "../db.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { buildGstReport } from "../utils/analytics.js";

export const gstRouter = Router();

gstRouter.use(requireAuth);

gstRouter.get("/:month", async (req, res) => {
  const month = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ message: "Month must be YYYY-MM" });
    return;
  }

  const db = await readDb();
  const invoices = db.invoices.filter((invoice) => invoice.userId === req.user!.id);
  const report = buildGstReport(invoices, month);

  res.json(report);
});

gstRouter.get("/:month/export/excel", async (req, res) => {
  const month = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ message: "Month must be YYYY-MM" });
    return;
  }

  const db = await readDb();
  const invoices = db.invoices.filter((invoice) => invoice.userId === req.user!.id);
  const report = buildGstReport(invoices, month);

  const rows = [
    ["rate", "items", "amount"],
    ...report.gstBreakdown.map((row) => [String(row.rate), String(row.invoiceCount), String(row.amount)]),
  ];

  const csv = rows.map((row) => row.join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=gst-report-${month}.csv`);
  res.send(csv);
});

gstRouter.get("/:month/export/pdf", async (req, res) => {
  const month = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ message: "Month must be YYYY-MM" });
    return;
  }

  const db = await readDb();
  const invoices = db.invoices.filter((invoice) => invoice.userId === req.user!.id);
  const report = buildGstReport(invoices, month);

  const lines = [
    `GST Report for ${month}`,
    `Invoices: ${report.invoices.length}`,
    `Taxable Value: ${report.totalTaxableValue.toFixed(2)}`,
    `Total GST: ${report.totalGST.toFixed(2)}`,
    "",
    "Breakdown:",
    ...report.gstBreakdown.map((row) => `${row.rate}% | items=${row.invoiceCount} | amount=${row.amount.toFixed(2)}`),
  ];

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=gst-report-${month}.pdf`);
  res.send(Buffer.from(lines.join("\n"), "utf8"));
});
