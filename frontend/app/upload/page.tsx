'use client'

import { useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { useInvoices } from '@/context/invoice-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { extractInvoice } from '@/lib/api'

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState('')
  const [step, setStep] = useState<'upload' | 'extract'>('upload')
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    vendorName: '',
    vendorGSTIN: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    totalAmount: 0,
    gstAmount: 0,
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
      processFile(files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.[0]) {
      processFile(files[0])
    }
  }

  const processFile = (file: File) => {
    setError('')
    setFileName(file.name)
    void runExtraction(file)
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
        notes: extracted.notes,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract invoice data')
    } finally {
      setExtracting(false)
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('Amount') ? parseFloat(value) || 0 : value,
    }))
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
      await addInvoice({
        fileName,
        vendorName: formData.vendorName,
        vendorGSTIN: formData.vendorGSTIN,
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        totalAmount: formData.totalAmount,
        gstAmount: formData.gstAmount,
        items: [
          {
            description: 'Invoice items',
            quantity: 1,
            unitPrice: formData.totalAmount - formData.gstAmount,
            total: formData.totalAmount - formData.gstAmount,
            gstRate: 18,
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

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Upload Invoice</h1>
          <p className="text-muted-foreground">
            Upload an invoice image or PDF to extract data with AI
          </p>
        </div>

        {step === 'upload' ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`p-12 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary'
            }`}
          >
            <Card className="p-0 border-0 bg-transparent">
            <div className="text-center">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-2xl font-bold mb-2">Upload your invoice</h2>
              <p className="text-muted-foreground mb-6">
                Drag and drop your invoice image or PDF here, or click to select
              </p>

              <div className="relative inline-block">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleInputChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button size="lg" variant="outline">
                  Choose File
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Supported formats: PDF, PNG, JPG, JPEG, WebP (Max 10MB)
              </p>
            </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI Extraction Status */}
            <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-0">
              <div className="flex items-center gap-4">
                <div className={extracting ? 'animate-spin' : ''}>
                  {extracting ? '⏳' : '✓'}
                </div>
                <div>
                  <p className="font-semibold">
                    {extracting ? 'Extracting data...' : 'Data extracted successfully!'}
                  </p>
                  <p className="text-sm text-muted-foreground">{fileName}</p>
                </div>
              </div>
            </Card>

            {error && (
              <Card className="p-4 border-destructive/40 bg-destructive/10 text-destructive">
                {error}
              </Card>
            )}

            {/* Extracted Data Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Vendor Name', name: 'vendorName', required: true },
                { label: 'Vendor GSTIN', name: 'vendorGSTIN' },
                { label: 'Invoice Number', name: 'invoiceNumber', required: true },
                { label: 'Invoice Date', name: 'invoiceDate', type: 'date', required: true },
                { label: 'Due Date', name: 'dueDate', type: 'date' },
                { label: 'Total Amount', name: 'totalAmount', type: 'number', required: true },
                { label: 'GST Amount', name: 'gstAmount', type: 'number' },
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

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                variant="outline"
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
                    notes: '',
                  })
                }}
              >
                Upload Different File
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={extracting || submitting} className="ml-auto">
                {submitting ? 'Saving...' : 'Save Invoice'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
