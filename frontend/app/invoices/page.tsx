'use client'

import { useState, useMemo } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { useInvoices } from '@/context/invoice-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function InvoicesPage() {
  const { invoices, deleteInvoice, updateInvoice } = useInvoices()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'confirmed' | 'paid'>('all')

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.fileName.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [invoices, searchTerm, statusFilter])

  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    confirmed: invoices.filter((inv) => inv.status === 'confirmed').length,
    draft: invoices.filter((inv) => inv.status === 'draft').length,
  }

  return (
    <ProtectedLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Invoices</h1>
            <p className="text-muted-foreground">Manage and view all your uploaded invoices</p>
          </div>
          <Link href="/upload">
            <Button>Upload Invoice</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Invoices', value: stats.total.toString() },
            { label: 'Total Amount', value: `₹${stats.totalAmount.toFixed(0)}` },
            { label: 'Confirmed', value: stats.confirmed.toString() },
            { label: 'Draft', value: stats.draft.toString() },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by vendor, invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'draft', 'confirmed', 'paid'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No invoices found</p>
            <Link href="/upload">
              <Button>Upload your first invoice</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="p-4 hover:bg-secondary transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Link href={`/invoices/${invoice.id}`} className="block">
                      <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                        {invoice.vendorName || invoice.fileName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Invoice #{invoice.invoiceNumber || 'N/A'} • {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </p>
                    </Link>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      ₹{invoice.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GST: ₹{invoice.gstAmount.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'confirmed'
                          ? 'bg-success/20 text-success'
                          : invoice.status === 'paid'
                          ? 'bg-info/20 text-info'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/invoices/${invoice.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteInvoice(invoice.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
