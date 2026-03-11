import type { ExpenseCategory, InvoiceItem, InvoiceRecord } from "../types.js";

export const CATEGORY_KEYWORDS: Array<{ category: ExpenseCategory; terms: string[] }> = [
  { category: "Software", terms: ["saas", "software", "license", "subscription", "cloud", "hosting", "github", "microsoft", "google workspace", "slack", "notion", "figma", "zoom", "api", "usage", "ai", "openai", "anthropic", "llm", "model", "token", "inference"] },
  { category: "Travel", terms: ["air", "flight", "hotel", "taxi", "uber", "ola", "rail", "train", "trip", "travel", "booking"] },
  { category: "Office", terms: ["stationery", "office", "printer", "paper", "chair", "desk", "furniture", "supplies"] },
  { category: "Utilities", terms: ["electricity", "internet", "broadband", "water", "utility", "recharge", "phone", "telecom"] },
  { category: "Marketing", terms: ["ads", "advertising", "meta", "facebook", "google ads", "campaign", "promotion"] },
  { category: "Meals", terms: ["restaurant", "swiggy", "zomato", "food", "meal", "dining", "cafe"] },
  { category: "Professional Services", terms: ["consulting", "legal", "ca", "accounting", "freelance", "agency", "services"] },
  { category: "Equipment", terms: ["laptop", "monitor", "keyboard", "hardware", "device", "equipment", "electronics"] },
  { category: "Rent", terms: ["rent", "lease", "cowork", "coworking", "workspace"] },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function suggestItemCategory(description: string): ExpenseCategory {
  const corpus = normalize(description);
  const winner = CATEGORY_KEYWORDS
    .map((entry) => ({
      category: entry.category,
      score: entry.terms.reduce((sum, term) => sum + (corpus.includes(term) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  return winner && winner.score > 0 ? winner.category : "Other";
}

function toSearchableText(data: {
  fileName?: string;
  vendorName?: string;
  notes?: string;
  items?: InvoiceItem[];
}) {
  const itemText = (data.items || []).map((item) => item.description).join(" ");
  return normalize([data.fileName || "", data.vendorName || "", data.notes || "", itemText].join(" "));
}

function pickByHistory(
  candidate: { vendorName?: string; vendorGSTIN?: string },
  historicalInvoices: InvoiceRecord[],
): ExpenseCategory | undefined {
  const vendorName = normalize(candidate.vendorName || "");
  const vendorGSTIN = normalize(candidate.vendorGSTIN || "");

  const relevant = historicalInvoices.filter((invoice) => {
    if (vendorGSTIN && normalize(invoice.vendorGSTIN) === vendorGSTIN) {
      return true;
    }

    return vendorName.length > 0 && normalize(invoice.vendorName) === vendorName;
  });

  if (relevant.length === 0) {
    return undefined;
  }

  const byCategory = new Map<ExpenseCategory, number>();
  for (const invoice of relevant) {
    byCategory.set(invoice.category, (byCategory.get(invoice.category) || 0) + 1);
  }

  const winner = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  return winner?.[0];
}

export function suggestExpenseCategory(
  candidate: {
    fileName?: string;
    vendorName?: string;
    vendorGSTIN?: string;
    notes?: string;
    items?: InvoiceItem[];
    category?: ExpenseCategory;
  },
  historicalInvoices: InvoiceRecord[] = [],
): ExpenseCategory {
  if (candidate.category && candidate.category !== "Other") {
    return candidate.category;
  }

  const fromHistory = pickByHistory(candidate, historicalInvoices);
  if (fromHistory) {
    return fromHistory;
  }

  const corpus = toSearchableText(candidate);
  const scored = CATEGORY_KEYWORDS.map((entry) => ({
    category: entry.category,
    score: entry.terms.reduce((sum, term) => sum + (corpus.includes(term) ? 1 : 0), 0),
  }));

  const winner = scored.sort((a, b) => b.score - a.score)[0];
  return winner && winner.score > 0 ? winner.category : "Other";
}
