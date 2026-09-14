import type { SaleWithDetails } from '@/features/pos/types/pos.types'

export interface CustomerSummary {
  customer_name: string
  total_sales: number
  total_paid: number
  total_remaining: number
  invoices_count: number
  last_sale_date: string
  sales: SaleWithDetails[]
}
