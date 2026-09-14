import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type Purchase = Database['public']['Tables']['purchases']['Row']
export type PurchaseItem = Database['public']['Tables']['purchase_items']['Row']

export interface PurchaseItemWithProduct extends PurchaseItem {
  product?: {
    id: string
    name: string
    barcode: string | null
    sale_price: number
    quantity: number
  } | null
}

export interface PurchaseWithDetails extends Purchase {
  creator?: {
    full_name: string | null
    role?: string | null
  } | null
  purchase_items?: PurchaseItemWithProduct[]
  items_count?: number
}

export interface CreatePurchaseInput {
  supplier_name: string
  created_at?: string
  items: {
    product_id: string
    quantity: number
    unit_cost: number
    sale_price?: number
    update_product_cost?: boolean
    update_product_prices?: boolean
  }[]
}

export interface PurchasesSummary {
  todayTotal: number
  monthTotal: number
  totalInvoicesCount: number
}

/**
 * Fetch all purchase invoices with details
 */
export const getPurchases = async (): Promise<PurchaseWithDetails[]> => {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      creator:profiles(full_name, role),
      purchase_items(
        id,
        purchase_id,
        product_id,
        quantity,
        unit_cost,
        product:products(id, name, barcode, sale_price, quantity)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((p) => ({
    ...p,
    items_count: p.purchase_items ? p.purchase_items.length : 0,
  })) as unknown as PurchaseWithDetails[]
}

/**
 * Fetch a single purchase invoice with complete items
 */
export const getPurchaseById = async (id: string): Promise<PurchaseWithDetails> => {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      creator:profiles(full_name, role),
      purchase_items(
        id,
        purchase_id,
        product_id,
        quantity,
        unit_cost,
        product:products(id, name, barcode, sale_price, quantity)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as unknown as PurchaseWithDetails
}

/**
 * Create a purchase invoice with multiple items in a clean multi-step process
 * Automatically increments stock via Supabase trigger on_purchase_item_insert
 */
export const createPurchase = async (input: CreatePurchaseInput): Promise<Purchase> => {
  if (!input.items || input.items.length === 0) {
    throw new Error('يجب إضافة منتج واحد على الأقل في فاتورة المشتريات')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('يجب تسجيل الدخول لإتمام العملية')
  }

  // Calculate total amount
  const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

  // 1. Insert header
  const purchasePayload: Database['public']['Tables']['purchases']['Insert'] = {
    supplier_name: input.supplier_name.trim() || 'مورد عام',
    total_amount: totalAmount,
    created_by: user.id,
  }

  if (input.created_at) {
    purchasePayload.created_at = input.created_at
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert(purchasePayload)
    .select()
    .single()

  if (purchaseError) {
    throw new Error(`فشل إنشاء فاتورة المشتريات: ${purchaseError.message}`)
  }

  // 2. Insert items (stock trigger fires automatically per row in DB)
  const itemsPayload = input.items.map((item) => ({
    purchase_id: purchase.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
  }))

  const { error: itemsError } = await supabase.from('purchase_items').insert(itemsPayload)

  if (itemsError) {
    // Attempt rollback of header if items insertion failed
    await supabase.from('purchases').delete().eq('id', purchase.id)
    throw new Error(`فشل إضافة بنود الفاتورة: ${itemsError.message}`)
  }

  // 3. Update products purchase_price and sale_price if requested
  const itemsToUpdate = input.items.filter(
    (item) => item.update_product_prices || item.update_product_cost
  )
  if (itemsToUpdate.length > 0) {
    await Promise.all(
      itemsToUpdate.map((item) => {
        const updatePayload: Database['public']['Tables']['products']['Update'] = {
          purchase_price: item.unit_cost,
          updated_at: new Date().toISOString(),
        }
        if (item.sale_price !== undefined && item.sale_price >= 0) {
          updatePayload.sale_price = item.sale_price
        }
        return supabase.from('products').update(updatePayload).eq('id', item.product_id)
      })
    )
  }

  return purchase
}

/**
 * Update an existing purchase invoice
 */
export const updatePurchase = async (
  id: string,
  input: CreatePurchaseInput
): Promise<Purchase> => {
  if (!input.items || input.items.length === 0) {
    throw new Error('يجب إضافة منتج واحد على الأقل في فاتورة المشتريات')
  }

  const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

  // 1. Update purchase header
  const updateHeaderPayload: Partial<Database['public']['Tables']['purchases']['Update']> = {
    supplier_name: input.supplier_name.trim() || 'مورد عام',
    total_amount: totalAmount,
  }

  if (input.created_at) {
    updateHeaderPayload.created_at = input.created_at
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .update(updateHeaderPayload)
    .eq('id', id)
    .select()
    .single()

  if (purchaseError) {
    throw new Error(`فشل تعديل الفاتورة: ${purchaseError.message}`)
  }

  // 2. Delete existing items (stock will automatically be restored by DB trigger on_purchase_item_delete)
  const { error: deleteError } = await supabase
    .from('purchase_items')
    .delete()
    .eq('purchase_id', id)

  if (deleteError) {
    throw new Error(`فشل تحديث بنود الفاتورة: ${deleteError.message}`)
  }

  // 3. Insert new items (stock will automatically be added by DB trigger on_purchase_item_insert)
  const itemsPayload = input.items.map((item) => ({
    purchase_id: id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
  }))

  const { error: insertError } = await supabase.from('purchase_items').insert(itemsPayload)

  if (insertError) {
    throw new Error(`فشل إضافة البنود المحدثة: ${insertError.message}`)
  }

  // 4. Update products purchase_price and sale_price if requested
  const itemsToUpdate = input.items.filter(
    (item) => item.update_product_prices || item.update_product_cost
  )
  if (itemsToUpdate.length > 0) {
    await Promise.all(
      itemsToUpdate.map((item) => {
        const updatePayload: Database['public']['Tables']['products']['Update'] = {
          purchase_price: item.unit_cost,
          updated_at: new Date().toISOString(),
        }
        if (item.sale_price !== undefined && item.sale_price >= 0) {
          updatePayload.sale_price = item.sale_price
        }
        return supabase.from('products').update(updatePayload).eq('id', item.product_id)
      })
    )
  }

  return purchase
}

/**
 * Delete a purchase invoice
 */
export const deletePurchase = async (id: string): Promise<void> => {
  const { error } = await supabase.from('purchases').delete().eq('id', id)

  if (error) {
    throw new Error(`فشل حذف الفاتورة: ${error.message}`)
  }
}

/**
 * Fetch purchases statistics for dashboard cards
 */
export const getPurchasesSummary = async (): Promise<PurchasesSummary> => {
  const { data, error } = await supabase
    .from('purchases')
    .select('total_amount, created_at')

  if (error) {
    throw new Error(error.message)
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  let todayTotal = 0
  let monthTotal = 0

  data?.forEach((row) => {
    const itemDate = new Date(row.created_at).getTime()
    const amount = Number(row.total_amount) || 0

    if (itemDate >= todayStart) {
      todayTotal += amount
    }
    if (itemDate >= monthStart) {
      monthTotal += amount
    }
  })

  return {
    todayTotal,
    monthTotal,
    totalInvoicesCount: data?.length || 0,
  }
}
