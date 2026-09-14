import { supabase } from '@/lib/supabaseClient'

export interface PublicMenuItem {
  id: string
  name: string
  category_name: string
  sale_price: number
  quantity: number
}

export interface PublicStoreInfo {
  store_name: string
  phone: string | null
  address: string | null
  logo_url: string | null
  currency: string
}

/**
 * Fetches all in-stock products for the public digital menu (Name, Category, Price only)
 */
export async function getPublicMenu(): Promise<PublicMenuItem[]> {
  const { data, error } = await supabase.rpc('get_public_menu')

  if (error || !data) {
    console.error('Error fetching public menu:', error)
    return []
  }

  return (data as unknown as PublicMenuItem[]) || []
}

/**
 * Fetches public store information for the digital menu header
 */
export async function getPublicStoreInfo(): Promise<PublicStoreInfo> {
  const { data, error } = await supabase.rpc('get_public_store_info')

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return {
      store_name: 'Crash Store (كراش ستور)',
      phone: null,
      address: null,
      logo_url: null,
      currency: 'ج.م',
    }
  }

  return (data[0] as unknown as PublicStoreInfo)
}
