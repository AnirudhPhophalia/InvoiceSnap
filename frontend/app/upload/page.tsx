'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { useInvoices } from '@/context/invoice-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { extractInvoice, extractInvoicesBatch } from '@/lib/api'
import type { ExpenseCategory, InvoiceInput, InvoiceItem } from '@/lib/types'

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

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState('')
  const [step, setStep] = useState<'upload' | 'extract'>('upload')
  const [extracting, setExtracting] = useState(false)
  const [batchExtracting, setBatchExtracting] = useState(false)
  const [savingBatch, setSavingBatch] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [batchResults, setBatchResults] = useState<Array<{
    fileName: string
    extracted?: Omit<InvoiceInput, 'status'>
    error?: string
    saved?: boolean
  }>>([])
  const [formData, setFormData] = useState({
    vendorName: '',
    vendorGSTIN: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    totalAmount: 0,
    gstAmount: 0,
    currencySymbol: '₹',
    category: 'Other' as ExpenseCategory,
    sourceDocumentId: '',
    extractionSource: '',
    extractionConfidence: 0,
    extractionNeedsReview: false,
    items: [] as InvoiceItem[],
    notes: '',
  })

  const { addInvoice } = useInvoices()
  const router = useRouter()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files?.[0]) {
      processFiles(Array.from(files))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.[0]) {
      processFiles(Array.from(files))
    }
  }

  const processFiles = (files: File[]) => {
    setError('')
    if (files.length === 1) {
      setBatchResults([])
      setFileName(files[0].name)
      void runExtraction(files[0])
      return
    }

    setFileName('')
    void runBatchExtraction(files)
  }

  const runExtraction = async (file: File) => {
    setExtracting(true)
    setStep('extract')

    try {
      const { extracted } = await extractInvoice(file)
      setFormData({
        vendorName: extracted.vendorName,
        vendorGSTIN: extracted.vendorGSTIN,
        invoiceNumber: extracted.invoiceNumber,
        invoiceDate: extracted.invoiceDate,
        dueDate: extracted.dueDate,
        totalAmount: extracted.totalAmount,
        gstAmount: extracted.gstAmount,
        currencySymbol: extracted.currencySymbol || '₹',
        category: extracted.category,
        sourceDocumentId: extracted.sourceDocumentId || '',
        extractionSource: extracted.extractionSource || '',
        extractionConfidence: extracted.extractionConfidence || 0,
        extractionNeedsReview: Boolean(extracted.extractionNeedsReview),
        items: extracted.items,
        notes: extracted.notes,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract invoice data')
    } finally {
      setExtracting(false)
    }
  }

  const runBatchExtraction = async (files: File[]) => {
    setBatchExtracting(true)
    setStep('extract')
    try {
      const { results } = await extractInvoicesBatch(files)
      setBatchResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract invoices')
    } finally {
      setBatchExtracting(false)
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('Amount') ? parseFloat(value) || 0 : value,
    }))
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string) => {
    setFormData((prev) => {
      const items = prev.items.map((item, itemIndex) => {
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

        const numeric = parseFloat(value) || 0
        const next = { ...item, [field]: numeric }
        next.total = Number((next.quantity * next.unitPrice).toFixed(2))
        return next
      })

      const taxable = items.reduce((sum, item) => sum + item.total, 0)
      const gstAmount = items.reduce((sum, item) => sum + (item.total * item.gstRate) / 100, 0)
      return {
        ...prev,
        items,
        gstAmount: Number(gstAmount.toFixed(2)),
        totalAmount: Number((taxable + gstAmount).toFixed(2)),
      }
    })
  }

  const handleSubmit = async () => {
    if (
      !formData.vendorName ||
      !formData.invoiceNumber ||
      !formData.invoiceDate ||
      formData.totalAmount === 0
    ) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const categoryVotes = new Map<ExpenseCategory, number>()
      for (const item of formData.items) {
        const key = (item.category || 'Other') as ExpenseCategory
        categoryVotes.set(key, (categoryVotes.get(key) || 0) + 1)
      }

      const dominantCategory = [...categoryVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other'
      const fallbackTaxable = Math.max(formData.totalAmount - formData.gstAmount, 0)
      const fallbackGstRate =
        fallbackTaxable > 0 && formData.gstAmount > 0
          ? Number(((formData.gstAmount / fallbackTaxable) * 100).toFixed(2))
          : 0

      await addInvoice({
        fileName,
        sourceDocumentId: formData.sourceDocumentId || undefined,
        vendorName: formData.vendorName,
        vendorGSTIN: formData.vendorGSTIN,
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        totalAmount: formData.totalAmount,
        gstAmount: formData.gstAmount,
        currencySymbol: formData.currencySymbol,
        category: dominantCategory,
        extractionSource: formData.extractionSource || undefined,
        extractionConfidence: formData.extractionConfidence,
        extractionNeedsReview: formData.extractionNeedsReview,
        items: formData.items.length > 0 ? formData.items : [
          {
            description: 'Invoice items',
            quantity: 1,
            unitPrice: fallbackTaxable,
            total: fallbackTaxable,
            gstRate: fallbackGstRate,
          },
        ],
        notes: formData.notes,
        status: 'draft',
      })

      router.push('/invoices')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveBatch = async () => {
    const pending = batchResults.filter((row) => row.extracted && !row.saved)
    if (pending.length === 0) {
      return
    }

    setSavingBatch(true)
    setError('')
    try {
      for (const row of pending) {
        const extracted = row.extracted!
        const fallbackTaxable = Math.max(extracted.totalAmount - extracted.gstAmount, 0)
        const fallbackGstRate =
          fallbackTaxable > 0 && extracted.gstAmount > 0
            ? Number(((extracted.gstAmount / fallbackTaxable) * 100).toFixed(2))
            : 0

        await addInvoice({
          ...extracted,
          category: extracted.category || 'Other',
          items: extracted.items.length > 0 ? extracted.items : [
            {
              description: 'Invoice items',
              quantity: 1,
              unitPrice: fallbackTaxable,
              total: fallbackTaxable,
              gstRate: fallbackGstRate,
            },
          ],
          status: 'draft',
        })
      }

      setBatchResults((prev) => prev.map((row) => row.extracted ? { ...row, saved: true } : row))
      router.push('/invoices?needsReview=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save batch invoices')
    } finally {
      setSavingBatch(false)
    }
  }

  return (
    <ProtectedLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 p-6 md:p-8 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 left-16 h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative">
            <p className="mb-2 inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs tracking-wide">AI Invoice Extraction</p>
            <h1 className="text-3xl font-bold mb-2">Upload Invoice</h1>
            <p className="text-white/85 max-w-2xl">
              Drag and drop an invoice image or PDF. We will auto-detect vendor, GST, totals, currency, and line items for quick review.
            </p>
          </div>
        </Card>

        

        {step === 'upload' ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-6 md:p-10 transition-all duration-300 cursor-pointer shadow-sm ${
              dragActive
                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                : 'border-border bg-card/70 hover:border-primary/70 hover:bg-primary/5'
            }`}
          >
            <Card className="border border-border/60 bg-background/60 backdrop-blur-sm p-8 md:p-10">
              <div className="text-center">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-4xl ring-1 ring-indigo-500/20">📸</div>
                <h2 className="text-2xl md:text-3xl font-semibold mb-2">Upload your invoice</h2>
                <p className="text-muted-foreground mb-7 max-w-2xl mx-auto">
                  Drop files here or use the button below. Extraction starts automatically after you select a file.
                </p>

                <div className="relative inline-block">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleInputChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button size="lg" className="px-8 shadow-md">
                    Choose File
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground mt-7">
                  Supported formats: PDF, PNG, JPG, JPEG, WebP (Max 10MB each). You can upload one or many files.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-3 py-1">Secure upload</span>
                  <span className="rounded-full border border-border px-3 py-1">Fast OCR</span>
                  <span className="rounded-full border border-border px-3 py-1">Editable before save</span>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI Extraction Status */}
            <Card className="border-0 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 p-4 shadow-sm md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className={extracting || batchExtracting ? 'animate-spin' : ''}>
                  {extracting || batchExtracting ? '⏳' : '✓'}
                </div>
                <div>
                  <p className="font-semibold">
                    {extracting || batchExtracting ? 'Extracting data...' : 'Data extracted successfully!'}
                  </p>
                  <p className="text-sm text-muted-foreground">{fileName || `${batchResults.length} files`}</p>
                </div>
              </div>
            </Card>

            {error && (
              <Card className="p-4 border-destructive/40 bg-destructive/10 text-destructive">
                {error}
              </Card>
            )}

            {batchResults.length > 1 ? (
              <Card className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Batch Extraction Results</h3>
                    <p className="text-sm text-muted-foreground">
                      Success: {batchResults.filter((row) => row.extracted).length} / {batchResults.length}
                    </p>
                  </div>
                  <Button className="w-full sm:w-auto" onClick={() => void handleSaveBatch()} disabled={batchExtracting || savingBatch}>
                    {savingBatch ? 'Saving...' : 'Save All As Draft'}
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {batchResults.map((row) => (
                    <div key={row.fileName} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{row.fileName}</span>
                        {row.saved && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Saved</span>}
                        {row.extracted?.extractionNeedsReview && (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">Needs Review</span>
                        )}
                        {!row.extracted && <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">Failed</span>}
                      </div>
                      {row.extracted ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.extracted.vendorName || 'Unknown Vendor'} • {row.extracted.invoiceNumber || 'No invoice number'} • {row.extracted.currencySymbol || '₹'}{row.extracted.totalAmount.toFixed(2)}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-destructive">{row.error || 'Extraction failed'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                { label: 'Vendor Name', name: 'vendorName', required: true },
                { label: 'Vendor GSTIN', name: 'vendorGSTIN' },
                { label: 'Invoice Number', name: 'invoiceNumber', required: true },
                { label: 'Invoice Date', name: 'invoiceDate', type: 'date', required: true },
                { label: 'Due Date', name: 'dueDate', type: 'date' },
                { label: `Total Amount (${formData.currencySymbol})`, name: 'totalAmount', type: 'number', required: true },
                { label: `GST Amount (${formData.currencySymbol})`, name: 'gstAmount', type: 'number' },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium mb-2">
                    {field.label} {field.required && '*'}
                  </label>
                  <Input
                    type={field.type || 'text'}
                    name={field.name}
                    value={
                      field.type === 'number'
                        ? formData[field.name as keyof typeof formData] || ''
                        : formData[field.name as keyof typeof formData]
                    }
                    onChange={handleFormChange}
                    disabled={extracting}
                  />
                </div>
              ))}

              <div className="md:col-span-2 flex flex-wrap gap-2 text-xs">
                {formData.extractionSource && (
                  <span className="rounded-full border border-border px-2 py-1">Source: {formData.extractionSource}</span>
                )}
                <span className="rounded-full border border-border px-2 py-1">
                  Confidence: {Math.round((formData.extractionConfidence || 0) * 100)}%
                </span>
                {formData.extractionNeedsReview && (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Needs Review</span>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Line Items</label>
                <div className="hidden md:grid md:grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
                  <span className="md:col-span-4">Item Name</span>
                  <span className="md:col-span-2">Category</span>
                  <span>Qty</span>
                  <span className="md:col-span-2">Unit Price ({formData.currencySymbol})</span>
                  <span>GST %</span>
                  <span className="md:col-span-2">Total Incl GST ({formData.currencySymbol})</span>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground md:hidden">Item Name</label>
                        <Input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                      </div>
                      <select
                        className="md:col-span-2 h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={item.category || 'Other'}
                        onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                      <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                      <div className="md:col-span-2 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{formData.currencySymbol}</span>
                        <Input type="number" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} />
                      </div>
                      <Input type="number" value={item.gstRate} onChange={(e) => handleItemChange(index, 'gstRate', e.target.value)} />
                      <div className="md:col-span-2 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{formData.currencySymbol}</span>
                        <Input
                          type="number"
                          value={Number((item.total + (item.total * item.gstRate) / 100).toFixed(2))}
                          readOnly
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  disabled={extracting}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-50"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setStep('upload')
                  setFileName('')
                  setFormData({
                    vendorName: '',
                    vendorGSTIN: '',
                    invoiceNumber: '',
                    invoiceDate: '',
                    dueDate: '',
                    totalAmount: 0,
                    gstAmount: 0,
                    currencySymbol: '₹',
                    category: 'Other' as ExpenseCategory,
                    sourceDocumentId: '',
                    extractionSource: '',
                    extractionConfidence: 0,
                    extractionNeedsReview: false,
                    items: [],
                    notes: '',
                  })
                  setBatchResults([])
                }}
              >
                Upload Different File
              </Button>
              {batchResults.length <= 1 && (
              <Button onClick={() => void handleSubmit()} disabled={extracting || submitting} className="w-full sm:ml-auto sm:w-auto">
                {submitting ? 'Saving...' : 'Save Invoice'}
              </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
