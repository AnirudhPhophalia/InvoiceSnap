import test from "node:test";
import assert from "node:assert/strict";
import { isLikelyDuplicate, normalizeConfidence, shouldFlagForReview } from "./invoice-quality.js";

test("normalizeConfidence clamps values", () => {
  assert.equal(normalizeConfidence(1.2), 1);
  assert.equal(normalizeConfidence(-2), 0);
  assert.equal(normalizeConfidence(0.756), 0.76);
});

test("isLikelyDuplicate matches based on invoice identity", () => {
  const a = {
    vendorName: "Acme Pvt Ltd",
    vendorGSTIN: "27ABCDE1234F1Z5",
    invoiceNumber: "INV-1001",
    invoiceDate: "2026-03-01",
    totalAmount: 1180,
  };

  const b = {
    vendorName: "ACME PVT LTD",
    vendorGSTIN: "27ABCDE1234F1Z5",
    invoiceNumber: "INV-1001",
    invoiceDate: "2026-03-01",
    totalAmount: 1180,
  };

  assert.equal(isLikelyDuplicate(a, b), true);
});

test("shouldFlagForReview when confidence and required fields are weak", () => {
  assert.equal(
    shouldFlagForReview({
      vendorName: "",
      invoiceNumber: "",
      invoiceDate: "",
      totalAmount: 0,
      items: [],
      extractionConfidence: 0.92,
    }),
    true,
  );

  assert.equal(
    shouldFlagForReview({
      vendorName: "Acme Pvt Ltd",
      invoiceNumber: "INV-1001",
      invoiceDate: "2026-03-01",
      totalAmount: 1180,
      items: [{ description: "Hosting", quantity: 1, unitPrice: 1000, total: 1000, gstRate: 18 }],
      extractionConfidence: 0.91,
    }),
    false,
  );
});
