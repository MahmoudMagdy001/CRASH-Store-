import { supabase } from '@/lib/supabaseClient'
import type { SettingsRow } from '@/features/pos/types/pos.types'

export interface UpdateSettingsParams {
  store_name: string
  phone?: string | null
  address?: string | null
  logo_url?: string | null
  invoice_footer_note?: string | null
  currency: string
}

export interface AdminUserItem {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'cashier'
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
}

export interface AdminUpdateUserParams {
  userId: string
  role: 'admin' | 'cashier'
  isActive: boolean
  fullName?: string | null
}

/**
 * Fetch current store settings
 */
export async function getStoreSettings(): Promise<SettingsRow | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching settings:', error)
    throw new Error('فشل تحميل إعدادات المتجر: ' + error.message)
  }

  return data
}

/**
 * Update store settings (Admin only)
 */
export async function updateStoreSettings(
  id: string,
  params: UpdateSettingsParams
): Promise<SettingsRow> {
  const { data, error } = await supabase
    .from('settings')
    .update({
      store_name: params.store_name.trim(),
      phone: params.phone?.trim() || null,
      address: params.address?.trim() || null,
      logo_url: params.logo_url?.trim() || null,
      invoice_footer_note: params.invoice_footer_note?.trim() || null,
      currency: params.currency.trim() || 'EGP',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating settings:', error)
    throw new Error('فشل حفظ إعدادات المتجر: ' + error.message)
  }

  return data
}

/**
 * Fetch all registered users with their roles, emails and active status (Admin only)
 */
export async function getAdminUsersList(): Promise<AdminUserItem[]> {
  const { data, error } = await supabase.rpc('get_admin_users_list')

  if (error) {
    console.error('Error fetching users list:', error)
    throw new Error('فشل جلب قائمة المستخدمين: ' + error.message)
  }

  return (data || []) as AdminUserItem[]
}

/**
 * Update user role, active status, or full name (Admin only)
 */
export async function adminUpdateUser(
  params: AdminUpdateUserParams
): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_update_user', {
    p_user_id: params.userId,
    p_role: params.role,
    p_is_active: params.isActive,
    p_full_name: params.fullName?.trim() || null,
  })

  if (error) {
    console.error('Error updating user:', error)
    throw new Error('فشل تحديث بيانات المستخدم: ' + error.message)
  }

  return Boolean(data)
}
