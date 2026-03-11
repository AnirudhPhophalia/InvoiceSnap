import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const DATE_PATTERNS = [
  /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g,
  /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
  /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b/g,
  /\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/g,
];

const GSTIN_PATTERN = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z][A-Z0-9]\b/i;

function normalizeWhitespace(input: string) {
  return input
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanupVendorName(value: string) {
  return value
    .replace(/^M\/?S\.?\s+/i, "")
    .replace(/^(Bill To|Sold By|Supplier|Vendor)\s*[:.-]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseAmount(raw: string) {
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) {
    return undefined;
  }

  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number(cleaned.replace(/,/g, ""));
  }

  if (cleaned.includes(",")) {
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount > 1) {
      return Number(cleaned.replace(/,/g, ""));
    }

    const [left, right] = cleaned.split(",");
    if ((right || "").length === 2) {
      return Number(`${left}.${right}`);
    }

    return Number(cleaned.replace(/,/g, ""));
  }

  return Number(cleaned);
}

function formatIsoDate(raw: string) {
  const trimmed = raw.replace(/,/g, "").trim();
  const numericDateMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (numericDateMatch) {
    let [, day, month, year] = numericDateMatch;
    if (year.length === 2) {
      year = `20${year}`;
    }

    const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? "" : normalized;
  }

  const directDate = new Date(trimmed);
  if (!Number.isNaN(directDate.getTime())) {
    const year = directDate.getUTCFullYear();
    const month = String(directDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(directDate.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parts = trimmed.split(/[/-]/).map((part) => part.trim());
  if (parts.length !== 3) {
    return "";
  }

  let year = "";
  let month = "";
  let day = "";

  if (parts[0].length === 4) {
    [year, month, day] = parts;
  } else {
    [day, month, year] = parts;
  }

  if (year.length === 2) {
    year = `20${year}`;
  }

  const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? "" : normalized;
}

function findFirstDate(text: string, labels?: string[], requireLabelMatch = false) {
  if (labels?.length) {
    const line = text
      .split("\n")
      .find((entry) => labels.some((label) => entry.toLowerCase().includes(label)));

    if (line) {
      for (const pattern of DATE_PATTERNS) {
        const match = line.match(pattern);
        if (match?.[0]) {
          return formatIsoDate(match[0]);
        }
      }
    }

    if (requireLabelMatch) {
      return "";
    }
  }

  for (const pattern of DATE_PATTERNS) {
    const match = pattern.exec(text);
    pattern.lastIndex = 0;
    if (match?.[1]) {
      return formatIsoDate(match[1]);
    }
  }

  return "";
}

function collectAmountsFromLine(line: string) {
  const matches = line.match(/(?:Rs\.?|INR|₹)?\s*-?\d[\d,]*(?:\.\d{1,2})?/gi) || [];
  return matches
    .map((entry) => parseAmount(entry))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function findAmountByLabels(lines: string[], labels: string[]) {
  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (!labels.some((label) => normalized.includes(label))) {
      continue;
    }

    const amounts = collectAmountsFromLine(line);
    if (amounts.length > 0) {
      return Math.max(...amounts);
    }
  }

  return undefined;
}

function sumAmountsByLabels(lines: string[], labels: string[]) {
  const matchedAmounts = lines
    .filter((line) => labels.some((label) => line.toLowerCase().includes(label)))
    .flatMap((line) => collectAmountsFromLine(line));

  if (matchedAmounts.length === 0) {
    return undefined;
  }

  return Number(matchedAmounts.reduce((sum, value) => sum + value, 0).toFixed(2));
}

function extractVendorName(lines: string[]) {
  const explicitLine = lines.find((line) =>
    /^(vendor|supplier|sold by|bill from|from)\s*[:.-]?/i.test(line),
  );
  if (explicitLine) {
    return cleanupVendorName(explicitLine.split(/[:.-]/).slice(1).join(" "));
  }

  const fallback = lines.find((line) => {
    const normalized = line.toLowerCase();
    if (normalized.length < 3 || normalized.length > 60) {
      return false;
    }

    return !(
      normalized.includes("invoice") ||
      normalized.includes("tax") ||
      normalized.includes("date") ||
      normalized.includes("gst") ||
      normalized.includes("bill") ||
      normalized.includes("ship") ||
      /\d{3,}/.test(normalized)
    );
  });

  return fallback ? cleanupVendorName(fallback) : "";
}

function extractInvoiceNumber(text: string) {
  const labeledMatch = text.match(/(?:invoice\s*(?:no|number)?|bill\s*(?:no|number)?|inv\s*(?:no|number)?)\s*[:#-]?\s*([A-Z0-9\/-]{3,})/i);
  if (labeledMatch?.[1]) {
    return labeledMatch[1].trim();
  }

  const genericMatch = text.match(/\b[A-Z]{1,5}[\/-]?[A-Z0-9]{2,}(?:[\/-][A-Z0-9]{2,})+\b/);
  return genericMatch?.[0]?.trim() || "";
}

function buildFallbackItem(totalAmount: number, gstAmount: number) {
  const taxableAmount = Number(Math.max(totalAmount - gstAmount, 0).toFixed(2));
  const gstRate = totalAmount > 0 && gstAmount > 0
    ? Number(((gstAmount / Math.max(taxableAmount, 1)) * 100).toFixed(2))
    : 0;

  return {
    description: "Extracted invoice amount",
    quantity: 1,
    unitPrice: taxableAmount || totalAmount,
    total: taxableAmount || totalAmount,
    gstRate,
  };
}

async function extractRawText(fileBuffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: fileBuffer });
    try {
      const result = await parser.getText();
      return normalizeWhitespace(result.text || "");
    } finally {
      await parser.destroy();
    }
  }

  if (SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
    const result = await Tesseract.recognize(fileBuffer, "eng");
    return normalizeWhitespace(result.data.text || "");
  }

  throw new Error("Unsupported invoice file format. Please upload PDF, PNG, JPG, JPEG, or WebP.");
}

export async function extractInvoiceFromFile(fileName: string, fileBuffer: Buffer, mimeType: string) {
  const rawText = await extractRawText(fileBuffer, mimeType);
  if (!rawText) {
    throw new Error("No readable text found in the uploaded invoice.");
  }

  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const vendorName = extractVendorName(lines);
  const vendorGSTIN = rawText.match(GSTIN_PATTERN)?.[0]?.toUpperCase() || "";
  const invoiceNumber = extractInvoiceNumber(rawText);
  const invoiceDate = findFirstDate(rawText, ["invoice date", "date"]);
  const dueDate = findFirstDate(rawText, ["due date", "payment due", "due on"], true);

  const totalAmount =
    findAmountByLabels(lines, ["grand total", "total amount", "invoice total", "amount due", "net payable"]) ??
    findAmountByLabels(lines, ["total"]) ??
    0;

  const gstAmount =
    findAmountByLabels(lines, ["total gst", "gst total", "tax amount"]) ??
    sumAmountsByLabels(lines, ["cgst", "sgst", "igst", "gst"]) ??
    0;

  return {
    fileName,
    vendorName,
    vendorGSTIN,
    invoiceNumber,
    invoiceDate,
    dueDate,
    totalAmount: Number(totalAmount.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    notes: `Extracted from uploaded invoice text. Review OCR-derived values before saving.`,
    items: [buildFallbackItem(totalAmount, gstAmount)],
  };
}
