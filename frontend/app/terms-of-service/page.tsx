import Link from 'next/link'
import { ProtectedLayout } from '@/components/protected-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TermsOfServicePage() {
  return (
    <ProtectedLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Card className="p-6 border-border/60 bg-gradient-to-r from-secondary/70 to-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Legal</p>
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">
            Guidelines for using InvoiceSnap in day-to-day invoicing and reporting workflows.
          </p>
        </Card>

        <Card className="p-6 space-y-5">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. User Responsibility</h2>
            <p className="text-sm text-muted-foreground">
              You are responsible for verifying extracted values before finalizing invoices or filing GST reports.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Service Availability</h2>
            <p className="text-sm text-muted-foreground">
              The platform is provided as-is. You should maintain backup records for audit and compliance needs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Acceptance</h2>
            <p className="text-sm text-muted-foreground">
              Continued use of the application indicates acceptance of these terms.
            </p>
          </section>

          <div className="pt-2 flex gap-3">
            <Link href="/settings">
              <Button variant="outline">Back to Settings</Button>
            </Link>
            <Link href="/privacy-policy">
              <Button>View Privacy Policy</Button>
            </Link>
          </div>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
