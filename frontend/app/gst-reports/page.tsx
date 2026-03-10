'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { downloadFile, getGstReport } from '@/lib/api'
import type { Invoice } from '@/lib/types'

export default function GSTReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )
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
      months.push(date.toISOString().slice(0, 7))
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

  return (
    <ProtectedLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">GST Reports</h1>
          <p className="text-muted-foreground">Generate and track your GST compliance</p>
        </div>

        {error && (
          <Card className="p-4 mb-6 border-destructive/40 bg-destructive/10 text-destructive">
            {error}
          </Card>
        )}

        {loading && (
          <Card className="p-4 mb-6 text-muted-foreground">Loading GST report...</Card>
        )}

        {/* Month Selector */}
        <Card className="p-6 mb-8">
          <label className="block text-sm font-medium mb-3">Select Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
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
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
            <Card key={stat.label} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* GST Breakdown Table */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">GST Breakdown</h3>

          {monthlyInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No invoices for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">GST Rate</th>
                    <th className="text-right py-3 px-4 font-semibold">Items Count</th>
                    <th className="text-right py-3 px-4 font-semibold">GST Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {gstBreakdown.map((item) => (
                    <tr key={item.rate} className="border-b border-border hover:bg-secondary transition-colors">
                      <td className="py-3 px-4">{item.rate}%</td>
                      <td className="text-right py-3 px-4">{item.invoiceCount}</td>
                      <td className="text-right py-3 px-4 font-semibold">
                        ₹{item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold text-lg border-t-2 border-border">
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
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Invoices for {monthLabel}</h3>

          {monthlyInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No invoices for this period
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {monthlyInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{inv.vendorName || inv.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        Invoice #{inv.invoiceNumber} • {new Date(inv.invoiceDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
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
        <div className="mt-8 flex gap-4">
          <Button onClick={() => void handleExport('pdf')}>Download GST Report (PDF)</Button>
          <Button variant="outline" onClick={() => void handleExport('excel')}>Export to Excel</Button>
          <Button variant="outline">Print Report</Button>
        </div>
      </div>
    </ProtectedLayout>
  )
}
