'use client'

import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from './sidebar'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Menu } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      {isMobile ? (
        <>
          <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} direction="left">
            <DrawerContent className="p-0 w-[82vw] max-w-80 border-r border-sidebar-border">
              <Sidebar mobile onNavigate={() => setMobileNavOpen(false)} />
            </DrawerContent>
          </Drawer>
          <main className="flex-1 overflow-auto">
            <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-3 py-2 backdrop-blur md:hidden">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <span className="text-sm font-semibold">InvoiceSnap</span>
            </div>
            {children}
          </main>
        </>
      ) : (
        <>
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </>
      )}
    </div>
  )
}
