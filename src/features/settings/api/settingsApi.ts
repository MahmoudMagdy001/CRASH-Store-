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

/**
 * Upload store logo file to Supabase storage bucket `store-assets`
 */
export async function uploadStoreLogo(file: File): Promise<string> {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
  if (!validTypes.includes(file.type)) {
    throw new Error('نوع الملف غير مدعوم. يرجى رفع صورة بصيغة PNG أو JPG أو WebP أو SVG.')
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('حجم الصورة كبير جداً. الحد الأقصى هو 5 ميجابايت.')
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
  const sanitizedBase = file.name
    .substring(0, file.name.lastIndexOf('.'))
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 15)
  const filePath = `logos/${Date.now()}_${sanitizedBase || 'logo'}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('store-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    throw new Error(`فشل رفع الشعار إلى التخزين: ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage
    .from('store-assets')
    .getPublicUrl(filePath)

  if (!publicUrlData?.publicUrl) {
    throw new Error('تعذر إنشاء الرابط العام للصورة.')
  }

  return publicUrlData.publicUrl
}
