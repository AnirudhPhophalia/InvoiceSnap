export type InvoiceStatus = "draft" | "confirmed" | "paid";

export interface InvoiceItem {
  description: string;
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
  items: InvoiceItem[];
  notes: string;
  uploadedAt: string;
  status: InvoiceStatus;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  company?: string;
  passwordHash: string;
  createdAt: string;
}

export interface Database {
  users: UserRecord[];
  invoices: InvoiceRecord[];
}

export interface AuthResponseUser {
  id: string;
  email: string;
  name: string;
  company?: string;
  createdAt: string;
}
