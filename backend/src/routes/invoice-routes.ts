import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { InvoiceRecord } from "../types.js";

const invoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
  gstRate: z.number(),
});

const createInvoiceSchema = z.object({
  fileName: z.string(),
  vendorName: z.string(),
  vendorGSTIN: z.string(),
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  totalAmount: z.number(),
  gstAmount: z.number(),
  items: z.array(invoiceItemSchema),
  notes: z.string(),
  status: z.enum(["draft", "confirmed", "paid"]),
});

const patchInvoiceSchema = createInvoiceSchema.partial();

export const invoiceRouter = Router();

invoiceRouter.use(requireAuth);

invoiceRouter.get("/", async (req, res) => {
  const db = await readDb();
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

  const invoices = db.invoices
    .filter((invoice) => invoice.userId === req.user!.id)
    .filter((invoice) => {
      if (status && status !== "all") {
        return invoice.status === status;
      }
      return true;
    })
    .filter((invoice) => {
      if (!search) {
        return true;
      }

      return (
        invoice.vendorName.toLowerCase().includes(search) ||
        invoice.invoiceNumber.toLowerCase().includes(search) ||
        invoice.fileName.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  res.json({ invoices });
});

invoiceRouter.post("/", async (req, res) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid invoice payload" });
    return;
  }

  const db = await readDb();
  const newInvoice: InvoiceRecord = {
    id: uuid(),
    userId: req.user!.id,
    ...parsed.data,
    uploadedAt: new Date().toISOString(),
  };

  db.invoices.push(newInvoice);
  await writeDb(db);

  res.status(201).json({ invoice: newInvoice });
});

invoiceRouter.get("/:id", async (req, res) => {
  const db = await readDb();
  const invoice = db.invoices.find((candidate) => candidate.id === req.params.id && candidate.userId === req.user!.id);

  if (!invoice) {
    res.status(404).json({ message: "Invoice not found" });
    return;
  }

  res.json({ invoice });
});

invoiceRouter.patch("/:id", async (req, res) => {
  const parsed = patchInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid invoice payload" });
    return;
  }

  const db = await readDb();
  const target = db.invoices.find((candidate) => candidate.id === req.params.id && candidate.userId === req.user!.id);

  if (!target) {
    res.status(404).json({ message: "Invoice not found" });
    return;
  }

  Object.assign(target, parsed.data);
  await writeDb(db);

  res.json({ invoice: target });
});

invoiceRouter.delete("/:id", async (req, res) => {
  const db = await readDb();
  const index = db.invoices.findIndex((candidate) => candidate.id === req.params.id && candidate.userId === req.user!.id);

  if (index < 0) {
    res.status(404).json({ message: "Invoice not found" });
    return;
  }

  db.invoices.splice(index, 1);
  await writeDb(db);

  res.status(204).send();
});

invoiceRouter.get("/:id/export/pdf", async (req, res) => {
  const db = await readDb();
  const invoice = db.invoices.find((candidate) => candidate.id === req.params.id && candidate.userId === req.user!.id);

  if (!invoice) {
    res.status(404).json({ message: "Invoice not found" });
    return;
  }

  const lines = [
    `Invoice #${invoice.invoiceNumber}`,
    `Vendor: ${invoice.vendorName}`,
    `Invoice Date: ${invoice.invoiceDate}`,
    `Due Date: ${invoice.dueDate}`,
    `Total: ${invoice.totalAmount}`,
    `GST: ${invoice.gstAmount}`,
    "",
    "Items:",
    ...invoice.items.map((item) => `${item.description} | qty=${item.quantity} | total=${item.total}`),
  ];

  const content = lines.join("\n");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
  res.send(Buffer.from(content, "utf8"));
});

invoiceRouter.get("/:id/export/excel", async (req, res) => {
  const db = await readDb();
  const invoice = db.invoices.find((candidate) => candidate.id === req.params.id && candidate.userId === req.user!.id);

  if (!invoice) {
    res.status(404).json({ message: "Invoice not found" });
    return;
  }

  const rows = [
    ["invoiceNumber", "vendorName", "invoiceDate", "totalAmount", "gstAmount", "status"],
    [invoice.invoiceNumber, invoice.vendorName, invoice.invoiceDate, String(invoice.totalAmount), String(invoice.gstAmount), invoice.status],
  ];

  const csv = rows.map((row) => row.join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoice.invoiceNumber}.csv`);
  res.send(csv);
});
