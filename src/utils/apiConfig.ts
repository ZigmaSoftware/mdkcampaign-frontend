const DEV_FRONTEND_PORTS = new Set(['5173', '8973'])
const DEFAULT_BACKEND_PORT = '8000'
const DEFAULT_API_PATH = '/api/v1'

function getBrowserLocation(): Location | null {
  return typeof window === 'undefined' ? null : window.location
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function shouldUseDevProxy(configuredBaseUrl?: string): boolean {
  const location = getBrowserLocation()
  if (!location || !DEV_FRONTEND_PORTS.has(location.port)) {
    return false
  }

  if (!configuredBaseUrl) {
    return true
  }

  try {
    const url = new URL(configuredBaseUrl, location.origin)
    return url.origin !== location.origin
  } catch {
    return true
  }
}

function getDynamicBackendBaseUrl(): string {
  const location = getBrowserLocation()
  if (!location) {
    return `http://localhost:${DEFAULT_BACKEND_PORT}${DEFAULT_API_PATH}`
  }

  return `${location.protocol}//${location.hostname}:${DEFAULT_BACKEND_PORT}${DEFAULT_API_PATH}`
}

export function resolveApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (shouldUseDevProxy(configuredBaseUrl)) {
    return DEFAULT_API_PATH
  }

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl)
  }

  return getDynamicBackendBaseUrl()
}

export const API_BASE_URL = resolveApiBaseUrl()
