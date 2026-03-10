'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createInvoice, listInvoices, patchInvoice, removeInvoice } from '@/lib/api'
import type { Invoice, InvoiceInput } from '@/lib/types'
import { useAuth } from '@/context/auth-context'

interface InvoiceContextType {
  invoices: Invoice[]
  loading: boolean
  refreshInvoices: () => Promise<void>
  addInvoice: (invoice: InvoiceInput) => Promise<Invoice>
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<Invoice>
  deleteInvoice: (id: string) => Promise<void>
  getInvoiceById: (id: string) => Invoice | undefined
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined)

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()

  const refreshInvoices = async () => {
    try {
      const { invoices: rows } = await listInvoices()
      setInvoices(rows)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      void refreshInvoices()
      return
    }

    setInvoices([])
    setLoading(false)
  }, [isAuthenticated])

  const addInvoice = async (invoice: InvoiceInput) => {
    const { invoice: created } = await createInvoice(invoice)
    setInvoices((prev) => [created, ...prev])
    return created
  }

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const { invoice: updated } = await patchInvoice(id, updates)
    setInvoices((prev) => prev.map((invoice) => (invoice.id === id ? updated : invoice)))
    return updated
  }

  const deleteInvoice = async (id: string) => {
    await removeInvoice(id)
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id))
  }

  const getInvoiceById = (id: string) => {
    return invoices.find((invoice) => invoice.id === id)
  }

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        loading,
        refreshInvoices,
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
