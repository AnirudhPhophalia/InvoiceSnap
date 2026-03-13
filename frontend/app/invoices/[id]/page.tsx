'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { useInvoices } from '@/context/invoice-context'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { downloadFile } from '@/lib/api'
import { formatDateOnly } from '@/lib/utils'
import type { ExpenseCategory, Invoice } from '@/lib/types'

const CATEGORIES: ExpenseCategory[] = [
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

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const { getInvoiceById, updateInvoice, loading } = useInvoices()
  const invoice = getInvoiceById(id as string)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSourcePreview, setShowSourcePreview] = useState(false)
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null)
  const [sourcePreviewMimeType, setSourcePreviewMimeType] = useState('')
  const [draft, setDraft] = useState<Invoice | null>(null)

  useEffect(() => {
    if (invoice) {
      setDraft(invoice)
    }
  }, [invoice])

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

  const handleDraftChange = (field: keyof Invoice, value: string) => {
    if (!draft) {
      return
    }

    setDraft({
      ...draft,
      [field]: field === 'totalAmount' || field === 'gstAmount' ? parseFloat(value) || 0 : value,
    })
  }

  const handleItemChange = (index: number, field: 'description' | 'category' | 'quantity' | 'unitPrice' | 'total' | 'gstRate', value: string) => {
    if (!draft) {
      return
    }

    const items = draft.items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        const taxableTotal = Number((item.quantity * item.unitPrice).toFixed(2))
        return { ...item, total: taxableTotal }
      }

      if (field === 'description') {
        return { ...item, description: value }
      }

      if (field === 'category') {
        return { ...item, category: value as ExpenseCategory }
      }

      const next = {
        ...item,
        [field]: parseFloat(value) || 0,
      }
      next.total = Number((next.quantity * next.unitPrice).toFixed(2))
      return next
    })

    setDraft({ ...draft, items })
  }

  const handleSaveChanges = async () => {
    if (!draft) {
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateInvoice(invoice.id, {
        vendorName: draft.vendorName,
        vendorGSTIN: draft.vendorGSTIN,
        invoiceNumber: draft.invoiceNumber,
        invoiceDate: draft.invoiceDate,
        dueDate: draft.dueDate,
        totalAmount: draft.totalAmount,
        gstAmount: draft.gstAmount,
        items: draft.items,
        notes: draft.notes,
      })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePreview = async () => {
    if (showSourcePreview) {
      if (sourcePreviewUrl) {
        URL.revokeObjectURL(sourcePreviewUrl)
        setSourcePreviewUrl(null)
        setSourcePreviewMimeType('')
      }
      setShowSourcePreview(false)
      return
    }
    setError('')
    try {
      const response = await downloadFile(`/invoices/${invoice.id}/source`)
      if (!response.ok) throw new Error('Failed to load preview')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setSourcePreviewUrl(url)
      setSourcePreviewMimeType(blob.type)
      setShowSourcePreview(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
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

  const subtotal = Math.max(invoice.totalAmount - invoice.gstAmount, 0)
  const effectiveGstRate =
    subtotal > 0 && invoice.gstAmount > 0
      ? Number(((invoice.gstAmount / subtotal) * 100).toFixed(2))
      : 0

  return (
    <ProtectedLayout>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">Invoice Details</h1>
            <p className="break-all text-muted-foreground sm:break-normal">{invoice.fileName}</p>
          </div>
          <Link href="/invoices">
            <Button variant="outline" className="w-full sm:w-auto">Back to Invoices</Button>
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
          <Card className="p-4 lg:col-span-2 md:p-6 xl:p-8">
            {/* Invoice Header */}
            <div className="mb-8 pb-8 border-b border-border">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold md:text-2xl">{invoice.vendorName}</h2>
                  {invoice.vendorGSTIN && (
                    <p className="text-sm text-muted-foreground">GSTIN: {invoice.vendorGSTIN}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {invoice.extractionSource && (
                      <span className="rounded-full border border-border px-2 py-1">Source: {invoice.extractionSource}</span>
                    )}
                    {typeof invoice.extractionConfidence === 'number' && (
                      <span className="rounded-full border border-border px-2 py-1">
                        Confidence: {Math.round(invoice.extractionConfidence * 100)}%
                      </span>
                    )}
                    {invoice.extractionNeedsReview && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Needs Review</span>
                    )}
                    {typeof invoice.vendorRiskScore === 'number' && (
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-700">Vendor Risk: {invoice.vendorRiskScore}</span>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-bold text-primary md:text-3xl">
                    ₹{invoice.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
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

            {editing && draft && (
              <div className="mb-8 rounded-lg border border-border bg-secondary/40 p-4">
                <h3 className="mb-4 text-lg font-semibold">Edit Extracted Data</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input className="h-10 rounded-md border border-input bg-background px-3" value={draft.vendorName} onChange={(e) => handleDraftChange('vendorName', e.target.value)} />
                  <input className="h-10 rounded-md border border-input bg-background px-3" value={draft.vendorGSTIN} onChange={(e) => handleDraftChange('vendorGSTIN', e.target.value)} />
                  <input className="h-10 rounded-md border border-input bg-background px-3" value={draft.invoiceNumber} onChange={(e) => handleDraftChange('invoiceNumber', e.target.value)} />
                  <input type="date" className="h-10 rounded-md border border-input bg-background px-3" value={draft.invoiceDate} onChange={(e) => handleDraftChange('invoiceDate', e.target.value)} />
                  <input type="date" className="h-10 rounded-md border border-input bg-background px-3" value={draft.dueDate} onChange={(e) => handleDraftChange('dueDate', e.target.value)} />
                  <input type="number" className="h-10 rounded-md border border-input bg-background px-3" value={draft.totalAmount} onChange={(e) => handleDraftChange('totalAmount', e.target.value)} />
                  <input type="number" className="h-10 rounded-md border border-input bg-background px-3" value={draft.gstAmount} onChange={(e) => handleDraftChange('gstAmount', e.target.value)} />
                </div>
                <div className="space-y-3">
                  {draft.items.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background/70 p-3 md:grid-cols-12 md:items-center">
                      <div className="md:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Item Name</label>
                        <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm min-w-0" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Category</label>
                        <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm min-w-0" value={item.category || 'Other'} onChange={(e) => handleItemChange(index, 'category', e.target.value)}>
                          {CATEGORIES.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Qty</label>
                        <input type="number" className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm min-w-0" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Unit Price (₹)</label>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="shrink-0 text-sm text-muted-foreground">₹</span>
                          <input type="number" className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm min-w-0" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">GST%</label>
                        <input type="number" className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm min-w-0" value={item.gstRate} onChange={(e) => handleItemChange(index, 'gstRate', e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Total Incl GST (₹)</label>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="shrink-0 text-sm text-muted-foreground">₹</span>
                          <input type="number" readOnly className="h-10 w-full rounded-md border border-input bg-muted/40 px-2 text-sm min-w-0" value={Number((item.total + (item.total * item.gstRate) / 100).toFixed(2))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <textarea
                  className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2"
                  rows={3}
                  value={draft.notes}
                  onChange={(e) => handleDraftChange('notes', e.target.value)}
                />
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => void handleSaveChanges()} disabled={saving} className="w-full sm:w-auto">{saving ? 'Saving...' : 'Save Changes'}</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={saving} className="w-full sm:w-auto">Cancel</Button>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Items</h3>
              <div className="space-y-3">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-secondary rounded-lg">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <p className="font-medium">{item.description}</p>
                      <p className="font-semibold sm:text-right">₹{item.total.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:justify-between">
                      <span>{item.quantity} × ₹{item.unitPrice.toFixed(2)}</span>
                      <span>{item.category || 'Other'} • GST: {item.gstRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-8 p-4 bg-secondary rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST ({effectiveGstRate.toFixed(2)}%)</span>
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

            {invoice.vendorRiskReasons && invoice.vendorRiskReasons.length > 0 && (
              <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-800 mb-2">Vendor Brain Reasons</p>
                <ul className="space-y-1 text-sm text-orange-700">
                  {invoice.vendorRiskReasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>• {reason}</li>
                  ))}
                </ul>
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
              <Button variant="outline" className="mt-4 w-full" onClick={() => setEditing((prev) => !prev)}>
                {editing ? 'Close Edit Mode' : 'Edit Extracted Data'}
              </Button>
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

            {invoice.sourceDocumentId && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Source Document</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => void handleTogglePreview()}>
                    {showSourcePreview ? 'Hide Preview' : 'Preview Original'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void handleDownload(`/invoices/${invoice.id}/source`, invoice.fileName)}
                  >
                    Download Original
                  </Button>
                </div>
                {showSourcePreview && sourcePreviewUrl && (
                  sourcePreviewMimeType.startsWith('image/')
                    ? <img src={sourcePreviewUrl} alt="Source invoice" className="mt-4 w-full rounded-md border border-border" />
                    : <iframe
                        title="Source invoice preview"
                        src={sourcePreviewUrl}
                        className="mt-4 h-96 w-full rounded-md border border-border"
                      />
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
