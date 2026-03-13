'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { downloadFile, getGstReport } from '@/lib/api'
import type { Invoice } from '@/lib/types'
import { formatDateOnly } from '@/lib/utils'

export default function GSTReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyInvoices, setMonthlyInvoices] = useState<Invoice[]>([])
  const [gstBreakdown, setGstBreakdown] = useState<Array<{ rate: number; amount: number; invoiceCount: number }>>([])
  const [totalGST, setTotalGST] = useState(0)
  const [totalTaxableValue, setTotalTaxableValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Generate month options
  const monthOptions = useMemo(() => {
    const months: string[] = []
    const today = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    }

    return months
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const report = await getGstReport(selectedMonth)
        setMonthlyInvoices(report.invoices)
        setGstBreakdown(report.gstBreakdown)
        setTotalGST(report.totalGST)
        setTotalTaxableValue(report.totalTaxableValue)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load GST report')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [selectedMonth])

  const handleExport = async (type: 'pdf' | 'excel') => {
    setError('')
    try {
      const response = await downloadFile(`/gst-reports/${selectedMonth}/export/${type}`)
      if (!response.ok) {
        throw new Error('Export failed')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gst-report-${selectedMonth}.${type === 'excel' ? 'csv' : 'pdf'}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report')
    }
  }

  const monthLabel = new Date(`${selectedMonth}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <ProtectedLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <Card className="relative mb-8 overflow-hidden border-0 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 p-6 md:p-8 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 left-20 h-36 w-36 rounded-full bg-cyan-300/25 blur-3xl" />
          <div className="relative">
            <p className="mb-2 inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs tracking-wide">Compliance Analytics</p>
            <h1 className="text-3xl font-bold mb-2">GST Reports</h1>
            <p className="text-white/85">Track your monthly GST liability, tax split, and invoice-level contribution in one place.</p>
          </div>
        </Card>

        {error && (
          <Card className="p-4 mb-6 border-destructive/40 bg-destructive/10 text-destructive">
            {error}
          </Card>
        )}

        {loading && (
          <Card className="p-4 mb-6 text-muted-foreground">Loading GST report...</Card>
        )}

        {/* Month Selector */}
        <Card className="p-5 md:p-6 mb-8 border-border/70 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {new Date(`${month}-01`).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" onClick={() => void handleExport('pdf')}>Download PDF</Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => void handleExport('excel')}>Export CSV</Button>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Period',
              value: monthLabel,
              icon: '📅',
            },
            {
              label: 'Invoices',
              value: monthlyInvoices.length.toString(),
              icon: '📄',
            },
            {
              label: 'Taxable Value',
              value: `₹${totalTaxableValue.toFixed(0)}`,
              icon: '💼',
            },
            {
              label: 'Total GST',
              value: `₹${totalGST.toFixed(2)}`,
              icon: '📋',
            },
          ].map((stat) => (
            <Card key={stat.label} className="p-5 border-border/70 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-2xl">{stat.icon}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* GST Breakdown Table */}
        <Card className="p-6 mb-8 border-border/70 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">GST Breakdown</h3>

          {monthlyInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No invoices for this period
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full bg-card">
                <thead>
                  <tr className="border-b border-border bg-secondary/70">
                    <th className="text-left py-3 px-4 font-semibold tracking-wide text-xs uppercase">GST Rate</th>
                    <th className="text-right py-3 px-4 font-semibold tracking-wide text-xs uppercase">Items Count</th>
                    <th className="text-right py-3 px-4 font-semibold tracking-wide text-xs uppercase">GST Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {gstBreakdown.map((item) => (
                    <tr key={item.rate} className="border-b border-border/70 hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-4">{item.rate}%</td>
                      <td className="text-right py-3 px-4">{item.invoiceCount}</td>
                      <td className="text-right py-3 px-4 font-semibold">
                        ₹{item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold text-lg border-t-2 border-primary/30 bg-primary/5">
                    <td className="py-3 px-4">Total</td>
                    <td className="text-right py-3 px-4">
                      {gstBreakdown.reduce((sum, item) => sum + item.invoiceCount, 0)}
                    </td>
                    <td className="text-right py-3 px-4">₹{totalGST.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Invoices in Period */}
        <Card className="p-6 border-border/70 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Invoices for {monthLabel}</h3>

          {monthlyInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No invoices for this period
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {monthlyInvoices.map((inv) => (
                <div key={inv.id} className="p-4 border border-border/70 rounded-xl hover:bg-secondary/60 transition-colors">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{inv.vendorName || inv.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        Invoice #{inv.invoiceNumber} • {formatDateOnly(inv.invoiceDate)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold">₹{inv.totalAmount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        GST: ₹{inv.gstAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Export Section */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button className="w-full sm:w-auto" onClick={() => void handleExport('pdf')}>Download GST Report (PDF)</Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => void handleExport('excel')}>Export to Excel</Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={handlePrint}>Print Report</Button>
        </div>
      </div>
    </ProtectedLayout>
  )
}
