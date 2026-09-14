import { createContext } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import type { AuthState, LoginCredentials } from '../types'

export interface AuthContextValue extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
