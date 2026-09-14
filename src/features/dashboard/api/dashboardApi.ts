import { supabase } from '@/lib/supabaseClient'

export interface DashboardSalesMetrics {
  today: number
  week: number
  month: number
  all_time: number
  invoices_today: number
  invoices_month: number
}

export interface DashboardMetricsGroup {
  today: number
  week: number
  month: number
  all_time: number
}

export interface DashboardInventoryMetrics {
  total_products: number
  active_products: number
  low_stock_count: number
  out_of_stock_count: number
  total_stock_units: number
  total_cost_value: number
  total_retail_value: number
}

export interface AdminDashboardMetrics {
  sales: DashboardSalesMetrics
  cogs: DashboardMetricsGroup
  expenses: DashboardMetricsGroup
  purchases: DashboardMetricsGroup
  net_profit: DashboardMetricsGroup
  inventory: DashboardInventoryMetrics
  debts: {
    total_customer_debts: number
  }
}

export interface BestSellingProduct {
  product_id: string
  product_name: string
  category_name: string
  total_units_sold: number
  total_revenue: number
  total_profit: number
  current_quantity: number
}

/**
 * Fetch comprehensive real-time metrics for the admin dashboard
 */
export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_metrics')

  if (error) {
    console.error('Error fetching admin dashboard metrics:', error)
    throw new Error('فشل جلب إحصائيات لوحة التحكم: ' + error.message)
  }

  return data as unknown as AdminDashboardMetrics
}

/**
 * Fetch top selling products by volume and revenue
 */
export async function getBestSellingProducts(
  limit = 5,
  days = 30
): Promise<BestSellingProduct[]> {
  const { data, error } = await supabase.rpc('get_best_selling_products', {
    p_limit: limit,
    p_days: days,
  })

  if (error) {
    console.error('Error fetching best selling products:', error)
    throw new Error('فشل جلب المنتجات الأكثر مبيعاً: ' + error.message)
  }

  return (data || []) as BestSellingProduct[]
}

/**
 * Fetch low stock products for the warning alert list
 */
export async function getLowStockProducts(limit = 10) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      barcode,
      quantity,
      min_quantity_alert,
      sale_price,
      purchase_price,
      categories:category_id (
        id,
        name
      )
    `)
    .eq('is_active', true)
    .order('quantity', { ascending: true })

  if (error) {
    console.error('Error fetching low stock products:', error)
    return []
  }

  const lowStock = (data || []).filter(
    (p) => p.quantity <= (p.min_quantity_alert || 0)
  )

  return lowStock.slice(0, limit)
}
