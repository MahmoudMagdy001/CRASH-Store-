import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Profile, AuthState, LoginCredentials } from '../types'
import type { UserRole } from '@/types/database.types'

interface AuthContextValue extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error.message)
        return null
      }

      if (data) {
        return data as Profile
      }

      // If user exists in auth.users but has no profile row yet, fallback profile
      return {
        id: userId,
        full_name: '',
        role: 'cashier',
        is_active: true,
        created_at: new Date().toISOString(),
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const prof = await fetchProfile(user.id)
    setProfile(prof)
  }, [user, fetchProfile])

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error retrieving session:', error.message)
        }

        if (!isMounted) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const prof = await fetchProfile(currentUser.id)
          if (prof && prof.is_active === false) {
            await supabase.auth.signOut()
            if (isMounted) {
              setUser(null)
              setProfile(null)
            }
          } else if (isMounted) {
            setProfile(prof)
          }
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null

        if (currentUser) {
          const prof = await fetchProfile(currentUser.id)
          if (prof && prof.is_active === false) {
            await supabase.auth.signOut()
            if (isMounted) {
              setUser(null)
              setProfile(null)
              setIsLoading(false)
            }
            return
          }
          if (isMounted) {
            setUser(currentUser)
            setProfile(prof)
            setIsLoading(false)
          }
        } else {
          if (isMounted) {
            setUser(null)
            setProfile(null)
            setIsLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async ({ email, password }: LoginCredentials) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setIsLoading(false)
        return { error }
      }

      if (data.user) {
        const prof = await fetchProfile(data.user.id)
        if (prof && prof.is_active === false) {
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          setIsLoading(false)
          return {
            error: {
              name: 'AuthApiError',
              message: 'تم تعطيل هذا الحساب من قبل الإدارة. يرجى التواصل مع مدير المتجر.',
            } as unknown as AuthError,
          }
        }
        setUser(data.user)
        setProfile(prof)
      }

      setIsLoading(false)
      return { error: null }
    } catch (err) {
      setIsLoading(false)
      return { error: err as AuthError }
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      setUser(null)
      setProfile(null)
      setIsLoading(false)
    }
  }

  const role: UserRole | null = profile?.role ?? null
  const isAdmin = role === 'admin'
  const isCashier = role === 'cashier'

  const value: AuthContextValue = {
    user,
    profile,
    role,
    isLoading,
    isAdmin,
    isCashier,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
