import React, { createContext, useContext, useCallback } from 'react'
import { useAuth, type User, type UserRole } from '../hooks/useAuth'

export type { UserRole }

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  refresh: () => Promise<boolean>
  signup: (username: string, password: string, role: UserRole) => Promise<{ ok: boolean; error?: string }>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth()

  const clearError = useCallback(() => {
    // Error state is managed by useAuth hook
  }, [])

  const value: AuthContextType = {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading,
    error: auth.error,
    login: auth.login,
    logout: auth.logout,
    refresh: auth.refresh,
    signup: auth.signup,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use authentication context
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

export type { AuthState }
