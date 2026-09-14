import { supabase } from '@/lib/supabaseClient'

export interface FinancialReportSummary {
  total_sales: number
  total_paid: number
  total_remaining: number
  total_discounts: number
  invoices_count: number
  cogs: number
  expenses: number
  purchases: number
  gross_profit: number
  net_profit: number
}

export interface PaymentMethodBreakdown {
  payment_method: string
  count: number
  total: number
  paid: number
  remaining: number
}

export interface CashierPerformance {
  cashier_id: string
  cashier_name: string
  role: string
  invoices_count: number
  total_sales: number
  total_paid: number
  total_remaining: number
  total_discounts: number
}

export interface CategoryBreakdown {
  category_name: string
  total_units: number
  total_revenue: number
  total_profit: number
}

export interface DailyTimelineItem {
  day: string
  invoices: number
  sales_amount: number
  paid_amount: number
}

export interface FinancialReportResponse {
  summary: FinancialReportSummary
  payment_methods: PaymentMethodBreakdown[]
  cashiers: CashierPerformance[]
  categories: CategoryBreakdown[]
  timeline: DailyTimelineItem[]
}

export interface GetFinancialReportParams {
  startDate?: string | null
  endDate?: string | null
  cashierId?: string | null
}

/**
 * Fetch detailed financial report with cashier filtering and date ranges
 */
export async function getFinancialReport(
  params: GetFinancialReportParams = {}
): Promise<FinancialReportResponse> {
  const { data, error } = await supabase.rpc('get_financial_report', {
    p_start_date: params.startDate || null,
    p_end_date: params.endDate || null,
    p_cashier_id: params.cashierId || null,
  })

  if (error) {
    console.error('Error fetching financial report:', error)
    throw new Error('فشل إنشاء التقرير المالي: ' + error.message)
  }

  return data as unknown as FinancialReportResponse
}

export interface CashierProfile {
  id: string
  full_name: string
  role: string
}

/**
 * Fetch list of all cashiers/users for the reports filter dropdown
 */
export async function getCashiersList(): Promise<CashierProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error fetching cashiers list:', error)
    return []
  }

  return (data || []) as CashierProfile[]
}
