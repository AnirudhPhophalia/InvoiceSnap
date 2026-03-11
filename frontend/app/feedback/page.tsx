import Link from 'next/link'
import { ProtectedLayout } from '@/components/protected-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function FeedbackPage() {
  return (
    <ProtectedLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Card className="p-6 border-border/60 bg-gradient-to-r from-secondary/70 to-card">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Community</p>
          <h1 className="text-3xl font-bold mb-2">Send Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Tell us what to improve next. Product feedback from your workflow helps shape future updates.
          </p>
        </Card>

        <Card className="p-6 space-y-5">
          <section>
            <h2 className="text-lg font-semibold mb-2">What To Include</h2>
            <p className="text-sm text-muted-foreground">
              Mention page name, expected behavior, actual behavior, and attach screenshots for quick triage.
            </p>
          </section>

          <section className="rounded-lg bg-secondary p-4">
            <p className="text-xs text-muted-foreground mb-1">Feedback Email</p>
            <p className="font-semibold">feedback@invoicesnap.local</p>
          </section>

          <div className="pt-2 flex gap-3">
            <Link href="mailto:feedback@invoicesnap.local?subject=InvoiceSnap%20Feedback">
              <Button>Open Email</Button>
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
