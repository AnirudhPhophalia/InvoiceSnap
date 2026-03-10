'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { useInvoices } from '@/context/invoice-context'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { getInvoiceById, updateInvoice } = useInvoices()
  const invoice = getInvoiceById(id as string)
  const [isEditing, setIsEditing] = useState(false)

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

  const handleStatusChange = (newStatus: 'draft' | 'confirmed' | 'paid') => {
    updateInvoice(invoice.id, { status: newStatus })
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
                  <p className="font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Due Date</p>
                  <p className="font-semibold">
                    {new Date(invoice.dueDate).toLocaleDateString()}
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
                    onClick={() => handleStatusChange(status)}
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
                <Button variant="outline" className="w-full justify-start">
                  📥 Download PDF
                </Button>
                <Button variant="outline" className="w-full justify-start">
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
