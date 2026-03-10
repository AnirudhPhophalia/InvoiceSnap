'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { Card } from '@/components/ui/card'
import {
  getAnalyticsStatusDistribution,
  getAnalyticsSummary,
  getAnalyticsTopVendors,
  getAnalyticsTrends,
} from '@/lib/api'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; amount: number; gst: number; count: number }>>([])
  const [statusDistribution, setStatusDistribution] = useState<Array<{ name: string; value: number }>>([])
  const [topVendors, setTopVendors] = useState<Array<{ name: string; amount: number }>>([])
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
        const [summary, trends, distribution, vendors] = await Promise.all([
          getAnalyticsSummary(),
          getAnalyticsTrends(),
          getAnalyticsStatusDistribution(),
          getAnalyticsTopVendors(),
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
            {stats.totalInvoices > 0 ? (
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
