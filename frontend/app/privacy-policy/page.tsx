import Link from 'next/link'
import { ProtectedLayout } from '@/components/protected-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicyPage() {
  return (
    <ProtectedLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Card className="p-6 border-border/60 bg-gradient-to-r from-secondary/70 to-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Legal</p>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            How InvoiceSnap collects, processes, and protects your account and invoice data.
          </p>
        </Card>

        <Card className="p-6 space-y-5">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Data We Store</h2>
            <p className="text-sm text-muted-foreground">
              We store account profile fields and invoice metadata required for analytics, GST reporting, and exports.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Uploaded Documents</h2>
            <p className="text-sm text-muted-foreground">
              Invoices are processed to extract fields like vendor name, date, and amounts. You should review extracted fields before saving.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Data Requests</h2>
            <p className="text-sm text-muted-foreground">
              For assistance with export or deletion requests, contact support and include your registered email.
            </p>
          </section>

          <div className="pt-2 flex gap-3">
            <Link href="/settings">
              <Button variant="outline">Back to Settings</Button>
            </Link>
            <Link href="/support">
              <Button>Contact Support</Button>
            </Link>
          </div>
        </Card>
      </div>
    </ProtectedLayout>
  )
}
