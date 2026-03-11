import Link from 'next/link'
import { ProtectedLayout } from '@/components/protected-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SupportPage() {
  return (
    <ProtectedLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Card className="p-6 border-border/60 bg-gradient-to-r from-secondary/70 to-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Help</p>
          <h1 className="text-3xl font-bold mb-2">Support</h1>
          <p className="text-sm text-muted-foreground">
            Need help with extraction, exports, or account settings? Share details and we will guide you.
          </p>
        </Card>

        <Card className="p-6 space-y-5">
          <section>
            <h2 className="text-lg font-semibold mb-2">Before You Contact Us</h2>
            <p className="text-sm text-muted-foreground">
              Include invoice number, upload format, and a screenshot of the issue so we can reproduce it quickly.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-secondary p-4">
              <p className="text-xs text-muted-foreground mb-1">Support Email</p>
              <p className="font-semibold">support@invoicesnap.local</p>
            </div>
            <div className="rounded-lg bg-secondary p-4">
              <p className="text-xs text-muted-foreground mb-1">Response SLA</p>
              <p className="font-semibold">Within 1 business day</p>
            </div>
          </section>

          <div className="pt-2 flex gap-3">
            <Link href="mailto:support@invoicesnap.local?subject=InvoiceSnap%20Support">
              <Button>Contact Support</Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline">Back to Settings</Button>
            </Link>
          </div>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
