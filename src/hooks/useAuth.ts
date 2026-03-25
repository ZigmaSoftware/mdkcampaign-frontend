import { useState, useCallback, useEffect } from 'react'
import apiClient, { setTokens, clearTokens, isAuthenticated } from '../utils/api'
import type { AxiosError } from 'axios'

interface User {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  role: string
  phone?: string
}

interface LoginResponse {
  access: string
  refresh: string
  user?: User
}

export type UserRole = 'admin' | 'district_head' | 'constituency_mgr' | 'booth_agent' | 'volunteer' | 'voter' | 'analyst' | 'observer'

interface UseAuthReturn {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  refresh: () => Promise<boolean>
  signup: (username: string, password: string, role: UserRole) => Promise<{ ok: boolean; error?: string }>
}

/**
 * Hook for authentication operations
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const authenticated = user !== null || isAuthenticated()

  // On mount: if tokens exist but user state is empty (e.g. after page refresh), re-fetch
  useEffect(() => {
    if (isAuthenticated() && user === null) {
      fetchUserInfo()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fetch current user info from API
   */
  const fetchUserInfo = useCallback(async (): Promise<User | null> => {
    try {
      const { data } = await apiClient.get('/auth/users/me/')
      setUser(data)
      return data
    } catch (err) {
      const axiosError = err as AxiosError
      console.error('Failed to fetch user info:', axiosError.message)
      return null
    }
  }, [])

  /**
   * Login with username and password
   */
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const response = await apiClient.post('/auth/login/', {
          username,
          password,
        })

        const { access, refresh, user: userData } = response.data as LoginResponse
        setTokens(access, refresh)

        // Use user data from login response if available, otherwise fetch it
        if (userData) {
          setUser(userData)
          return true
        }
        const userInfo = await fetchUserInfo()
        if (userInfo) {
          setUser(userInfo)
          return true
        }
        return false
      } catch (err) {
        const axiosError = err as AxiosError<any>
        const message = axiosError.response?.data?.detail || 'Login failed'
        setError(String(message))
        return false
      } finally {
        setLoading(false)
      }
    },
    [fetchUserInfo]
  )

  /**
   * Logout
   */
  const logout = useCallback((): void => {
    clearTokens()
    setUser(null)
    setError(null)
  }, [])

  /**
   * Refresh authentication by fetching user info again
   */
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const userInfo = await fetchUserInfo()
      return userInfo !== null
    } catch {
      return false
    }
  }, [fetchUserInfo])

  const signup = useCallback(async (username: string, password: string, role: UserRole): Promise<{ ok: boolean; error?: string }> => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.post('/auth/users/register/', { username, password, password_confirm: password, role })
      return { ok: true }
    } catch (err) {
      const axiosError = err as AxiosError<any>
      const data = axiosError.response?.data
      const msg = data?.detail || (data && Object.values(data)[0]) || 'Signup failed'
      setError(String(msg))
      return { ok: false, error: String(msg) }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    user,
    isAuthenticated: authenticated,
    loading,
    error,
    login,
    logout,
    refresh,
    signup,
  }
}

export type { User, LoginResponse }
