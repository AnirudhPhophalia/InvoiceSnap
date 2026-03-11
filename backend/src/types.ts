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

export interface InvoiceItem {
  description: string;
  category?: ExpenseCategory;
  quantity: number;
  unitPrice: number;
  total: number;
  gstRate: number;
}

export interface InvoiceRecord {
  id: string;
  userId: string;
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

export interface CorrectionRecord {
  id: string;
  userId: string;
  vendorKey: string;
  field: "vendorName" | "vendorGSTIN" | "invoiceDate" | "totalAmount" | "gstAmount" | "category";
  incorrectValue: string;
  correctedValue: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  company?: string;
  passwordHash?: string;
  authProvider?: "local" | "google";
  googleId?: string;
  createdAt: string;
}

export interface Database {
  users: UserRecord[];
  invoices: InvoiceRecord[];
  corrections: CorrectionRecord[];
}

export interface AuthResponseUser {
  id: string;
  email: string;
  name: string;
  company?: string;
  createdAt: string;
}
