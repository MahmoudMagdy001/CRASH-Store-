import type { Database } from '@/types/database.types'

export type ProductRow = Database['public']['Tables']['products']['Row']
export type CategoryRow = Database['public']['Tables']['categories']['Row']
export type SettingsRow = Database['public']['Tables']['settings']['Row']
export type SaleRow = Database['public']['Tables']['sales']['Row']
export type SaleItemRow = Database['public']['Tables']['sale_items']['Row']

export interface PosProduct extends ProductRow {
  categories?: {
    id: string
    name: string
  } | null
}

export interface CartItem {
  product_id: string
  name: string
  barcode: string | null
  unit_price: number
  quantity: number
  max_stock: number
  category_name?: string
}

export interface SaleItemPayload {
  product_id: string
  quantity: number
  unit_price: number
}

export interface CreateSaleParams {
  invoice_number?: string
  subtotal: number
  discount: number
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  total_amount: number
  payment_method: 'cash' | 'card' | 'credit'
  customer_name?: string
  amount_paid?: number
  remaining_amount?: number
  items: SaleItemPayload[]
}

export interface SaleItemWithProduct extends SaleItemRow {
  products?: {
    id: string
    name: string
    barcode: string | null
  } | null
}

export interface SaleWithDetails extends SaleRow {
  cashier?: {
    id: string
    full_name: string | null
    role: string
  } | null
  sale_items: SaleItemWithProduct[]
}

export interface PosDailySummary {
  total_sales: number
  total_cost: number
  total_expenses: number
  net_profit: number
  is_admin: boolean
}
