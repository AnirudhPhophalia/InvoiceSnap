import { v4 as uuid } from "uuid";
import { correctionsCollection } from "../db.js";
import type { ExpenseCategory, InvoiceRecord } from "../types.js";

type LearnableField = "vendorName" | "vendorGSTIN" | "invoiceDate" | "totalAmount" | "gstAmount" | "category";

interface ExtractionLike {
  vendorName: string;
  vendorGSTIN: string;
  invoiceDate: string;
  totalAmount: number;
  gstAmount: number;
  category: ExpenseCategory;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function vendorKey(vendorName: string, vendorGSTIN: string) {
  if (vendorGSTIN.trim()) {
    return `gstin:${normalize(vendorGSTIN)}`;
  }

  const name = normalize(vendorName);
  return `vendor:${name || "unknown"}`;
}

function toRecordValue(value: unknown) {
  if (typeof value === "number") {
    return String(Number(value.toFixed(2)));
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

export async function learnFromCorrections(
  userId: string,
  before: InvoiceRecord,
  updates: Partial<InvoiceRecord>,
): Promise<void> {
  const fields: LearnableField[] = ["vendorName", "vendorGSTIN", "invoiceDate", "totalAmount", "gstAmount", "category"];
  const collection = correctionsCollection();

  const key = vendorKey(before.vendorName, before.vendorGSTIN);
  const now = new Date().toISOString();

  for (const field of fields) {
    if (!(field in updates)) {
      continue;
    }

    const incorrectValue = toRecordValue(before[field]);
    const correctedValue = toRecordValue(updates[field]);

    if (!incorrectValue || !correctedValue || incorrectValue === correctedValue) {
      continue;
    }

    await collection.updateOne(
      { userId, vendorKey: key, field, incorrectValue },
      {
        $setOnInsert: {
          id: uuid(),
          userId,
          vendorKey: key,
          field,
          incorrectValue,
          createdAt: now,
        },
        $set: {
          correctedValue,
          updatedAt: now,
        },
        $inc: { count: 1 },
      },
      { upsert: true },
    );
  }
}

export async function applyLearnedCorrections<T extends ExtractionLike>(
  userId: string,
  data: T,
): Promise<T> {
  const key = vendorKey(data.vendorName, data.vendorGSTIN);
  const corrections = await correctionsCollection().find({ userId, vendorKey: key }).toArray();

  if (corrections.length === 0) {
    return data;
  }

  const next: ExtractionLike = { ...data };
  for (const correction of corrections) {
    const current = toRecordValue(next[correction.field as keyof ExtractionLike]);
    if (current !== correction.incorrectValue) {
      continue;
    }

    if (correction.field === "totalAmount" || correction.field === "gstAmount") {
      const numeric = Number(correction.correctedValue);
      if (!Number.isNaN(numeric)) {
        next[correction.field] = numeric;
      }
      continue;
    }

    if (correction.field === "category") {
      next.category = correction.correctedValue as ExpenseCategory;
      continue;
    }

    (next as unknown as Record<string, unknown>)[correction.field] = correction.correctedValue;
  }

  return next as T;
}
