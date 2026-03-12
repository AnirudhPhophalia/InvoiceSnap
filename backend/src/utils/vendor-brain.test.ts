import test from "node:test";
import assert from "node:assert/strict";
import type { InvoiceRecord } from "../types.js";
import { assessInvoiceWithVendorBrain } from "./vendor-brain.js";

function invoice(overrides: Partial<InvoiceRecord>): InvoiceRecord {
  return {
    id: "1",
    userId: "u1",
    fileName: "a.pdf",
    vendorName: "Acme Pvt Ltd",
    vendorGSTIN: "27ABCDE1234F1Z5",
    invoiceNumber: "INV-001",
    invoiceDate: "2026-02-01",
    dueDate: "",
    totalAmount: 1180,
    gstAmount: 180,
    currencySymbol: "₹",
    category: "Software",
    items: [{ description: "Subscription", quantity: 1, unitPrice: 1000, total: 1000, gstRate: 18 }],
    notes: "",
    uploadedAt: "2026-02-01T00:00:00.000Z",
    status: "draft",
    ...overrides,
  };
}

test("assessInvoiceWithVendorBrain marks duplicate invoice numbers", () => {
  const history = [invoice({ invoiceNumber: "INV-1001" })];
  const assessment = assessInvoiceWithVendorBrain(
    {
      vendorName: "Acme Pvt Ltd",
      vendorGSTIN: "27ABCDE1234F1Z5",
      invoiceNumber: "INV-1001",
      invoiceDate: "2026-03-05",
      totalAmount: 1180,
      category: "Software",
      items: [{ description: "Subscription", quantity: 1, unitPrice: 1000, total: 1000, gstRate: 18 }],
    },
    history,
  );

  assert.ok(assessment.riskScore >= 40);
  assert.ok(assessment.riskReasons.some((reason) => reason.toLowerCase().includes("duplicate") || reason.toLowerCase().includes("already seen")));
});

test("assessInvoiceWithVendorBrain keeps low risk for similar patterns", () => {
  const history = [
    invoice({ invoiceNumber: "INV-1001", totalAmount: 1180, items: [{ description: "Subscription", quantity: 1, unitPrice: 1000, total: 1000, gstRate: 18 }] }),
    invoice({ id: "2", invoiceNumber: "INV-1002", totalAmount: 1200, items: [{ description: "Subscription", quantity: 1, unitPrice: 1017, total: 1017, gstRate: 18 }] }),
  ];

  const assessment = assessInvoiceWithVendorBrain(
    {
      vendorName: "Acme Pvt Ltd",
      vendorGSTIN: "27ABCDE1234F1Z5",
      invoiceNumber: "INV-1003",
      invoiceDate: "2026-03-06",
      totalAmount: 1190,
      category: "Software",
      items: [{ description: "Subscription", quantity: 1, unitPrice: 1008, total: 1008, gstRate: 18 }],
    },
    history,
  );

  assert.ok(assessment.riskScore < 35);
});
