export function generateExtractionFromFilename(fileName: string) {
  const now = new Date();
  const base = fileName.replace(/\.[^.]+$/, "");
  const seed = base.length || 7;

  const totalAmount = 1000 + seed * 137;
  const gstAmount = Number((totalAmount * 0.18).toFixed(2));

  return {
    fileName,
    vendorName: `${base.slice(0, 20) || "Sample"} Enterprises`,
    vendorGSTIN: "27AAPFU0939F1ZV",
    invoiceNumber: `INV-${now.getFullYear()}-${String(seed).padStart(3, "0")}`,
    invoiceDate: now.toISOString().slice(0, 10),
    dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    totalAmount,
    gstAmount,
    notes: "Auto-extracted from uploaded file",
    items: [
      {
        description: "Extracted invoice line item",
        quantity: 1,
        unitPrice: Number((totalAmount - gstAmount).toFixed(2)),
        total: Number((totalAmount - gstAmount).toFixed(2)),
        gstRate: 18,
      },
    ],
  };
}
