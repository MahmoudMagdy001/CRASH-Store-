import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

export interface ExpenseWithCreator extends Expense {
  creator?: {
    full_name: string | null
    role?: string | null
  } | null
}

export interface ExpensesSummary {
  todayTotal: number
  monthTotal: number
  totalCount: number
}

/**
 * Fetch operating expenses
 */
export const getExpenses = async (): Promise<ExpenseWithCreator[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      creator:profiles(full_name, role)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as unknown as ExpenseWithCreator[]
}

/**
 * Create a new operating expense
 * Cashier or Admin can insert
 */
export const createExpense = async (input: {
  title: string
  amount: number
  notes?: string | null
  created_at?: string
}): Promise<Expense> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('يجب تسجيل الدخول لإتمام العملية')
  }

  const payload: ExpenseInsert = {
    title: input.title.trim(),
    amount: input.amount,
    notes: input.notes?.trim() || null,
    created_by: user.id,
  }

  if (input.created_at) {
    payload.created_at = input.created_at
  }

  const { data, error } = await supabase.from('expenses').insert(payload).select().single()

  if (error) {
    throw new Error(`فشل إضافة المصروف: ${error.message}`)
  }

  return data
}

/**
 * Update an existing expense (Admin only)
 */
export const updateExpense = async ({
  id,
  ...expense
}: {
  id: string
} & ExpenseUpdate): Promise<Expense> => {
  const { data, error } = await supabase
    .from('expenses')
    .update(expense)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`فشل تعديل المصروف: ${error.message}`)
  }

  return data
}

/**
 * Delete an operating expense (Admin only)
 */
export const deleteExpense = async (id: string): Promise<void> => {
  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) {
    throw new Error(`فشل حذف المصروف: ${error.message}`)
  }
}

/**
 * Fetch expenses statistics for summary cards
 */
export const getExpensesSummary = async (): Promise<ExpensesSummary> => {
  const { data, error } = await supabase.from('expenses').select('amount, created_at')

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
    const amount = Number(row.amount) || 0

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
    totalCount: data?.length || 0,
  }
}
