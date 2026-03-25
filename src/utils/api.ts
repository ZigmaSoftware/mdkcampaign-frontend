import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.157:7904/api/v1'
const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || 'access_token'
const REFRESH_TOKEN_KEY = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refresh_token'
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000')

/**
 * Main API client instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Add JWT token to outgoing requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Handle responses and refresh token on 401
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // If 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          })
          
          const { access } = response.data
          localStorage.setItem(TOKEN_KEY, access)
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(REFRESH_TOKEN_KEY)
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token - redirect to login
        localStorage.removeItem(TOKEN_KEY)
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Store tokens
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

/**
 * Clear all auth tokens
 */
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

export default apiClient
