'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  gstRate: number
}

export interface Invoice {
  id: string
  fileName: string
  vendorName: string
  vendorGSTIN: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  gstAmount: number
  items: InvoiceItem[]
  notes: string
  uploadedAt: string
  status: 'draft' | 'confirmed' | 'paid'
}

interface InvoiceContextType {
  invoices: Invoice[]
  addInvoice: (invoice: Omit<Invoice, 'id' | 'uploadedAt'>) => void
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  getInvoiceById: (id: string) => Invoice | undefined
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined)

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])

  // Load invoices from localStorage on mount
  useEffect(() => {
    const storedInvoices = localStorage.getItem('invoice_snap_invoices')
    if (storedInvoices) {
      try {
        setInvoices(JSON.parse(storedInvoices))
      } catch {
        console.error('Failed to parse stored invoices')
      }
    }
  }, [])

  // Save invoices to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('invoice_snap_invoices', JSON.stringify(invoices))
  }, [invoices])

  const addInvoice = (invoice: Omit<Invoice, 'id' | 'uploadedAt'>) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: Math.random().toString(36).substr(2, 9),
      uploadedAt: new Date().toISOString(),
    }
    setInvoices((prev) => [newInvoice, ...prev])
  }

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === id ? { ...invoice, ...updates } : invoice
      )
    )
  }

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id))
  }

  const getInvoiceById = (id: string) => {
    return invoices.find((invoice) => invoice.id === id)
  }

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        getInvoiceById,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  )
}

export function useInvoices() {
  const context = useContext(InvoiceContext)
  if (context === undefined) {
    throw new Error('useInvoices must be used within an InvoiceProvider')
  }
  return context
}
