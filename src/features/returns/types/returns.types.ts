// Returns feature TypeScript types
// Matches the database schema from migration 010_add_returns.sql

// ─── Payload types (sent to the RPC) ─────────────────────────────────────────

export interface ReturnItemPayload {
  sale_item_id: string
  product_id: string
  quantity: number
  unit_price: number
}

export interface ProcessReturnParams {
  sale_id: string
  return_type: 'partial' | 'full'
  items: ReturnItemPayload[]
  reason?: string
}

// ─── Response types (returned from Supabase queries) ─────────────────────────

export interface ReturnItemDetail {
  id: string
  return_id: string
  sale_item_id: string
  product_id: string
  quantity: number
  unit_price: number
  products?: {
    id: string
    name: string
    barcode: string | null
  } | null
}

export interface ReturnWithDetails {
  id: string
  return_number: string
  sale_id: string
  return_type: 'partial' | 'full'
  total_returned: number
  reason: string | null
  created_at: string
  processed_by: string | null
  processed_by_profile?: {
    id: string
    full_name: string | null
  } | null
  sale?: {
    id: string
    invoice_number: string
    customer_name: string | null
    total_amount: number
  } | null
  return_items: ReturnItemDetail[]
}

// ─── UI state types ───────────────────────────────────────────────────────────

export interface ReturnItemState {
  sale_item_id: string
  product_id: string
  product_name: string
  barcode: string | null
  original_quantity: number    // how many were sold
  already_returned: number     // how many already returned in previous transactions
  available_to_return: number  // original_quantity - already_returned
  return_quantity: number      // user input (0 = not returning this item)
  unit_price: number
  selected: boolean
}
