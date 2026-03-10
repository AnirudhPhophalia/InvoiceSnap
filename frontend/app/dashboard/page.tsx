'use client'

import { ProtectedLayout } from '@/components/protected-layout'
import { useAuth } from '@/context/auth-context'
import { useInvoices } from '@/context/invoice-context'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { user } = useAuth()
  const { invoices } = useInvoices()

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
  const totalGST = invoices.reduce((sum, inv) => sum + inv.gstAmount, 0)
  const confirmedCount = invoices.filter((inv) => inv.status === 'confirmed').length
  const draftCount = invoices.filter((inv) => inv.status === 'draft').length

  const recentInvoices = invoices.slice(0, 5)

  return (
    <ProtectedLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.name}
          </h1>
          <p className="text-muted-foreground">
            Here's your invoice and expense overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: 'Total Invoices',
              value: invoices.length.toString(),
              icon: '📄',
              color: 'from-primary/20 to-primary/5',
            },
            {
              label: 'Total Amount',
              value: `₹${totalAmount.toFixed(0)}`,
              icon: '💰',
              color: 'from-success/20 to-success/5',
            },
            {
              label: 'Total GST',
              value: `₹${totalGST.toFixed(0)}`,
              icon: '📋',
              color: 'from-warning/20 to-warning/5',
            },
            {
              label: 'Confirmed',
              value: confirmedCount.toString(),
              icon: '✓',
              color: 'from-info/20 to-info/5',
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className={`p-6 bg-gradient-to-br ${stat.color} border-0`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/upload" className="flex-1">
              <Button className="w-full" size="lg">
                Upload New Invoice
              </Button>
            </Link>
            <Link href="/invoices" className="flex-1">
              <Button variant="outline" size="lg" className="w-full">
                View All Invoices
              </Button>
            </Link>
            <Link href="/analytics" className="flex-1">
              <Button variant="outline" size="lg" className="w-full">
                View Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Invoices */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Invoices</h2>
            <Link href="/invoices" className="text-primary hover:underline text-sm">
              View all
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No invoices yet</p>
              <Link href="/upload">
                <Button>Upload your first invoice</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                  <Card className="p-4 hover:bg-secondary transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {invoice.vendorName || invoice.fileName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Invoice #{invoice.invoiceNumber || 'N/A'} • {new Date(invoice.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          ₹{invoice.totalAmount.toFixed(2)}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            invoice.status === 'confirmed'
                              ? 'bg-success/20 text-success'
                              : invoice.status === 'paid'
                              ? 'bg-info/20 text-info'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  )
}
