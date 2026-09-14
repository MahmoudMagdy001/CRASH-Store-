import type { User } from '@supabase/supabase-js'
import type { Database, UserRole } from '@/types/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']

export interface AuthState {
  user: User | null
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  isAdmin: boolean
  isCashier: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}
