'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { Card } from '@/components/ui/card'
import {
  getAnalyticsMonthlyCategories,
  getAnalyticsStatusDistribution,
  getAnalyticsSummary,
  getAnalyticsTopVendors,
  getAnalyticsTrends,
  getAnalyticsVendorBrain,
} from '@/lib/api'
import Link from 'next/link'
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
  ResponsiveContainer,
} from 'recharts'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; amount: number; gst: number; count: number }>>([])
  const [statusDistribution, setStatusDistribution] = useState<Array<{ name: string; value: number }>>([])
  const [topVendors, setTopVendors] = useState<Array<{ name: string; amount: number }>>([])
  const [monthlyCategoryRows, setMonthlyCategoryRows] = useState<Array<{ month: string; categories: Array<{ category: string; amount: number }>; totalAmount: number }>>([])
  const [vendorProfiles, setVendorProfiles] = useState<Array<{
    vendorName: string
    vendorGSTIN: string
    invoiceCount: number
    averageAmount: number
    amountStdDev: number
    commonGstRates: number[]
    topCategories: Array<{ category: string; count: number }>
    lastInvoiceDate: string
  }>>([])
  const [highRiskInvoices, setHighRiskInvoices] = useState<Array<{
    id: string
    vendorName: string
    invoiceNumber: string
    invoiceDate: string
    totalAmount: number
    riskScore: number
    riskReasons: string[]
  }>>([])
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalGST: 0,
    avgAmount: 0,
    avgGST: 0,
    totalInvoices: 0,
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const [summary, trends, distribution, vendors, monthlyCategories, vendorBrain] = await Promise.all([
          getAnalyticsSummary(),
          getAnalyticsTrends(),
          getAnalyticsStatusDistribution(),
          getAnalyticsTopVendors(),
          getAnalyticsMonthlyCategories(),
          getAnalyticsVendorBrain(),
        ])

        setStats({
          totalAmount: summary.summary.totalAmount,
          totalGST: summary.summary.totalGST,
          avgAmount: summary.summary.averageAmount,
          avgGST: summary.summary.averageGST,
          totalInvoices: summary.summary.totalInvoices,
        })
        setMonthlyData(trends.trends)
        setStatusDistribution(distribution.distribution)
        setTopVendors(vendors.vendors)
        setMonthlyCategoryRows(monthlyCategories.rows)
        setVendorProfiles(vendorBrain.profiles)
        setHighRiskInvoices(vendorBrain.highRiskInvoices)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const COLORS = ['#3b82f6', '#f59e0b', '#ef4444']

  return (
    <ProtectedLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">Track your invoice trends and GST data</p>
        </div>

        {error && (
          <Card className="p-4 mb-6 border-destructive/40 bg-destructive/10 text-destructive">
            {error}
          </Card>
        )}

        {loading && (
          <Card className="p-4 mb-6 text-muted-foreground">Loading analytics...</Card>
        )}

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
            {stats.totalInvoices > 0 ? (
              <div className="flex flex-col">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="48%"
                      labelLine={false}
                      label={false}
                      outerRadius={70}
                      innerRadius={34}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, _name, props) => [`${value}`, `${props?.payload?.name || 'Status'}`]} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-2 grid grid-cols-1 gap-2">
                  {statusDistribution.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        {entry.name}
                      </span>
                      <span className="font-semibold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
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

        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Spend by Category</h3>
          {monthlyCategoryRows.length === 0 ? (
            <div className="text-muted-foreground">No category summary available yet</div>
          ) : (
            <div className="space-y-4">
              {monthlyCategoryRows.map((row) => (
                <div key={row.month} className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">{row.month}</p>
                    <p className="text-sm text-muted-foreground">Total: ₹{row.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    {row.categories.map((entry) => (
                      <div key={`${row.month}-${entry.category}`} className="flex items-center justify-between rounded bg-secondary px-3 py-2 text-sm">
                        <span>{entry.category}</span>
                        <span className="font-semibold">₹{entry.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Vendor Brain Profiles</h3>
            {vendorProfiles.length === 0 ? (
              <div className="text-muted-foreground">No vendor profiles yet</div>
            ) : (
              <div className="space-y-3">
                {vendorProfiles.map((profile) => (
                  <div key={`${profile.vendorGSTIN}-${profile.vendorName}`} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{profile.vendorName || 'Unknown Vendor'}</p>
                    <p className="text-sm text-muted-foreground">Invoices: {profile.invoiceCount} • Avg: ₹{profile.averageAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">GST patterns: {profile.commonGstRates.length > 0 ? profile.commonGstRates.map((rate) => `${rate}%`).join(', ') : 'N/A'}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Vendor Brain Anomalies</h3>
            {highRiskInvoices.length === 0 ? (
              <div className="text-muted-foreground">No high-risk anomalies detected</div>
            ) : (
              <div className="space-y-3">
                {highRiskInvoices.map((row) => (
                  <Link key={row.id} href={`/invoices/${row.id}`} className="block rounded-lg border border-border p-3 hover:bg-secondary transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{row.vendorName || 'Unknown Vendor'}</p>
                        <p className="text-sm text-muted-foreground">#{row.invoiceNumber || 'N/A'} • ₹{row.totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{row.riskReasons[0] || 'Pattern mismatch detected'}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">Risk {row.riskScore}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  )
}
