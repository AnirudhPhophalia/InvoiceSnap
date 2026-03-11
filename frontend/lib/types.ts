export interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  category?: ExpenseCategory;
  quantity: number;
  unitPrice: number;
  total: number;
  gstRate: number;
}

export type InvoiceStatus = "draft" | "confirmed" | "paid";
export type ExpenseCategory =
  | "Software"
  | "Travel"
  | "Office"
  | "Utilities"
  | "Marketing"
  | "Meals"
  | "Professional Services"
  | "Equipment"
  | "Rent"
  | "Other";

export interface Invoice {
  id: string;
  fileName: string;
  vendorName: string;
  vendorGSTIN: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  gstAmount: number;
  currencySymbol: string;
  category: ExpenseCategory;
  items: InvoiceItem[];
  notes: string;
  uploadedAt: string;
  status: InvoiceStatus;
}

export interface InvoiceInput {
  fileName: string;
  vendorName: string;
  vendorGSTIN: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  gstAmount: number;
  currencySymbol: string;
  category: ExpenseCategory;
  items: InvoiceItem[];
  notes: string;
  status: InvoiceStatus;
}
