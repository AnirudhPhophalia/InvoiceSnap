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
    const startX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const money = (value: number) => `INR ${value.toFixed(2)}`;

    doc
      .save()
      .rect(startX, 40, pageWidth, 68)
      .fill('#ECFDF5')
      .restore();

    doc.fillColor('#065F46').fontSize(22).text('GST Report', startX + 16, 58);
    doc.fillColor('#374151').fontSize(12).text(`Period: ${month}`, startX + 16, 84);
    doc.fontSize(11).text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, startX + pageWidth - 180, 72, { align: 'right', width: 160 });

    let cursorY = 132;

    doc
      .save()
      .roundedRect(startX, cursorY, pageWidth, 56, 6)
      .fill('#F8FAFC')
      .restore();

    doc.fillColor('#111827').fontSize(11).text('Invoices', startX + 16, cursorY + 12);
    doc.text(String(report.invoices.length), startX + 16, cursorY + 28);
    doc.text('Taxable Value', startX + 220, cursorY + 12);
    doc.text(money(report.totalTaxableValue), startX + 220, cursorY + 28);
    doc.font('Helvetica-Bold').text('Total GST', startX + 420, cursorY + 12);
    doc.text(money(report.totalGST), startX + 420, cursorY + 28);
    doc.font('Helvetica');

    cursorY += 84;
    doc.fontSize(13).fillColor('#111827').text('GST Breakdown', startX, cursorY);
    cursorY += 18;

    doc
      .save()
      .rect(startX, cursorY, pageWidth, 22)
      .fill('#E2E8F0')
      .restore();

    doc.fillColor('#1F2937').fontSize(10);
    doc.text('GST Rate', startX + 10, cursorY + 6, { width: 100 });
    doc.text('Invoice Count', startX + 180, cursorY + 6, { width: 120, align: 'right' });
    doc.text('GST Amount', startX + 360, cursorY + 6, { width: 170, align: 'right' });
    cursorY += 24;

    for (const row of report.gstBreakdown) {
      doc
        .save()
        .rect(startX, cursorY, pageWidth, 22)
        .fill('#FFFFFF')
        .restore();

      doc.fillColor('#374151').fontSize(10);
      doc.text(`${row.rate}%`, startX + 10, cursorY + 6, { width: 100 });
      doc.text(String(row.invoiceCount), startX + 180, cursorY + 6, { width: 120, align: 'right' });
      doc.text(money(row.amount), startX + 360, cursorY + 6, { width: 170, align: 'right' });
      cursorY += 24;
    }
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=gst-report-${month}.pdf`);
  res.send(content);
});
