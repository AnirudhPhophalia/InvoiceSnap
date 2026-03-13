'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDateOnly } from '@/lib/utils'
import Link from 'next/link'
import { listInvoices, removeInvoice } from '@/lib/api'
import type { ExpenseCategory, Invoice } from '@/lib/types'

const CATEGORIES: Array<'all' | ExpenseCategory> = [
  'all',
  'Software',
  'Travel',
  'Office',
  'Utilities',
  'Marketing',
  'Meals',
  'Professional Services',
  'Equipment',
  'Rent',
  'Other',
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [sortBy, setSortBy] = useState<'uploadedAt' | 'invoiceDate' | 'vendorName' | 'totalAmount' | 'status'>('uploadedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'confirmed' | 'paid'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all')
  const [needsReviewFilter, setNeedsReviewFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [error, setError] = useState('')

  const handleDelete = async (id: string) => {
    setError('')
    try {
      await removeInvoice(id)
      await refreshInvoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice')
    }
  }

  const refreshInvoices = async () => {
    setLoading(true)
    try {
      const { invoices: rows, pagination } = await listInvoices({
        search: searchTerm || undefined,
        status: statusFilter,
        category: categoryFilter,
        needsReview: needsReviewFilter === 'all' ? undefined : needsReviewFilter === 'yes',
        page,
        pageSize: 12,
        sortBy,
        sortOrder,
      })
      setInvoices(rows)
      setTotalPages(pagination?.totalPages || 1)
      setTotalRows(pagination?.total || rows.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices')
      setInvoices([])
      setTotalPages(1)
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshInvoices()
  }, [page, sortBy, sortOrder, statusFilter, categoryFilter, needsReviewFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      void refreshInvoices()
    }, 250)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const filteredInvoices = useMemo(() => invoices, [invoices])

  const stats = {
    total: totalRows,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    confirmed: invoices.filter((inv) => inv.status === 'confirmed').length,
    draft: invoices.filter((inv) => inv.status === 'draft').length,
    review: invoices.filter((inv) => Boolean(inv.extractionNeedsReview)).length,
  }

  return (
    <ProtectedLayout>
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">Invoices</h1>
            <p className="text-muted-foreground">Manage and view all your uploaded invoices</p>
          </div>
          <Link href="/upload">
            <Button className="w-full sm:w-auto">Upload Invoice</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by vendor, invoice number..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'draft', 'confirmed', 'paid'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="w-full">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value as 'all' | ExpenseCategory)
                    setPage(1)
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full">
                <select
                  value={needsReviewFilter}
                  onChange={(e) => {
                    setNeedsReviewFilter(e.target.value as 'all' | 'yes' | 'no')
                    setPage(1)
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All Review States</option>
                  <option value="yes">Needs Review</option>
                  <option value="no">Reviewed</option>
                </select>
              </div>
              <div className="w-full">
                <select
                  value={`${sortBy}:${sortOrder}`}
                  onChange={(e) => {
                    const [nextSortBy, nextSortOrder] = e.target.value.split(':') as [typeof sortBy, typeof sortOrder]
                    setSortBy(nextSortBy)
                    setSortOrder(nextSortOrder)
                    setPage(1)
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="uploadedAt:desc">Newest First</option>
                  <option value="uploadedAt:asc">Oldest First</option>
                  <option value="invoiceDate:desc">Invoice Date Desc</option>
                  <option value="invoiceDate:asc">Invoice Date Asc</option>
                  <option value="vendorName:asc">Vendor A-Z</option>
                  <option value="totalAmount:desc">Amount High-Low</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Invoices List */}
        {error && (
          <Card className="p-4 mb-4 border-destructive/40 bg-destructive/10 text-destructive">
            {error}
          </Card>
        )}

        {loading ? (
          <Card className="p-12 text-center text-muted-foreground">Loading invoices...</Card>
        ) : filteredInvoices.length === 0 ? (
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link href={`/invoices/${invoice.id}`} className="block">
                      <h3 className="break-words font-semibold text-foreground transition-colors hover:text-primary">
                        {invoice.vendorName || invoice.fileName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Invoice #{invoice.invoiceNumber || 'N/A'} • {formatDateOnly(invoice.invoiceDate)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <p className="inline-block rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {(invoice.category || 'Other')}
                        </p>
                        {invoice.extractionNeedsReview && (
                          <p className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                            Needs Review
                          </p>
                        )}
                        {typeof invoice.vendorRiskScore === 'number' && invoice.vendorRiskScore >= 45 && (
                          <p className="inline-block rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                            Vendor Risk {invoice.vendorRiskScore}
                          </p>
                        )}
                      </div>
                    </Link>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:gap-4">
                    <div className="text-left sm:text-right lg:min-w-32">
                    <p className="font-semibold text-foreground">
                      ₹{invoice.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GST: ₹{invoice.gstAmount.toFixed(2)}
                    </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
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

                    <div className="flex w-full gap-2 sm:w-auto">
                      <Link href={`/invoices/${invoice.id}`} className="flex-1 sm:flex-none">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDelete(invoice.id)}
                        className="flex-1 text-destructive hover:bg-destructive/10 sm:flex-none"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1 || loading}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages || loading}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
