import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/context/auth-context'
import { InvoiceProvider } from '@/context/invoice-context'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'InvoiceSnap - AI Invoice Parser & Expense Tracker',
  description: 'Automatically extract invoice data with AI. Streamline your expense tracking and GST reporting.',
  generator: 'v0.app',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <InvoiceProvider>
            {children}
            <Analytics />
          </InvoiceProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
