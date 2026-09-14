import { supabase } from '@/lib/supabaseClient'
import { getSalesList } from '@/features/pos/api/posApi'
import type { CustomerSummary } from '../types/customer.types'

/**
 * Fetch and aggregate all customers who had sales recorded under their name.
 * Calculates total purchased, amount paid, and remaining balance (debts).
 */
export async function getCustomersSummaryList(): Promise<CustomerSummary[]> {
  const sales = await getSalesList(1000)

  const customersMap = new Map<string, CustomerSummary>()

  for (const sale of sales) {
    const rawName = sale.customer_name?.trim()
    if (!rawName) continue

    const nameKey = rawName.toLowerCase()

    if (!customersMap.has(nameKey)) {
      customersMap.set(nameKey, {
        customer_name: rawName,
        total_sales: 0,
        total_paid: 0,
        total_remaining: 0,
        invoices_count: 0,
        last_sale_date: sale.created_at,
        sales: [],
      })
    }

    const current = customersMap.get(nameKey)!
    current.total_sales += Number(sale.total_amount || 0)
    current.total_paid += Number(sale.amount_paid ?? sale.total_amount)
    current.total_remaining += Number(sale.remaining_amount || 0)
    current.invoices_count += 1
    current.sales.push(sale)

    // Keep the most recent date
    if (new Date(sale.created_at) > new Date(current.last_sale_date)) {
      current.last_sale_date = sale.created_at
    }
  }

  // Sort by highest remaining debt first, then by last transaction
  return Array.from(customersMap.values()).sort((a, b) => {
    if (b.total_remaining !== a.total_remaining) {
      return b.total_remaining - a.total_remaining
    }
    return new Date(b.last_sale_date).getTime() - new Date(a.last_sale_date).getTime()
  })
}

/**
 * Settle or pay a portion of a customer's total outstanding debt.
 * Automatically pays down the oldest credit invoices first (FIFO).
 */
export async function payCustomerDebt(
  customerName: string,
  amount: number
): Promise<number> {
  if (amount <= 0) throw new Error('يرجى إدخال مبلغ سداد أكبر من الصفر')

  const { data, error } = await supabase.rpc('pay_customer_debt', {
    p_customer_name: customerName.trim(),
    p_payment_amount: amount,
  })

  if (error) {
    console.error('Error paying customer debt:', error)
    throw new Error('فشل تسجيل السداد: ' + error.message)
  }

  return Number(data || 0)
}

/**
 * Pay a specific sale debt directly by invoice/sale ID.
 */
export async function paySaleDebt(
  saleId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) throw new Error('يرجى إدخال مبلغ سداد أكبر من الصفر')

  const { error } = await supabase.rpc('pay_sale_debt', {
    p_sale_id: saleId,
    p_payment_amount: amount,
  })

  if (error) {
    console.error('Error paying sale debt:', error)
    throw new Error('فشل تسجيل السداد للفاتورة: ' + error.message)
  }
}
