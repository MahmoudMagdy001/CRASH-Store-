import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export interface ProductWithCategory extends Product {
  category?: {
    id: string
    name: string
  } | null
}

/**
 * Generates a clean, unique 10-digit numeric barcode (e.g. 200XXXXXXXXX)
 */
export const generateBarcode = (): string => {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(1000 + Math.random() * 9000).toString()
  return `200${timestamp}${random}`.slice(0, 12)
}

export const getProducts = async (): Promise<ProductWithCategory[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name)
    `)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as unknown as ProductWithCategory[]
}

export const createProduct = async (
  product: Omit<ProductInsert, 'barcode'> & { barcode?: string | null }
): Promise<Product> => {
  let finalBarcode = product.barcode?.trim() || null

  // If no barcode provided, generate one automatically
  if (!finalBarcode) {
    finalBarcode = generateBarcode()
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...product,
      barcode: finalBarcode,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505' && error.message.includes('barcode')) {
      throw new Error('رمز الباركود مسجل مسبقاً لمنتج آخر')
    }
    throw new Error(error.message)
  }

  return data
}

export const updateProduct = async ({
  id,
  ...product
}: {
  id: string
} & ProductUpdate): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .update({
      ...product,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505' && error.message.includes('barcode')) {
      throw new Error('رمز الباركود مسجل مسبقاً لمنتج آخر')
    }
    throw new Error(error.message)
  }

  return data
}

export const deleteProduct = async (id: string): Promise<void> => {
  // Check if product has sales records
  const { count, error: countError } = await supabase
    .from('sale_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)

  if (countError) {
    throw new Error(countError.message)
  }

  if (count && count > 0) {
    throw new Error(
      `لا يمكن حذف هذا المنتج لوجوده في ${count} عملية بيع سابقة. يمكنك إلغاء تفعيله بدلاً من حذفه للحفاظ على سجلات الفواتير.`
    )
  }

  const { error } = await supabase.from('products').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      throw new Error('لا يمكن حذف هذا المنتج لارتباطه بفواتير مشتريات أو مبيعات سابقة. يمكنك إلغاء تفعيله.')
    }
    throw new Error(error.message)
  }
}
