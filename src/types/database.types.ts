export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'cashier'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: UserRole
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string
          role?: UserRole
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: UserRole
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          category_id: string | null
          barcode: string | null
          purchase_price: number
          sale_price: number
          quantity: number
          min_quantity_alert: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category_id?: string | null
          barcode?: string | null
          purchase_price?: number
          sale_price?: number
          quantity?: number
          min_quantity_alert?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category_id?: string | null
          barcode?: string | null
          purchase_price?: number
          sale_price?: number
          quantity?: number
          min_quantity_alert?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      purchases: {
        Row: {
          id: string
          supplier_name: string | null
          total_amount: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          supplier_name?: string | null
          total_amount: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          supplier_name?: string | null
          total_amount?: number
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'purchases_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          product_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          id?: string
          purchase_id: string
          product_id: string
          quantity: number
          unit_cost: number
        }
        Update: {
          id?: string
          purchase_id?: string
          product_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: 'purchase_items_purchase_id_fkey'
            columns: ['purchase_id']
            isOneToOne: false
            referencedRelation: 'purchases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      expenses: {
        Row: {
          id: string
          title: string
          amount: number
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          amount: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          amount?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expenses_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sales: {
        Row: {
          id: string
          invoice_number: string
          total_amount: number
          discount: number
          payment_method: string | null
          cashier_id: string | null
          created_at: string
          customer_name: string | null
          amount_paid: number
          remaining_amount: number
        }
        Insert: {
          id?: string
          invoice_number: string
          total_amount: number
          discount?: number
          payment_method?: string | null
          cashier_id?: string | null
          created_at?: string
          customer_name?: string | null
          amount_paid?: number
          remaining_amount?: number
        }
        Update: {
          id?: string
          invoice_number?: string
          total_amount?: number
          discount?: number
          payment_method?: string | null
          cashier_id?: string | null
          created_at?: string
          customer_name?: string | null
          amount_paid?: number
          remaining_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sales_cashier_id_fkey'
            columns: ['cashier_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sale_items_sale_id_fkey'
            columns: ['sale_id']
            isOneToOne: false
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      settings: {
        Row: {
          id: string
          store_name: string
          phone: string | null
          address: string | null
          logo_url: string | null
          invoice_footer_note: string | null
          currency: string
        }
        Insert: {
          id?: string
          store_name?: string
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          invoice_footer_note?: string | null
          currency?: string
        }
        Update: {
          id?: string
          store_name?: string
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          invoice_footer_note?: string | null
          currency?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { uid: string }
        Returns: boolean
      }
      get_cashier_today_sales_total: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_sale: {
        Args: {
          p_invoice_number: string
          p_total_amount: number
          p_discount: number
          p_payment_method: string
          p_items: Json
          p_customer_name?: string | null
          p_amount_paid?: number | null
        }
        Returns: string
      }
      get_pos_daily_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      pay_customer_debt: {
        Args: {
          p_customer_name: string
          p_payment_amount: number
        }
        Returns: number
      }
      pay_sale_debt: {
        Args: {
          p_sale_id: string
          p_payment_amount: number
        }
        Returns: void
      }
      get_public_menu: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          category_name: string
          sale_price: number
          quantity: number
        }[]
      }
      get_public_store_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          store_name: string
          phone: string | null
          address: string | null
          logo_url: string | null
          currency: string
        }[]
      }
      get_admin_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_best_selling_products: {
        Args: {
          p_limit?: number
          p_days?: number
        }
        Returns: {
          product_id: string
          product_name: string
          category_name: string
          total_units_sold: number
          total_revenue: number
          total_profit: number
          current_quantity: number
        }[]
      }
      get_financial_report: {
        Args: {
          p_start_date?: string | null
          p_end_date?: string | null
          p_cashier_id?: string | null
        }
        Returns: Json
      }
      get_admin_users_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          full_name: string
          role: string
          is_active: boolean
          created_at: string
          last_sign_in_at: string | null
        }[]
      }
      admin_update_user: {
        Args: {
          p_user_id: string
          p_role: string
          p_is_active: boolean
          p_full_name?: string | null
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
    }
  }
}
