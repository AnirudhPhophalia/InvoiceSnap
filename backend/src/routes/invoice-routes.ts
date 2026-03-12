import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { invoicesCollection, sourceDocumentsCollection } from "../db.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import type { InvoiceRecord } from "../types.js";
import { suggestExpenseCategory, suggestItemCategory } from "../utils/categorize.js";
import { learnFromCorrections } from "../utils/corrections.js";
import { isLikelyDuplicate, normalizeConfidence, shouldFlagForReview } from "../utils/invoice-quality.js";
import { renderPdfBuffer } from "../utils/pdf.js";
import { assessInvoiceWithVendorBrain } from "../utils/vendor-brain.js";

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
  sourceDocumentId: z.string().optional(),
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
  extractionSource: z.string().optional(),
  extractionConfidence: z.number().min(0).max(1).optional(),
  extractionNeedsReview: z.boolean().optional(),
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
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const needsReview = typeof req.query.needsReview === "string" ? req.query.needsReview : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const hasPageSize = typeof req.query.pageSize === "string";
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const effectivePageSize = hasPageSize ? pageSize : 500;
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "uploadedAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  const allowedSortFields: Record<string, string> = {
    uploadedAt: "uploadedAt",
    invoiceDate: "invoiceDate",
    vendorName: "vendorName",
    totalAmount: "totalAmount",
    status: "status",
  };

  const baseQuery: Record<string, unknown> = { userId: req.user!.id };
  if (status && status !== "all") {
    baseQuery.status = status;
  }
  if (category && category !== "all") {
    baseQuery.category = category;
  }
  if (needsReview === "true") {
    baseQuery.extractionNeedsReview = true;
  }
  if (needsReview === "false") {
    baseQuery.extractionNeedsReview = false;
  }

  if (search) {
    baseQuery.$or = [
      { vendorName: { $regex: search, $options: "i" } },
      { invoiceNumber: { $regex: search, $options: "i" } },
      { fileName: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  const total = await invoicesStore.countDocuments(baseQuery);
  const invoices = await invoicesStore
    .find(baseQuery)
    .sort({ [allowedSortFields[sortBy] || "uploadedAt"]: sortOrder })
    .skip((page - 1) * effectivePageSize)
    .limit(effectivePageSize)
    .toArray();

  res.json({
    invoices,
    pagination: {
      page,
      pageSize: effectivePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / effectivePageSize)),
    },
  });
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

  const duplicateCandidates = await invoicesStore
    .find({
      userId: req.user!.id,
      invoiceNumber: parsed.data.invoiceNumber,
      invoiceDate: parsed.data.invoiceDate,
    })
    .limit(20)
    .toArray();

  const duplicate = duplicateCandidates.find((row) =>
    isLikelyDuplicate(
      {
        vendorName: parsed.data.vendorName,
        vendorGSTIN: parsed.data.vendorGSTIN,
        invoiceNumber: parsed.data.invoiceNumber,
        invoiceDate: parsed.data.invoiceDate,
        totalAmount: parsed.data.totalAmount,
      },
      {
        vendorName: row.vendorName,
        vendorGSTIN: row.vendorGSTIN,
        invoiceNumber: row.invoiceNumber,
        invoiceDate: row.invoiceDate,
        totalAmount: row.totalAmount,
      },
    ),
  );

  if (duplicate) {
    res.status(409).json({ message: "Duplicate invoice detected. This invoice appears to already exist." });
    return;
  }

  const extractionConfidence = normalizeConfidence(parsed.data.extractionConfidence ?? 0);
  const extractionNeedsReview = parsed.data.extractionNeedsReview ?? shouldFlagForReview({
    vendorName: parsed.data.vendorName,
    invoiceNumber: parsed.data.invoiceNumber,
    invoiceDate: parsed.data.invoiceDate,
    totalAmount: parsed.data.totalAmount,
    items,
    extractionConfidence,
  });

  const vendorAssessment = assessInvoiceWithVendorBrain(
    {
      vendorName: parsed.data.vendorName,
      vendorGSTIN: parsed.data.vendorGSTIN,
      invoiceNumber: parsed.data.invoiceNumber,
      invoiceDate: parsed.data.invoiceDate,
      totalAmount: parsed.data.totalAmount,
      category,
      items,
    },
    userInvoiceHistory,
  );

  const newInvoice: InvoiceRecord = {
    id: uuid(),
    userId: req.user!.id,
    ...parsed.data,
    items,
    category,
    extractionConfidence,
    extractionNeedsReview: extractionNeedsReview || vendorAssessment.riskScore >= 45,
    vendorRiskScore: vendorAssessment.riskScore,
    vendorRiskReasons: vendorAssessment.riskReasons,
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

invoiceRouter.get("/:id/source", async (req, res) => {
  const invoice = await invoicesCollection().findOne({ id: req.params.id, userId: req.user!.id });
  if (!invoice) {
    res.status(404).json({ message: "Invoice not found" });
    return;
  }

  if (!invoice.sourceDocumentId) {
    res.status(404).json({ message: "Source document not found for this invoice" });
    return;
  }

  const source = await sourceDocumentsCollection().findOne({ id: invoice.sourceDocumentId, userId: req.user!.id });
  if (!source) {
    res.status(404).json({ message: "Source document not found" });
    return;
  }

  res.setHeader("Content-Type", source.mimeType);
  res.setHeader("Content-Disposition", `inline; filename=${source.fileName}`);
  res.send(Buffer.isBuffer(source.content) ? source.content : Buffer.from(source.content));
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

  if (
    typeof updates.vendorName !== "undefined" ||
    typeof updates.invoiceNumber !== "undefined" ||
    typeof updates.invoiceDate !== "undefined" ||
    typeof updates.totalAmount !== "undefined" ||
    typeof updates.items !== "undefined" ||
    typeof updates.extractionConfidence === "number"
  ) {
    const candidateItems = updates.items ?? target.items;
    const candidateConfidence = normalizeConfidence(updates.extractionConfidence ?? target.extractionConfidence ?? 0);
    updates.extractionConfidence = candidateConfidence;
    updates.extractionNeedsReview = shouldFlagForReview({
      vendorName: updates.vendorName ?? target.vendorName,
      invoiceNumber: updates.invoiceNumber ?? target.invoiceNumber,
      invoiceDate: updates.invoiceDate ?? target.invoiceDate,
      totalAmount: updates.totalAmount ?? target.totalAmount,
      items: candidateItems,
      extractionConfidence: candidateConfidence,
    });

    const vendorHistory = await invoicesStore
      .find({ userId: req.user!.id, id: { $ne: target.id } })
      .sort({ uploadedAt: -1 })
      .limit(300)
      .toArray();
    const vendorAssessment = assessInvoiceWithVendorBrain(
      {
        vendorName: updates.vendorName ?? target.vendorName,
        vendorGSTIN: updates.vendorGSTIN ?? target.vendorGSTIN,
        invoiceNumber: updates.invoiceNumber ?? target.invoiceNumber,
        invoiceDate: updates.invoiceDate ?? target.invoiceDate,
        totalAmount: updates.totalAmount ?? target.totalAmount,
        category: updates.category ?? target.category,
        items: candidateItems,
      },
      vendorHistory,
    );
    updates.vendorRiskScore = vendorAssessment.riskScore;
    updates.vendorRiskReasons = vendorAssessment.riskReasons;
    updates.extractionNeedsReview = Boolean(updates.extractionNeedsReview) || vendorAssessment.riskScore >= 45;
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
    const PW       = doc.page.width;
    const ML       = doc.page.margins.left;
    const MR       = doc.page.margins.right;
    const contentW = PW - ML - MR;
    const rightX   = ML + contentW;

    const money = (v: number) => `${invoice.currencySymbol || "\u20B9"} ${v.toFixed(2)}`;

    // ─── Palette ──────────────────────────────────────────────────────────────
    const BRAND    = '#4F46E5';
    const BRAND_LT = '#EEF2FF';
    const WHITE    = '#FFFFFF';
    const GRAY_50  = '#F9FAFB';
    const GRAY_200 = '#E5E7EB';
    const GRAY_600 = '#4B5563';
    const GRAY_700 = '#374151';
    const GRAY_800 = '#1F2937';
    const GRAY_900 = '#111827';
    const S_GREEN  = '#059669';
    const S_YELLOW = '#D97706';
    const S_RED    = '#DC2626';

    // ─── Header band ─────────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 88).fill(BRAND);
    doc.font('Helvetica-Bold').fontSize(24).fillColor(WHITE)
       .text('InvoiceSnap', ML, 22);
    doc.font('Helvetica').fontSize(10).fillColor('#C7D2FE')
       .text('Smart Invoice Management', ML, 52);
    doc.font('Helvetica-Bold').fontSize(32).fillColor('#E0E7FF')
       .text('INVOICE', ML, 16, { align: 'right', width: contentW });
    doc.font('Helvetica').fontSize(11).fillColor('#C7D2FE')
       .text(`# ${invoice.invoiceNumber}`, ML, 54, { align: 'right', width: contentW });

    // ─── Vendor + meta row ────────────────────────────────────────────────────
    const leftColW  = contentW * 0.52;
    const rightColX = ML + leftColW + 16;
    const rightColW = contentW - leftColW - 16;
    let y = 106;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(GRAY_600)
       .text('BILLED FROM', ML, y, { characterSpacing: 1 });
    y += 13;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(GRAY_900)
       .text(invoice.vendorName || 'N/A', ML, y, { width: leftColW });
    y += 18;
    if (invoice.vendorGSTIN) {
      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY_600)
         .text(`GSTIN: ${invoice.vendorGSTIN}`, ML, y);
      y += 13;
    }

    let metaY = 106;
    const metaPair = (label: string, val: string) => {
      doc.font('Helvetica').fontSize(9).fillColor(GRAY_600)
         .text(label, rightColX, metaY, { width: rightColW * 0.45 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY_800)
         .text(val, rightColX + rightColW * 0.45, metaY, { width: rightColW * 0.55, align: 'right' });
      metaY += 14;
    };
    metaPair('Invoice Date:', invoice.invoiceDate || 'N/A');
    metaPair('Due Date:', invoice.dueDate || 'Not provided');

    const statusColor = invoice.status === 'paid' ? S_GREEN : invoice.status === 'draft' ? S_YELLOW : S_RED;
    const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
    const badgeW = statusLabel.length * 6.8 + 20;
    const badgeX = rightX - badgeW;
    doc.save().roundedRect(badgeX, metaY, badgeW, 18, 9).fill(statusColor).restore();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE)
       .text(statusLabel, badgeX, metaY + 5, { width: badgeW, align: 'center' });

    // ─── Divider ──────────────────────────────────────────────────────────────
    y = Math.max(y, metaY + 18) + 14;
    doc.save().moveTo(ML, y).lineTo(rightX, y)
       .lineWidth(0.5).strokeColor(GRAY_200).stroke().restore();
    y += 14;

    // ─── Summary band ────────────────────────────────────────────────────────
    const sumH  = 58;
    const sumC2 = ML + contentW * 0.35;
    const sumC3 = ML + contentW * 0.66;

    doc.save().roundedRect(ML, y, contentW, sumH, 8).fill(GRAY_50).restore();
    doc.save().roundedRect(ML, y, 4, sumH, 2).fill(BRAND).restore();
    // Total highlight box (right side)
    doc.save().roundedRect(sumC3 - 4, y, rightX - sumC3 + 4, sumH, 8).fill(BRAND).restore();
    doc.save().rect(sumC3 - 4, y, 16, sumH).fill(BRAND).restore();

    doc.font('Helvetica').fontSize(8).fillColor(GRAY_600)
       .text('SUBTOTAL', ML + 14, y + 11, { characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(GRAY_900)
       .text(money(invoice.totalAmount - invoice.gstAmount), ML + 14, y + 26);

    doc.font('Helvetica').fontSize(8).fillColor(GRAY_600)
       .text('TAX / GST', sumC2, y + 11, { characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(GRAY_900)
       .text(money(invoice.gstAmount), sumC2, y + 26);

    doc.font('Helvetica').fontSize(8).fillColor('#C7D2FE')
       .text('TOTAL AMOUNT', sumC3 + 6, y + 11, { characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE)
       .text(money(invoice.totalAmount), sumC3 + 6, y + 26, { width: rightX - sumC3 - 14 });

    y += sumH + 20;

    // ─── Items table ─────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fillColor(GRAY_900).text('Line Items', ML, y);
    y += 14;

    // Column layout (widths sum to contentW ~499)
    const C = {
      desc:  { x: ML,       w: 183 },
      cat:   { x: ML + 183, w: 76  },
      qty:   { x: ML + 259, w: 33  },
      price: { x: ML + 292, w: 80  },
      gst:   { x: ML + 372, w: 42  },
      total: { x: ML + 414, w: rightX - ML - 414 },
    };

    const rowH = 26;
    doc.save().rect(ML, y, contentW, rowH).fill(GRAY_800).restore();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE);
    doc.text('DESCRIPTION', C.desc.x + 6,  y + 9, { width: C.desc.w  - 8              });
    doc.text('CATEGORY',    C.cat.x  + 4,  y + 9, { width: C.cat.w   - 6              });
    doc.text('QTY',         C.qty.x,        y + 9, { width: C.qty.w,   align: 'center' });
    doc.text('UNIT PRICE',  C.price.x,      y + 9, { width: C.price.w, align: 'right'  });
    doc.text('GST%',        C.gst.x,        y + 9, { width: C.gst.w,   align: 'right'  });
    doc.text('AMOUNT',      C.total.x,      y + 9, { width: C.total.w - 4, align: 'right' });
    y += rowH;

    invoice.items.forEach((item, i) => {
      const itemTotalInclGst = item.total + (item.total * item.gstRate) / 100;
      const bg = i % 2 === 0 ? WHITE : GRAY_50;
      doc.save().rect(ML, y, contentW, rowH).fill(bg).restore();
      doc.save().moveTo(ML, y + rowH).lineTo(rightX, y + rowH)
         .lineWidth(0.4).strokeColor(GRAY_200).stroke().restore();

      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY_900)
         .text(item.description, C.desc.x + 6, y + 8, { width: C.desc.w - 10, ellipsis: true });
      doc.font('Helvetica').fontSize(9).fillColor(GRAY_600);
      doc.text(item.category || 'Other', C.cat.x + 4,  y + 9, { width: C.cat.w   - 8              });
      doc.text(String(item.quantity),    C.qty.x,        y + 9, { width: C.qty.w,   align: 'center' });
      doc.text(money(item.unitPrice),    C.price.x,      y + 9, { width: C.price.w, align: 'right'  });
      doc.text(`${item.gstRate.toFixed(0)}%`, C.gst.x,  y + 9, { width: C.gst.w,   align: 'right'  });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY_800)
        .text(money(itemTotalInclGst), C.total.x, y + 9, { width: C.total.w - 4, align: 'right' });
      y += rowH;
    });

    doc.save().moveTo(ML, y).lineTo(rightX, y)
       .lineWidth(1.5).strokeColor(BRAND).stroke().restore();
    y += 16;

    // ─── Totals block ────────────────────────────────────────────────────────
    const totW = 210;
    const totX = rightX - totW;
    const tRow = (label: string, val: string, major = false, highlight = false) => {
      if (highlight) {
        doc.save().roundedRect(totX - 6, y - 3, totW + 6, 24, 4).fill(BRAND_LT).restore();
      }
      const fnt   = major ? 'Helvetica-Bold' : 'Helvetica';
      const sz    = major ? 11 : 10;
      const color = highlight ? BRAND : major ? GRAY_900 : GRAY_700;
      doc.font(fnt).fontSize(sz).fillColor(color).text(label, totX, y, { width: 110          });
      doc.font(fnt).fontSize(sz).fillColor(color).text(val,   totX + 110, y, { width: totW - 110, align: 'right' });
      y += major ? 24 : 18;
    };
    tRow('Subtotal', money(invoice.totalAmount - invoice.gstAmount));
    tRow('Tax / GST', money(invoice.gstAmount));
    doc.save().moveTo(totX, y - 4).lineTo(rightX, y - 4)
       .lineWidth(0.5).strokeColor(GRAY_200).stroke().restore();
    tRow('Total Amount', money(invoice.totalAmount), true, true);

    y += 20;

    // ─── Footer ──────────────────────────────────────────────────────────────
    const footerY = doc.page.height - doc.page.margins.bottom - 32;
    doc.save().moveTo(ML, footerY).lineTo(rightX, footerY)
       .lineWidth(0.5).strokeColor(GRAY_200).stroke().restore();
    doc.font('Helvetica').fontSize(9).fillColor(GRAY_600)
       .text(
         `Generated by InvoiceSnap  \u2022  ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
         ML, footerY + 10,
         { align: 'center', width: contentW }
       );
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
