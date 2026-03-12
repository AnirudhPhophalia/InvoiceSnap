import type { InvoiceItem } from "../types.js";

export type ExtractionSource = "digital_pdf_text" | "gemini_ai" | "local_ocr" | "local_text_fallback";

export interface ExtractionAssessmentInput {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  items: InvoiceItem[];
  extractionConfidence?: number;
}

export interface DuplicateComparable {
  vendorName: string;
  vendorGSTIN: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

export function shouldFlagForReview(input: ExtractionAssessmentInput) {
  const confidence = normalizeConfidence(input.extractionConfidence ?? 0);
  const hasCriticalFields = Boolean(
    normalizeText(input.vendorName) &&
    normalizeText(input.invoiceNumber) &&
    normalizeText(input.invoiceDate) &&
    input.totalAmount > 0,
  );

  const hasRealItems = input.items.length > 0 && input.items.some((item) => normalizeText(item.description).length > 2);

  if (!hasCriticalFields || !hasRealItems) {
    return true;
  }

  return confidence < 0.75;
}

export function isLikelyDuplicate(a: DuplicateComparable, b: DuplicateComparable) {
  const invoiceNumberMatch = normalizeText(a.invoiceNumber) && normalizeText(a.invoiceNumber) === normalizeText(b.invoiceNumber);
  const invoiceDateMatch = normalizeText(a.invoiceDate) && normalizeText(a.invoiceDate) === normalizeText(b.invoiceDate);
  const amountMatch = Math.abs((a.totalAmount || 0) - (b.totalAmount || 0)) <= 0.01;

  const gstA = normalizeText(a.vendorGSTIN);
  const gstB = normalizeText(b.vendorGSTIN);
  const vendorByGstin = Boolean(gstA && gstB && gstA === gstB);
  const vendorByName = normalizeText(a.vendorName) && normalizeText(a.vendorName) === normalizeText(b.vendorName);

  return invoiceNumberMatch && invoiceDateMatch && amountMatch && (vendorByGstin || vendorByName);
}
