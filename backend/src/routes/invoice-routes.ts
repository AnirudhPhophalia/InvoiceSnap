import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { invoicesCollection } from "../db.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { InvoiceRecord } from "../types.js";
import { suggestExpenseCategory, suggestItemCategory } from "../utils/categorize.js";
import { learnFromCorrections } from "../utils/corrections.js";
import { renderPdfBuffer } from "../utils/pdf.js";

const invoiceItemSchema = z.object({
  description: z.string(),
  category: z.enum([
    "Software",
    "Travel",
    "Office",
    "Utilities",
    "Marketing",
    "Meals",
    "Professional Services",
    "Equipment",
    "Rent",
    "Other",
  ]).optional(),
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
  currencySymbol: z.string().min(1).max(4).default("₹"),
  category: z.enum([
    "Software",
    "Travel",
    "Office",
    "Utilities",
    "Marketing",
    "Meals",
    "Professional Services",
    "Equipment",
    "Rent",
    "Other",
  ]).default("Other"),
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
        invoice.fileName.toLowerCase().includes(search) ||
        (invoice.category || "Other").toLowerCase().includes(search)
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
  const userInvoiceHistory = await invoicesStore
    .find({ userId: req.user!.id })
    .sort({ uploadedAt: -1 })
    .limit(300)
    .toArray();

  const category = suggestExpenseCategory(parsed.data, userInvoiceHistory);
  const items = parsed.data.items.map((item) => ({
    ...item,
    category: item.category || suggestItemCategory(item.description),
  }));
  const newInvoice: InvoiceRecord = {
    id: uuid(),
    userId: req.user!.id,
    ...parsed.data,
    items,
    category,
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

  const updates: Partial<InvoiceRecord> = { ...parsed.data };
  if (!updates.category) {
    const historicalInvoices = await invoicesStore
      .find({ userId: req.user!.id, id: { $ne: target.id } })
      .sort({ uploadedAt: -1 })
      .limit(300)
      .toArray();

    const candidate = {
      fileName: updates.fileName ?? target.fileName,
      vendorName: updates.vendorName ?? target.vendorName,
      vendorGSTIN: updates.vendorGSTIN ?? target.vendorGSTIN,
      notes: updates.notes ?? target.notes,
      items: updates.items ?? target.items,
      category: "Other" as const,
    };

    updates.category = suggestExpenseCategory(candidate, historicalInvoices);
  }

  if (updates.items) {
    updates.items = updates.items.map((item) => ({
      ...item,
      category: item.category || suggestItemCategory(item.description),
    }));
  }

  if (!updates.currencySymbol) {
    updates.currencySymbol = target.currencySymbol || "₹";
  }

  await learnFromCorrections(req.user!.id, target, updates);
  Object.assign(target, updates);
  await invoicesStore.updateOne({ id: target.id, userId: req.user!.id }, { $set: updates });

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

  const content = await renderPdfBuffer((doc) => {
    const startX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const money = (value: number) => `${invoice.currencySymbol || "₹"} ${value.toFixed(2)}`;

    doc
      .save()
      .rect(startX, 40, pageWidth, 68)
      .fill('#EEF2FF')
      .restore();

    doc.fillColor('#1E3A8A').fontSize(22).text('InvoiceSnap', startX + 16, 58);
    doc.fillColor('#334155').fontSize(12).text(`Invoice #${invoice.invoiceNumber}`, startX + 16, 84);

    doc.fillColor('#111827').fontSize(11).text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, startX + pageWidth - 180, 62, { align: 'right', width: 160 });
    doc.fontSize(11).text(`Status: ${invoice.status.toUpperCase()}`, startX + pageWidth - 180, 80, { align: 'right', width: 160 });

    let cursorY = 132;

    doc.fontSize(13).fillColor('#111827').text('Vendor Details', startX, cursorY);
    cursorY += 22;
    doc.fontSize(11).fillColor('#374151').text(`Name: ${invoice.vendorName || 'N/A'}`, startX, cursorY);
    cursorY += 16;
    doc.text(`GSTIN: ${invoice.vendorGSTIN || 'N/A'}`, startX, cursorY);

    doc.text(`Invoice Date: ${invoice.invoiceDate || 'N/A'}`, startX + 280, cursorY - 16);
    doc.text(`Due Date: ${invoice.dueDate || 'Not provided'}`, startX + 280, cursorY);

    cursorY += 28;
    doc
      .save()
      .roundedRect(startX, cursorY, pageWidth, 56, 6)
      .fill('#F8FAFC')
      .restore();

    doc.fillColor('#111827').fontSize(11).text('Subtotal', startX + 16, cursorY + 12);
    doc.text(money(invoice.totalAmount - invoice.gstAmount), startX + 16, cursorY + 28);

    doc.text('GST', startX + 240, cursorY + 12);
    doc.text(money(invoice.gstAmount), startX + 240, cursorY + 28);

    doc.font('Helvetica-Bold').text('Total', startX + 420, cursorY + 12);
    doc.text(money(invoice.totalAmount), startX + 420, cursorY + 28);
    doc.font('Helvetica');

    cursorY += 82;
    doc.fontSize(13).fillColor('#111827').text('Items', startX, cursorY);
    cursorY += 18;

    doc
      .save()
      .rect(startX, cursorY, pageWidth, 22)
      .fill('#E2E8F0')
      .restore();
    doc.fillColor('#1F2937').fontSize(10);
    doc.text('Description', startX + 8, cursorY + 6, { width: 210 });
    doc.text('Qty', startX + 228, cursorY + 6, { width: 40, align: 'center' });
    doc.text('Unit Price', startX + 272, cursorY + 6, { width: 100, align: 'right' });
    doc.text('GST %', startX + 378, cursorY + 6, { width: 60, align: 'right' });
    doc.text('Total', startX + 444, cursorY + 6, { width: 90, align: 'right' });

    cursorY += 24;

    for (const item of invoice.items) {
      doc
        .save()
        .rect(startX, cursorY, pageWidth, 22)
        .fill('#FFFFFF')
        .restore();

      doc.fillColor('#374151').fontSize(10);
      doc.text(item.description, startX + 8, cursorY + 6, { width: 210, ellipsis: true });
      doc.text(String(item.quantity), startX + 228, cursorY + 6, { width: 40, align: 'center' });
      doc.text(money(item.unitPrice), startX + 272, cursorY + 6, { width: 100, align: 'right' });
      doc.text(`${item.gstRate.toFixed(2)}%`, startX + 378, cursorY + 6, { width: 60, align: 'right' });
      doc.text(money(item.total), startX + 444, cursorY + 6, { width: 90, align: 'right' });
      cursorY += 24;
    }

    if (invoice.notes) {
      cursorY += 8;
      doc.fontSize(12).fillColor('#111827').text('Notes', startX, cursorY);
      cursorY += 16;
      doc
        .save()
        .roundedRect(startX, cursorY, pageWidth, 42, 6)
        .fill('#F8FAFC')
        .restore();
      doc.fontSize(10).fillColor('#374151').text(invoice.notes, startX + 10, cursorY + 10, { width: pageWidth - 20 });
    }
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
  res.send(content);
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
