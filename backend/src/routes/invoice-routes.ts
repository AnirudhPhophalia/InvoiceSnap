import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { invoicesCollection } from "../db.js";
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
  const invoicesStore = invoicesCollection();
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

  const baseQuery: Record<string, unknown> = { userId: req.user!.id };
  if (status && status !== "all") {
    baseQuery.status = status;
  }

  const invoices = (await invoicesStore
    .find(baseQuery)
    .sort({ uploadedAt: -1 })
    .toArray())
    .filter((invoice) => {
      if (!search) {
        return true;
      }

      return (
        invoice.vendorName.toLowerCase().includes(search) ||
        invoice.invoiceNumber.toLowerCase().includes(search) ||
        invoice.fileName.toLowerCase().includes(search)
      );
    });

  res.json({ invoices });
});

invoiceRouter.post("/", async (req, res) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid invoice payload" });
    return;
  }

  const invoicesStore = invoicesCollection();
  const newInvoice: InvoiceRecord = {
    id: uuid(),
    userId: req.user!.id,
    ...parsed.data,
    uploadedAt: new Date().toISOString(),
  };

  await invoicesStore.insertOne(newInvoice);

  res.status(201).json({ invoice: newInvoice });
});

invoiceRouter.get("/:id", async (req, res) => {
  const invoice = await invoicesCollection().findOne({ id: req.params.id, userId: req.user!.id });

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

  const invoicesStore = invoicesCollection();
  const target = await invoicesStore.findOne({ id: req.params.id, userId: req.user!.id });

  if (!target) {
    res.status(404).json({ message: "Invoice not found" });
    return;
  }

  Object.assign(target, parsed.data);
  await invoicesStore.updateOne({ id: target.id, userId: req.user!.id }, { $set: parsed.data });

  res.json({ invoice: target });
});

invoiceRouter.delete("/:id", async (req, res) => {
  const result = await invoicesCollection().deleteOne({ id: req.params.id, userId: req.user!.id });

  if (result.deletedCount === 0) {
    res.status(404).json({ message: "Invoice not found" });
    return;
  }

  res.status(204).send();
});

invoiceRouter.get("/:id/export/pdf", async (req, res) => {
  const invoice = await invoicesCollection().findOne({ id: req.params.id, userId: req.user!.id });

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
  const invoice = await invoicesCollection().findOne({ id: req.params.id, userId: req.user!.id });

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
