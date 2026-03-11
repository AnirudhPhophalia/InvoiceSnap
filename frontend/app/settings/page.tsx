'use client'

import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/components/protected-layout'
import { useAuth } from '@/context/auth-context'
import { useInvoices } from '@/context/invoice-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logoutAll, updatePassword, updateSettings } from '@/lib/api'

export default function SettingsPage() {
  const { user, logout, setUser } = useAuth()
  const { invoices } = useInvoices()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: user?.company || '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      company: user?.company || '',
    })
  }, [user])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    setError('')
    setSaving(true)
    try {
      const { user: updated } = await updateSettings(formData.name, formData.company)
      setUser(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSecurityData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordUpdate = async () => {
    setError('')
    if (securityData.newPassword !== securityData.confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }

    setSaving(true)
    try {
      await updatePassword(securityData.currentPassword, securityData.newPassword)
      setSaveSuccess(true)
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleLogoutEverywhere = async () => {
    setError('')
    setSaving(true)
    try {
      await logoutAll()
      await handleLogout()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out everywhere')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ]

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
    : 'Not available'

  const draftCount = invoices.filter((invoice) => invoice.status === 'draft').length
  const paidCount = invoices.filter((invoice) => invoice.status === 'paid').length

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {error && (
          <Card className="p-4 mb-6 border-destructive/40 bg-destructive/10 text-destructive">
            {error}
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="your@email.com"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Company Name</label>
                  <Input
                    name="company"
                    value={formData.company}
                    onChange={handleFormChange}
                    placeholder="Your company"
                  />
                </div>

                {saveSuccess && (
                  <div className="p-3 rounded-lg bg-success/10 text-success text-sm">
                    ✓ Changes saved successfully
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => void handleSaveProfile()} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Account Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="text-lg font-semibold">{memberSince}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <p className="text-lg font-semibold">{user ? 'Active' : 'Inactive'}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-lg font-semibold">{invoices.length}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">Draft / Paid</p>
                  <p className="text-lg font-semibold">{draftCount} / {paidCount}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Current Password</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={securityData.currentPassword}
                    onChange={handleSecurityChange}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">New Password</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={securityData.newPassword}
                    onChange={handleSecurityChange}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Confirm Password</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={securityData.confirmPassword}
                    onChange={handleSecurityChange}
                    placeholder="••••••••"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Show password</span>
                </label>

                <Button onClick={() => void handlePasswordUpdate()} disabled={saving}>
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Login Sessions</h3>
              <p className="text-muted-foreground mb-4">
                Manage your active login sessions across devices
              </p>
              <div className="space-y-3">
                <div className="p-4 bg-secondary rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-sm text-muted-foreground">Chrome on Windows</p>
                  </div>
                  <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">
                    Active
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-destructive/20 bg-destructive/5">
              <h3 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Sign out from all devices and end your session
                  </p>
                  <Button variant="outline" onClick={() => void handleLogoutEverywhere()} className="text-destructive" disabled={saving}>
                    Sign Out Everywhere
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Billing Plan</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-lg">Free Plan</p>
                      <p className="text-sm text-muted-foreground">Current Plan</p>
                    </div>
                    <span className="text-2xl">⭐</span>
                  </div>
                  <ul className="space-y-2 text-sm mb-4">
                    <li className="flex items-center gap-2">
                      <span>✓</span> Unlimited invoices
                    </li>
                    <li className="flex items-center gap-2">
                      <span>✓</span> Basic analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <span>✓</span> GST reporting
                    </li>
                  </ul>
                </div>

                <Button variant="outline">Upgrade to Pro</Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Billing History</h3>
              <p className="text-muted-foreground text-sm mb-4">
                No billing history. You're on the free plan.
              </p>
            </Card>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">About InvoiceSnap</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Version</p>
                  <p className="font-semibold">1.0.0</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Built with</p>
                  <p className="font-semibold">Next.js, React, Tailwind CSS</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Privacy & Terms</p>
                  <div className="flex gap-4">
                    <Link href="/privacy-policy" className="text-primary hover:underline text-sm">
                      Privacy Policy
                    </Link>
                    <Link href="/terms-of-service" className="text-primary hover:underline text-sm">
                      Terms of Service
                    </Link>
                    <Link href="/support" className="text-primary hover:underline text-sm">
                      Contact Support
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-secondary">
              <h3 className="text-lg font-semibold mb-2">Feature Request?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We'd love to hear your ideas for making InvoiceSnap even better.
              </p>
              <Link href="/feedback">
                <Button variant="outline">Send Feedback</Button>
              </Link>
            </Card>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
