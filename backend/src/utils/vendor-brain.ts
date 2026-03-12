import type { InvoiceItem, InvoiceRecord } from "../types.js";

interface VendorKey {
  vendorName: string;
  vendorGSTIN: string;
}

interface CandidateInvoiceLike {
  vendorName: string;
  vendorGSTIN: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  category?: string;
  items: InvoiceItem[];
}

export interface VendorProfile {
  vendorName: string;
  vendorGSTIN: string;
  invoiceCount: number;
  averageAmount: number;
  amountStdDev: number;
  commonGstRates: number[];
  topCategories: Array<{ category: string; count: number }>;
  lastInvoiceDate: string;
}

export interface VendorBrainAssessment {
  riskScore: number;
  riskReasons: string[];
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function sameVendor(a: VendorKey, b: VendorKey) {
  const gstA = normalizeText(a.vendorGSTIN);
  const gstB = normalizeText(b.vendorGSTIN);
  if (gstA && gstB) {
    return gstA === gstB;
  }

  return normalizeText(a.vendorName) === normalizeText(b.vendorName);
}

function clampRisk(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) {
    return 0;
  }

  const avg = average(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getCommonGstRates(items: InvoiceItem[]) {
  const byRate = new Map<number, number>();
  for (const item of items) {
    byRate.set(item.gstRate, (byRate.get(item.gstRate) || 0) + 1);
  }

  return [...byRate.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([rate]) => rate);
}

export function assessInvoiceWithVendorBrain(
  candidate: CandidateInvoiceLike,
  historicalInvoices: InvoiceRecord[],
): VendorBrainAssessment {
  const relevant = historicalInvoices.filter((invoice) =>
    sameVendor(
      { vendorName: candidate.vendorName, vendorGSTIN: candidate.vendorGSTIN },
      { vendorName: invoice.vendorName, vendorGSTIN: invoice.vendorGSTIN },
    ),
  );

  if (relevant.length === 0) {
    return {
      riskScore: 22,
      riskReasons: ["New vendor profile: no historical invoices found for this vendor."],
    };
  }

  let score = 0;
  const reasons: string[] = [];

  const amounts = relevant.map((invoice) => invoice.totalAmount).filter((value) => Number.isFinite(value));
  const avgAmount = average(amounts);
  const stdDev = standardDeviation(amounts);

  if (avgAmount > 0) {
    const diffRatio = Math.abs(candidate.totalAmount - avgAmount) / avgAmount;
    if (stdDev > 0 && Math.abs(candidate.totalAmount - avgAmount) > stdDev * 2) {
      score += 28;
      reasons.push(`Invoice amount deviates sharply from vendor average (avg ${avgAmount.toFixed(2)}).`);
    } else if (diffRatio > 0.55) {
      score += 18;
      reasons.push("Invoice amount differs significantly from this vendor's historical pattern.");
    }
  }

  const historicalInvoiceNumbers = new Set(relevant.map((invoice) => normalizeText(invoice.invoiceNumber)));
  if (historicalInvoiceNumbers.has(normalizeText(candidate.invoiceNumber))) {
    score += 40;
    reasons.push("Invoice number already seen for this vendor (possible duplicate or reuse).");
  }

  const expectedRates = new Set(
    relevant
      .flatMap((invoice) => invoice.items.map((item) => item.gstRate))
      .filter((rate) => Number.isFinite(rate)),
  );
  const candidateRates = new Set(candidate.items.map((item) => item.gstRate).filter((rate) => Number.isFinite(rate)));
  const unseenRates = [...candidateRates].filter((rate) => !expectedRates.has(rate));
  if (expectedRates.size > 0 && unseenRates.length > 0) {
    score += 14;
    reasons.push(`Unseen GST rate(s) for this vendor: ${unseenRates.join(", ")}%`);
  }

  const historicalCategoryCounts = new Map<string, number>();
  for (const invoice of relevant) {
    const key = invoice.category || "Other";
    historicalCategoryCounts.set(key, (historicalCategoryCounts.get(key) || 0) + 1);
  }
  const dominantCategory = [...historicalCategoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (dominantCategory && candidate.category && candidate.category !== dominantCategory) {
    score += 10;
    reasons.push(`Category drift detected. Vendor is usually ${dominantCategory}.`);
  }

  const sortedDates = relevant
    .map((invoice) => new Date(invoice.invoiceDate).getTime())
    .filter((timestamp) => !Number.isNaN(timestamp))
    .sort((a, b) => b - a);
  const candidateDate = new Date(candidate.invoiceDate).getTime();
  if (sortedDates[0] && !Number.isNaN(candidateDate) && candidateDate > sortedDates[0] + 1000 * 60 * 60 * 24 * 120) {
    score += 8;
    reasons.push("Long gap since last invoice from this vendor.");
  }

  if (reasons.length === 0) {
    reasons.push("Invoice aligns with vendor historical pattern.");
  }

  return { riskScore: clampRisk(score), riskReasons: reasons.slice(0, 4) };
}

export function buildVendorBrainSnapshot(invoices: InvoiceRecord[]) {
  const byVendor = new Map<string, InvoiceRecord[]>();
  for (const invoice of invoices) {
    const key = `${normalizeText(invoice.vendorGSTIN)}::${normalizeText(invoice.vendorName)}`;
    if (!byVendor.has(key)) {
      byVendor.set(key, []);
    }
    byVendor.get(key)!.push(invoice);
  }

  const profiles: VendorProfile[] = [...byVendor.values()].map((rows) => {
    const sample = rows[0];
    const amounts = rows.map((row) => row.totalAmount);
    const categoryCounts = new Map<string, number>();
    for (const row of rows) {
      categoryCounts.set(row.category || "Other", (categoryCounts.get(row.category || "Other") || 0) + 1);
    }

    const lastInvoiceDate = rows
      .map((row) => row.invoiceDate)
      .sort((a, b) => b.localeCompare(a))[0] || "";

    return {
      vendorName: sample.vendorName,
      vendorGSTIN: sample.vendorGSTIN,
      invoiceCount: rows.length,
      averageAmount: Number(average(amounts).toFixed(2)),
      amountStdDev: Number(standardDeviation(amounts).toFixed(2)),
      commonGstRates: getCommonGstRates(rows.flatMap((row) => row.items)),
      topCategories: [...categoryCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, count]) => ({ category, count })),
      lastInvoiceDate,
    };
  });

  const highRiskInvoices = invoices
    .filter((invoice) => (invoice.vendorRiskScore || 0) >= 45)
    .sort((a, b) => (b.vendorRiskScore || 0) - (a.vendorRiskScore || 0))
    .slice(0, 12)
    .map((invoice) => ({
      id: invoice.id,
      vendorName: invoice.vendorName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      totalAmount: invoice.totalAmount,
      riskScore: invoice.vendorRiskScore || 0,
      riskReasons: invoice.vendorRiskReasons || [],
    }));

  return {
    profiles: profiles.sort((a, b) => b.invoiceCount - a.invoiceCount).slice(0, 12),
    highRiskInvoices,
  };
}
