import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import apiClient from '../utils/api'
import { useAuthContext } from './AuthContext'

/**
 * Screen-level CRUD permissions keyed by main_screen slug → user_screen slug → actions[].
 *
 * Example:
 *   {
 *     "entry": {
 *       "voter": ["view", "add", "edit", "delete"],
 *       "booth": ["view"]
 *     },
 *     "masters-config": {
 *       "district": ["view", "add", "edit"]
 *     }
 *   }
 */
export type ScreenPermissions = Record<string, Record<string, string[]>>

interface PermissionContextType {
  /** Legacy: flat list of allowed page slugs (or ['*'] for admin) */
  allowedPages: string[]
  /** New: nested CRUD permissions per main-screen / user-screen */
  screenPermissions: ScreenPermissions
  loaded: boolean
  /** Legacy page-level check */
  canAccess: (pageId: string) => boolean
  /** Screen CRUD checks */
  canView:   (screenSlug: string) => boolean
  canAdd:    (screenSlug: string) => boolean
  canEdit:   (screenSlug: string) => boolean
  canDelete: (screenSlug: string) => boolean
  reload: () => void
}

const PermissionContext = createContext<PermissionContextType>({
  allowedPages: [],
  screenPermissions: {},
  loaded: false,
  canAccess:  () => true,
  canView:    () => true,
  canAdd:     () => true,
  canEdit:    () => true,
  canDelete:  () => true,
  reload: () => {},
})

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthContext()
  const [allowedPages, setAllowedPages]           = useState<string[]>([])
  const [screenPermissions, setScreenPermissions] = useState<ScreenPermissions>({})
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    if (!isAuthenticated) return

    // Admin always gets full access — skip fetching
    if (user?.role === 'admin') {
      setAllowedPages(['*'])
      setScreenPermissions({ '*': { '*': ['view', 'add', 'edit', 'delete'] } })
      setLoaded(true)
      return
    }

    apiClient.get('/auth/permissions/my_access/')
      .then(r => {
        setAllowedPages(r.data.allowed_pages ?? [])
        setScreenPermissions(r.data.screen_permissions ?? {})
        setLoaded(true)
      })
      .catch(() => {
        // Fail-open: allow all so UI doesn't break on network error
        setAllowedPages(['*'])
        setScreenPermissions({ '*': { '*': ['view', 'add', 'edit', 'delete'] } })
        setLoaded(true)
      })
  }, [isAuthenticated, user?.role])

  useEffect(() => { load() }, [load])

  /** Legacy page-level access check */
  const canAccess = useCallback((pageId: string): boolean => {
    if (!loaded) return true
    if (allowedPages.includes('*')) return true
    return allowedPages.includes(pageId)
  }, [allowedPages, loaded])

  /**
   * Find the allowed actions for a given screen slug across all main screens.
   * Returns the actions array or [] if not permitted.
   */
  const actionsFor = useCallback((screenSlug: string): string[] => {
    if (!loaded) return ['view', 'add', 'edit', 'delete']
    // Admin wildcard
    if (screenPermissions['*']?.['*']) return screenPermissions['*']['*']
    for (const ms of Object.values(screenPermissions)) {
      if (ms[screenSlug]) return ms[screenSlug]
    }
    return []
  }, [screenPermissions, loaded])

  const canView   = useCallback((s: string) => actionsFor(s).includes('view'),   [actionsFor])
  const canAdd    = useCallback((s: string) => actionsFor(s).includes('add'),    [actionsFor])
  const canEdit   = useCallback((s: string) => actionsFor(s).includes('edit'),   [actionsFor])
  const canDelete = useCallback((s: string) => actionsFor(s).includes('delete'), [actionsFor])

  return (
    <PermissionContext.Provider value={{
      allowedPages,
      screenPermissions,
      loaded,
      canAccess,
      canView,
      canAdd,
      canEdit,
      canDelete,
      reload: load,
    }}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionContext)
}
