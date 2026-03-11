'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { useInvoices } from '@/context/invoice-context'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { downloadFile } from '@/lib/api'
import { formatDateOnly } from '@/lib/utils'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const { getInvoiceById, updateInvoice, loading } = useInvoices()
  const invoice = getInvoiceById(id as string)
  const [error, setError] = useState('')

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="p-8 text-center text-muted-foreground">Loading invoice...</div>
      </ProtectedLayout>
    )
  }

  if (!invoice) {
    return (
      <ProtectedLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Invoice not found</h1>
          <Link href="/invoices">
            <Button>Back to Invoices</Button>
          </Link>
        </div>
      </ProtectedLayout>
    )
  }

  const handleStatusChange = async (newStatus: 'draft' | 'confirmed' | 'paid') => {
    setError('')
    try {
      await updateInvoice(invoice.id, { status: newStatus })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleDownload = async (path: string, fallbackName: string) => {
    setError('')
    try {
      const response = await downloadFile(path)
      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const header = response.headers.get('Content-Disposition')
      const fileName = header?.split('filename=')[1]?.replace(/"/g, '') || fallbackName
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file')
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Invoice Details</h1>
            <p className="text-muted-foreground">{invoice.fileName}</p>
          </div>
          <Link href="/invoices">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>

        {/* Main Content */}
        {error && (
          <Card className="mb-6 p-4 border-destructive/40 bg-destructive/10 text-destructive">
            {error}
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Card */}
          <Card className="lg:col-span-2 p-8">
            {/* Invoice Header */}
            <div className="mb-8 pb-8 border-b border-border">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{invoice.vendorName}</h2>
                  {invoice.vendorGSTIN && (
                    <p className="text-sm text-muted-foreground">GSTIN: {invoice.vendorGSTIN}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    ₹{invoice.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Invoice Number</p>
                  <p className="font-semibold">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Invoice Date</p>
                  <p className="font-semibold">{formatDateOnly(invoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Due Date</p>
                  <p className="font-semibold">
                    {invoice.dueDate ? formatDateOnly(invoice.dueDate) : 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Uploaded</p>
                  <p className="font-semibold">{new Date(invoice.uploadedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Items</h3>
              <div className="space-y-3">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-secondary rounded-lg">
                    <div className="flex justify-between mb-2">
                      <p className="font-medium">{item.description}</p>
                      <p className="font-semibold">₹{item.total.toFixed(2)}</p>
                    </div>
                    <div className="text-sm text-muted-foreground flex justify-between">
                      <span>{item.quantity} × ₹{item.unitPrice.toFixed(2)}</span>
                      <span>GST: {item.gstRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-8 p-4 bg-secondary rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{(invoice.totalAmount - invoice.gstAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (18%)</span>
                <span>₹{invoice.gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span>₹{invoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="p-4 bg-info/5 border border-info/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-foreground">{invoice.notes}</p>
              </div>
            )}
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Status</h3>
              <div className="space-y-2">
                {(['draft', 'confirmed', 'paid'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={invoice.status === status ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => void handleStatusChange(status)}
                  >
                    {status === 'draft' && '📝'}
                    {status === 'confirmed' && '✓'}
                    {status === 'paid' && '💰'}
                    <span className="ml-2">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  </Button>
                ))}
              </div>
            </Card>

            {/* Export Card */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Export</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => void handleDownload(`/invoices/${invoice.id}/export/pdf`, `invoice-${invoice.invoiceNumber}.pdf`)}
                >
                  📥 Download PDF
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => void handleDownload(`/invoices/${invoice.id}/export/excel`, `invoice-${invoice.invoiceNumber}.csv`)}
                >
                  📊 Export to Excel
                </Button>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6 bg-secondary">
              <h3 className="font-semibold mb-4">Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">File Name</p>
                  <p className="font-medium">{invoice.fileName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice ID</p>
                  <p className="font-medium text-xs break-all">{invoice.id}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
