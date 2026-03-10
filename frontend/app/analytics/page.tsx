'use client'

import { useMemo } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { useInvoices } from '@/context/invoice-context'
import { Card } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function AnalyticsPage() {
  const { invoices } = useInvoices()

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const data: Record<string, { month: string; amount: number; gst: number; count: number }> = {}

    invoices.forEach((inv) => {
      const date = new Date(inv.invoiceDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      if (!data[monthKey]) {
        data[monthKey] = { month: monthLabel, amount: 0, gst: 0, count: 0 }
      }

      data[monthKey].amount += inv.totalAmount
      data[monthKey].gst += inv.gstAmount
      data[monthKey].count += 1
    })

    return Object.values(data).slice(-12)
  }, [invoices])

  // Calculate status distribution
  const statusDistribution = useMemo(() => {
    const distribution = {
      draft: 0,
      confirmed: 0,
      paid: 0,
    }

    invoices.forEach((inv) => {
      distribution[inv.status]++
    })

    return [
      { name: 'Draft', value: distribution.draft },
      { name: 'Confirmed', value: distribution.confirmed },
      { name: 'Paid', value: distribution.paid },
    ]
  }, [invoices])

  // Calculate top vendors
  const topVendors = useMemo(() => {
    const vendorMap: Record<string, number> = {}

    invoices.forEach((inv) => {
      const vendor = inv.vendorName || 'Unknown'
      vendorMap[vendor] = (vendorMap[vendor] || 0) + inv.totalAmount
    })

    return Object.entries(vendorMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }))
  }, [invoices])

  const COLORS = ['#3b82f6', '#f59e0b', '#ef4444']

  const stats = {
    totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    totalGST: invoices.reduce((sum, inv) => sum + inv.gstAmount, 0),
    avgAmount: invoices.length > 0 ? invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / invoices.length : 0,
    avgGST: invoices.length > 0 ? invoices.reduce((sum, inv) => sum + inv.gstAmount, 0) / invoices.length : 0,
  }

  return (
    <ProtectedLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">Track your invoice trends and GST data</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Amount', value: `₹${stats.totalAmount.toFixed(0)}`, icon: '💰' },
            { label: 'Total GST', value: `₹${stats.totalGST.toFixed(0)}`, icon: '📋' },
            { label: 'Avg Invoice', value: `₹${stats.avgAmount.toFixed(0)}`, icon: '📊' },
            { label: 'Avg GST', value: `₹${stats.avgGST.toFixed(0)}`, icon: '🎯' },
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trend */}
          <Card className="lg:col-span-2 p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Trend</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    name="Invoice Amount"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gst"
                    stroke="#f59e0b"
                    name="GST Amount"
                    dot={{ fill: '#f59e0b', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </Card>

          {/* Status Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
            {invoices.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </Card>
        </div>

        {/* Top Vendors */}
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Top Vendors by Amount</h3>
          {topVendors.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topVendors}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </Card>
      </div>
    </ProtectedLayout>
  )
}
