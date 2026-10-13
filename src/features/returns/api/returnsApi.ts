import { supabase } from '@/lib/supabaseClient'
import type { ProcessReturnParams, ReturnWithDetails } from '../types/returns.types'

// ─── Submit a return (atomic via RPC) ────────────────────────────────────────

/**
 * Processes a partial or full return against an existing sale.
 * Restores stock, records the return, and updates the sale's return_amount.
 */
export async function processReturn(params: ProcessReturnParams): Promise<string> {
  if (!params.items || params.items.length === 0) {
    throw new Error('لم يتم تحديد أي أصناف للاسترجاع.')
  }

  const { data, error } = await supabase.rpc('process_return', {
    p_sale_id: params.sale_id,
    p_return_type: params.return_type,
    p_items: params.items as unknown as import('@/types/database.types').Json,
    p_reason: params.reason?.trim() || null,
  })

  if (error) {
    console.error('Error processing return:', error)
    // Surface Arabic-friendly messages
    if (error.message.includes('تم استرجاعها بالكامل')) {
      throw new Error('هذه الفاتورة تم استرجاعها بالكامل مسبقاً.')
    }
    if (error.message.includes('تتجاوز الكمية')) {
      throw new Error(error.message)
    }
    throw new Error('فشل إتمام عملية الاسترجاع: ' + error.message)
  }

  return data as string
}

// ─── Fetch returns list (for ReturnsPage) ────────────────────────────────────

/**
 * Fetch all returns with their items, sale header, and processor profile.
 */
export async function getReturnsList(limit = 500): Promise<ReturnWithDetails[]> {
  const { data, error } = await supabase
    .from('returns')
    .select(`
      *,
      processed_by_profile:profiles!returns_processed_by_fkey (
        id,
        full_name
      ),
      sale:sales!returns_sale_id_fkey (
        id,
        invoice_number,
        customer_name,
        total_amount
      ),
      return_items (
        id,
        return_id,
        sale_item_id,
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
    console.error('Error fetching returns list:', error)
    throw new Error('فشل جلب سجل المرتجعات: ' + error.message)
  }

  return (data as unknown as ReturnWithDetails[]) || []
}

// ─── Fetch returns for a specific sale ────────────────────────────────────────

/**
 * Fetch all return transactions for a specific sale_id.
 * Used to compute already-returned quantities per sale_item.
 */
export async function getReturnsBySaleId(saleId: string): Promise<ReturnWithDetails[]> {
  const { data, error } = await supabase
    .from('returns')
    .select(`
      *,
      return_items (
        id,
        sale_item_id,
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
    .eq('sale_id', saleId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching returns for sale:', error)
    throw new Error('فشل جلب مرتجعات الفاتورة: ' + error.message)
  }

  return (data as unknown as ReturnWithDetails[]) || []
}
