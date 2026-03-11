import { formatDateOnly } from '@/lib/utils'

// Format currency in Indian format
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format date
export function formatDate(dateString: string): string {
  return formatDateOnly(dateString, 'en-IN')
}

// Format month name
export function formatMonthYear(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

// Calculate GST on amount
export function calculateGST(amount: number, gstRate: number = 18): number {
  return (amount * gstRate) / 100
}

// Calculate taxable value
export function calculateTaxableValue(totalAmount: number, gstAmount: number): number {
  return totalAmount - gstAmount
}
