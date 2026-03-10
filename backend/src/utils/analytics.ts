import type { InvoiceRecord } from "../types.js";

export function buildSummary(invoices: InvoiceRecord[]) {
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalGST = invoices.reduce((sum, invoice) => sum + invoice.gstAmount, 0);
  const totalInvoices = invoices.length;

  return {
    totalAmount,
    totalGST,
    totalInvoices,
    averageAmount: totalInvoices > 0 ? totalAmount / totalInvoices : 0,
    averageGST: totalInvoices > 0 ? totalGST / totalInvoices : 0,
    confirmed: invoices.filter((invoice) => invoice.status === "confirmed").length,
    draft: invoices.filter((invoice) => invoice.status === "draft").length,
    paid: invoices.filter((invoice) => invoice.status === "paid").length,
  };
}

export function buildMonthlyTrends(invoices: InvoiceRecord[]) {
  const byMonth = new Map<string, { month: string; amount: number; gst: number; count: number }>();

  for (const invoice of invoices) {
    const date = new Date(invoice.invoiceDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, { month: monthLabel, amount: 0, gst: 0, count: 0 });
    }

    const row = byMonth.get(monthKey)!;
    row.amount += invoice.totalAmount;
    row.gst += invoice.gstAmount;
    row.count += 1;
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, value]) => value);
}

export function buildTopVendors(invoices: InvoiceRecord[]) {
  const byVendor = new Map<string, number>();

  for (const invoice of invoices) {
    const name = invoice.vendorName || "Unknown";
    byVendor.set(name, (byVendor.get(name) || 0) + invoice.totalAmount);
  }

  return [...byVendor.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));
}

export function buildStatusDistribution(invoices: InvoiceRecord[]) {
  const counts = { draft: 0, confirmed: 0, paid: 0 };

  for (const invoice of invoices) {
    counts[invoice.status] += 1;
  }

  return [
    { name: "Draft", value: counts.draft },
    { name: "Confirmed", value: counts.confirmed },
    { name: "Paid", value: counts.paid },
  ];
}

export function buildGstReport(invoices: InvoiceRecord[], month: string) {
  const monthlyInvoices = invoices.filter((invoice) => invoice.invoiceDate.startsWith(month));
  const breakdown = new Map<number, { rate: number; amount: number; invoiceCount: number }>();

  for (const invoice of monthlyInvoices) {
    for (const item of invoice.items) {
      if (!breakdown.has(item.gstRate)) {
        breakdown.set(item.gstRate, { rate: item.gstRate, amount: 0, invoiceCount: 0 });
      }

      const row = breakdown.get(item.gstRate)!;
      row.amount += (item.total * item.gstRate) / 100;
      row.invoiceCount += 1;
    }
  }

  const gstBreakdown = [...breakdown.values()].sort((a, b) => b.rate - a.rate);

  return {
    month,
    invoices: monthlyInvoices,
    gstBreakdown,
    totalGST: gstBreakdown.reduce((sum, row) => sum + row.amount, 0),
    totalAmount: monthlyInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
    totalTaxableValue: monthlyInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount - invoice.gstAmount), 0),
  };
}
