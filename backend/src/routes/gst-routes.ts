import { Router } from "express";
import { invoicesCollection } from "../db.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { buildGstReport } from "../utils/analytics.js";
import { renderPdfBuffer } from "../utils/pdf.js";

export const gstRouter = Router();

gstRouter.use(requireAuth);

gstRouter.get("/:month", async (req, res) => {
  const month = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ message: "Month must be YYYY-MM" });
    return;
  }

  const invoices = await invoicesCollection().find({ userId: req.user!.id }).toArray();
  const report = buildGstReport(invoices, month);

  res.json(report);
});

gstRouter.get("/:month/export/excel", async (req, res) => {
  const month = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ message: "Month must be YYYY-MM" });
    return;
  }

  const invoices = await invoicesCollection().find({ userId: req.user!.id }).toArray();
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

  const invoices = await invoicesCollection().find({ userId: req.user!.id }).toArray();
  const report = buildGstReport(invoices, month);

  const content = await renderPdfBuffer((doc) => {
    const PW = doc.page.width;
    const ML = doc.page.margins.left;
    const MR = doc.page.margins.right;
    const contentW = PW - ML - MR;
    const rightX = ML + contentW;

    const money = (value: number) => `INR ${value.toFixed(2)}`;

    const BRAND = '#4F46E5';
    const BRAND_LT = '#EEF2FF';
    const WHITE = '#FFFFFF';
    const GRAY_50 = '#F9FAFB';
    const GRAY_200 = '#E5E7EB';
    const GRAY_600 = '#4B5563';
    const GRAY_700 = '#374151';
    const GRAY_800 = '#1F2937';
    const GRAY_900 = '#111827';

    doc.rect(0, 0, PW, 88).fill(BRAND);
    doc.font('Helvetica-Bold').fontSize(24).fillColor(WHITE)
      .text('InvoiceSnap', ML, 22);
    doc.font('Helvetica').fontSize(10).fillColor('#C7D2FE')
      .text('GST Intelligence Summary', ML, 52);
    doc.font('Helvetica-Bold').fontSize(31).fillColor('#E0E7FF')
      .text('GST REPORT', ML, 16, { align: 'right', width: contentW });
    doc.font('Helvetica').fontSize(11).fillColor('#C7D2FE')
      .text(`Period: ${month}`, ML, 54, { align: 'right', width: contentW });

    let y = 108;
    doc.font('Helvetica').fontSize(9).fillColor(GRAY_600)
      .text('GENERATED ON', ML, y, { characterSpacing: 1 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(GRAY_800)
      .text(new Date().toLocaleDateString('en-IN'), ML + 90, y - 1);
    y += 20;

    const summaryH = 60;
    const c2 = ML + contentW * 0.34;
    const c3 = ML + contentW * 0.68;
    doc.save().roundedRect(ML, y, contentW, summaryH, 8).fill(GRAY_50).restore();
    doc.save().roundedRect(ML, y, 4, summaryH, 2).fill(BRAND).restore();
    doc.save().roundedRect(c3 - 4, y, rightX - c3 + 4, summaryH, 8).fill(BRAND).restore();
    doc.save().rect(c3 - 4, y, 16, summaryH).fill(BRAND).restore();

    doc.font('Helvetica').fontSize(8).fillColor(GRAY_600)
      .text('INVOICES', ML + 14, y + 11, { characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(GRAY_900)
      .text(String(report.invoices.length), ML + 14, y + 29);

    doc.font('Helvetica').fontSize(8).fillColor(GRAY_600)
      .text('TAXABLE VALUE', c2, y + 11, { characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(GRAY_900)
      .text(money(report.totalTaxableValue), c2, y + 29);

    doc.font('Helvetica').fontSize(8).fillColor('#C7D2FE')
      .text('TOTAL GST', c3 + 6, y + 11, { characterSpacing: 0.8 });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE)
      .text(money(report.totalGST), c3 + 6, y + 29, { width: rightX - c3 - 12 });

    y += summaryH + 24;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(GRAY_900)
      .text('GST Breakdown', ML, y);
    y += 14;

    const tableRowH = 26;
    const C = {
      rate: { x: ML, w: 130 },
      count: { x: ML + 130, w: 170 },
      amount: { x: ML + 300, w: contentW - 300 },
    };

    doc.save().rect(ML, y, contentW, tableRowH).fill(GRAY_800).restore();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE);
    doc.text('GST RATE', C.rate.x + 8, y + 9, { width: C.rate.w - 12 });
    doc.text('INVOICE COUNT', C.count.x + 8, y + 9, { width: C.count.w - 16, align: 'center' });
    doc.text('GST AMOUNT', C.amount.x + 8, y + 9, { width: C.amount.w - 14, align: 'right' });
    y += tableRowH;

    if (report.gstBreakdown.length === 0) {
      doc.save().rect(ML, y, contentW, tableRowH).fill(WHITE).restore();
      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY_600)
        .text('No GST data for this period.', ML + 8, y + 8, { width: contentW - 16, align: 'center' });
      y += tableRowH;
    } else {
      report.gstBreakdown.forEach((row, index) => {
        const bg = index % 2 === 0 ? WHITE : GRAY_50;
        doc.save().rect(ML, y, contentW, tableRowH).fill(bg).restore();
        doc.save().moveTo(ML, y + tableRowH).lineTo(rightX, y + tableRowH)
          .lineWidth(0.4).strokeColor(GRAY_200).stroke().restore();

        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GRAY_900)
          .text(`${row.rate}%`, C.rate.x + 8, y + 8, { width: C.rate.w - 12 });
        doc.font('Helvetica').fontSize(9.5).fillColor(GRAY_700)
          .text(String(row.invoiceCount), C.count.x + 8, y + 8, { width: C.count.w - 16, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GRAY_800)
          .text(money(row.amount), C.amount.x + 8, y + 8, { width: C.amount.w - 14, align: 'right' });
        y += tableRowH;
      });
    }

    y += 10;
    const totalsW = 210;
    const totalsX = rightX - totalsW;
    const totalRows = [
      { label: 'Taxable Value', value: money(report.totalTaxableValue) },
      { label: 'Total GST', value: money(report.totalGST), highlight: true },
    ];

    totalRows.forEach((row) => {
      if (row.highlight) {
        doc.save().roundedRect(totalsX - 6, y - 3, totalsW + 6, 24, 4).fill(BRAND_LT).restore();
      }
      const color = row.highlight ? BRAND : GRAY_800;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(color)
        .text(row.label, totalsX, y, { width: 108 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(color)
        .text(row.value, totalsX + 108, y, { width: totalsW - 108, align: 'right' });
      y += 21;
    });

    const footerY = doc.page.height - doc.page.margins.bottom - 32;
    doc.save().moveTo(ML, footerY).lineTo(rightX, footerY)
      .lineWidth(0.5).strokeColor(GRAY_200).stroke().restore();
    doc.font('Helvetica').fontSize(9).fillColor(GRAY_600)
      .text(
        `Generated by InvoiceSnap • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        ML, footerY + 10,
        { align: 'center', width: contentW }
      );
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=gst-report-${month}.pdf`);
  res.send(content);
});
