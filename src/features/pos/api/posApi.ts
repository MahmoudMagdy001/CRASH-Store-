import { supabase } from '@/lib/supabaseClient'
import type {
  PosProduct,
  SettingsRow,
  CreateSaleParams,
  SaleWithDetails,
} from '../types/pos.types'

/**
 * Fetch all active products available for POS with categories and current stock
 */
export async function getPosProducts(): Promise<PosProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories:category_id (
        id,
        name
      )
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching POS products:', error)
    throw new Error('فشل تحميل المنتجات لنقطة البيع: ' + error.message)
  }

  return (data as PosProduct[]) || []
}

/**
 * Fetch store settings (store name, phone, address, logo, footer note, currency)
 */
export async function getStoreSettings(): Promise<SettingsRow | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching store settings:', error)
    return null
  }

  return data
}

/**
 * Fetch cashier's sales total for today
 */
export async function getCashierTodayTotal(): Promise<number> {
  const { data, error } = await supabase.rpc('get_cashier_today_sales_total')

  if (error) {
    console.error('Error fetching cashier today total:', error)
    return 0
  }

  return Number(data ?? 0)
}

export interface PosDailySummary {
  total_sales: number
  total_cost: number
  total_expenses: number
  net_profit: number
  is_admin: boolean
}

/**
 * Fetch daily POS financial summary (Sales at selling price, Cost at purchase price, Expenses, and Net profit)
 */
export async function getPosDailySummary(): Promise<PosDailySummary> {
  const { data, error } = await supabase.rpc('get_pos_daily_summary')

  if (error) {
    console.error('Error fetching POS daily summary:', error)
    return {
      total_sales: 0,
      total_cost: 0,
      total_expenses: 0,
      net_profit: 0,
      is_admin: false,
    }
  }

  return (data as unknown as PosDailySummary) || {
    total_sales: 0,
    total_cost: 0,
    total_expenses: 0,
    net_profit: 0,
    is_admin: false,
  }
}

/**
 * Submit a sale atomically via the `create_sale` RPC function.
 * Automatically decreases stock and checks availability via database trigger.
 */
export async function submitSale(params: CreateSaleParams): Promise<string> {
  if (!params.items || params.items.length === 0) {
    throw new Error('سلة المبيعات فارغة، برجاء إضافة منتجات أولاً.')
  }

  const { data, error } = await supabase.rpc('create_sale', {
    p_invoice_number: params.invoice_number || '',
    p_total_amount: params.total_amount,
    p_discount: params.discount,
    p_payment_method: params.payment_method,
    p_items: params.items as unknown as import('@/types/database.types').Json,
    p_customer_name: params.customer_name?.trim() || null,
    p_amount_paid: params.amount_paid !== undefined ? params.amount_paid : null,
  })

  if (error) {
    console.error('Error executing create_sale RPC:', error)
    // Format error message to be Arabic user-friendly
    if (error.message.includes('Insufficient stock')) {
      throw new Error('كمية بعض المنتجات في السلة غير متوفرة حالياً في المخزن.')
    }
    throw new Error('فشل إتمام عملية البيع: ' + error.message)
  }

  return data as string
}

/**
 * Fetch full sale details with cashier and items for receipt preview/printing
 */
export async function getSaleById(saleId: string): Promise<SaleWithDetails> {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      cashier:profiles!sales_cashier_id_fkey (
        id,
        full_name,
        role
      ),
      sale_items (
        id,
        sale_id,
        product_id,
        quantity,
        unit_price,
        products:product_id (
          id,
          name,
          barcode
        )
      )
    `)
    .eq('id', saleId)
    .single()

  if (error) {
    console.error('Error fetching sale details:', error)
    throw new Error('تعذر تحميل تفاصيل الفاتورة: ' + error.message)
  }

  return data as unknown as SaleWithDetails
}

/**
 * Fetch list of sales (for Admin sales ledger or cashier recent sales)
 */
export async function getSalesList(limit = 1000): Promise<SaleWithDetails[]> {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      cashier:profiles!sales_cashier_id_fkey (
        id,
        full_name,
        role
      ),
      sale_items (
        id,
        sale_id,
        product_id,
        quantity,
        unit_price,
        products:product_id (
          id,
          name,
          barcode
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching sales list:', error)
    throw new Error('فشل جلب فواتير المبيعات: ' + error.message)
  }

  return (data as unknown as SaleWithDetails[]) || []
}
