'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/upload', label: 'Upload Invoice', icon: '📤' },
  { href: '/invoices', label: 'Invoices', icon: '📄' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/gst-reports', label: 'GST Reports', icon: '📋' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-sidebar-primary to-accent rounded-lg flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm flex-shrink-0">
            IS
          </div>
          {!isCollapsed && (
            <span className="font-bold text-sidebar-foreground">InvoiceSnap</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-sidebar-border p-4 space-y-3">
        {!isCollapsed && user && (
          <div className="px-2 py-2">
            <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">Account</p>
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleLogout()}
          className="w-full"
        >
          {isCollapsed ? '🚪' : 'Sign Out'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full"
        >
          {isCollapsed ? '→' : '←'}
        </Button>
      </div>
    </aside>
  )
}
