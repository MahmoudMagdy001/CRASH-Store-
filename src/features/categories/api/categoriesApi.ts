import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export interface CategoryWithProductCount extends Category {
  product_count?: number
}

export const getCategories = async (): Promise<CategoryWithProductCount[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*, products(count)')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((cat) => {
    // products(count) returns an array like [{ count: 5 }]
    const rawCount = cat.products as unknown as { count: number }[]
    const count = Array.isArray(rawCount) && rawCount.length > 0 ? rawCount[0].count : 0
    return {
      id: cat.id,
      name: cat.name,
      created_at: cat.created_at,
      product_count: count,
    }
  })
}

export const createCategory = async (category: CategoryInsert): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('يوجد قسم آخر بنفس هذا الاسم بالفعل')
    }
    throw new Error(error.message)
  }

  return data
}

export const updateCategory = async ({
  id,
  name,
}: {
  id: string
  name: string
}): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('يوجد قسم آخر بنفس هذا الاسم بالفعل')
    }
    throw new Error(error.message)
  }

  return data
}

export const deleteCategory = async (id: string): Promise<void> => {
  // First check if products exist for this category
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if (countError) {
    throw new Error(countError.message)
  }

  if (count && count > 0) {
    throw new Error(`لا يمكن حذف هذا القسم لأنه يحتوي على ${count} منتج(منتجات) مرتبطة به. يرجى نقل أو حذف المنتجات أولاً.`)
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
