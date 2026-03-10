import type { Invoice, InvoiceInput, InvoiceStatus, User } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

export function setToken(token: string): void {
  void token;
}

export function clearToken(): void {
  // Auth is now managed via an HTTP-only cookie from the backend.
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});

  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Ignore JSON parse errors for non-JSON responses.
    }
    throw new Error(message);
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function signup(email: string, password: string, name: string) {
  return request<{ token: string; user: User }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function me() {
  return request<{ user: User }>("/auth/me");
}

export async function logout() {
  return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export async function logoutAll() {
  return request<{ ok: boolean }>("/auth/logout-all", { method: "POST" });
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  return request<{ ok: boolean }>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function getSettings() {
  return request<{ user: User }>("/settings");
}

export async function updateSettings(name: string, company: string) {
  return request<{ user: User }>("/settings", {
    method: "PATCH",
    body: JSON.stringify({ name, company }),
  });
}

export async function listInvoices(search?: string, status?: InvoiceStatus | "all") {
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }
  if (status) {
    params.set("status", status);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return request<{ invoices: Invoice[] }>(`/invoices${query}`);
}

export async function createInvoice(invoice: InvoiceInput) {
  return request<{ invoice: Invoice }>("/invoices", {
    method: "POST",
    body: JSON.stringify(invoice),
  });
}

export async function getInvoice(id: string) {
  return request<{ invoice: Invoice }>(`/invoices/${id}`);
}

export async function patchInvoice(id: string, updates: Partial<Invoice>) {
  return request<{ invoice: Invoice }>(`/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function removeInvoice(id: string) {
  await request<void>(`/invoices/${id}`, { method: "DELETE" });
}

export async function extractInvoice(file: File) {
  const form = new FormData();
  form.append("file", file);

  return request<{ extracted: Omit<InvoiceInput, "status"> }>("/extract", {
    method: "POST",
    body: form,
  });
}

export async function getAnalyticsSummary() {
  return request<{ summary: { totalAmount: number; totalGST: number; totalInvoices: number; averageAmount: number; averageGST: number; confirmed: number; draft: number; paid: number } }>("/analytics/summary");
}

export async function getAnalyticsTrends() {
  return request<{ trends: Array<{ month: string; amount: number; gst: number; count: number }> }>("/analytics/trends");
}

export async function getAnalyticsStatusDistribution() {
  return request<{ distribution: Array<{ name: string; value: number }> }>("/analytics/status-distribution");
}

export async function getAnalyticsTopVendors() {
  return request<{ vendors: Array<{ name: string; amount: number }> }>("/analytics/top-vendors");
}

export async function getGstReport(month: string) {
  return request<{
    month: string;
    invoices: Invoice[];
    gstBreakdown: Array<{ rate: number; amount: number; invoiceCount: number }>;
    totalGST: number;
    totalAmount: number;
    totalTaxableValue: number;
  }>(`/gst-reports/${month}`);
}

export function downloadFile(path: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
  });
}
