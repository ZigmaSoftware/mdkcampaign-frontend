import React, { createContext, useContext, useState, useCallback } from 'react'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  username: string
  role: UserRole
}

interface AuthContextValue {
  currentUser: AuthUser | null
  login: (username: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
}

const SESSION_KEY = 'election_mdk_session'

const DEFAULT_ADMIN = { username: 'admin', password: 'admin@123', role: 'admin' as UserRole }

function getStoredSession(): AuthUser | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredSession)

  const login = useCallback((username: string, password: string) => {
    if (
      username.trim().toLowerCase() === DEFAULT_ADMIN.username &&
      password === DEFAULT_ADMIN.password
    ) {
      const session: AuthUser = { username: DEFAULT_ADMIN.username, role: DEFAULT_ADMIN.role }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      setCurrentUser(session)
      return { ok: true }
    }
    return { ok: false, error: 'Invalid username or password.' }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
