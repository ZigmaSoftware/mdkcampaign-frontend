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

export interface UserScreenConfig {
  id: number
  main_screen: number
  name: string
  slug: string
  icon: string
  order: number
  is_active: boolean
}

export interface MainScreenConfig {
  id: number
  name: string
  slug: string
  icon: string
  order: number
  is_active: boolean
  screens: UserScreenConfig[]
}

export interface TopTab {
  id: string
  label: string
  icon: string
}

interface PermissionContextType {
  /** Legacy: flat list of allowed page slugs (or ['*'] for admin) */
  allowedPages: string[]
  /** New: nested CRUD permissions per main-screen / user-screen */
  screenPermissions: ScreenPermissions
  mainScreens: MainScreenConfig[]
  topTabs: TopTab[]
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
  mainScreens: [],
  topTabs: [],
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
  const [mainScreens, setMainScreens]             = useState<MainScreenConfig[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    if (!isAuthenticated) {
      setAllowedPages([])
      setScreenPermissions({})
      setMainScreens([])
      setLoaded(false)
      return
    }

    const mainScreensReq = apiClient.get('/auth/main-screens/')
      .then(r => (r.data.results ?? r.data ?? []) as MainScreenConfig[])
      .catch(() => [] as MainScreenConfig[])

    // Admin always gets full access — skip fetching
    if (user?.role === 'admin') {
      mainScreensReq.then(list => {
        setMainScreens(list)
        setAllowedPages(['*'])
        setScreenPermissions({ '*': { '*': ['view', 'add', 'edit', 'delete'] } })
        setLoaded(true)
      })
      return
    }

    Promise.all([apiClient.get('/auth/permissions/my_access/'), mainScreensReq])
      .then(([permRes, mainScreenList]) => {
        setAllowedPages(permRes.data.allowed_pages ?? [])
        setScreenPermissions(permRes.data.screen_permissions ?? {})
        setMainScreens(mainScreenList)
        setLoaded(true)
      })
      .catch(() => {
        // Fail-open: allow all so UI doesn't break on network error
        setAllowedPages(['*'])
        setScreenPermissions({ '*': { '*': ['view', 'add', 'edit', 'delete'] } })
        setMainScreens([])
        setLoaded(true)
      })
  }, [isAuthenticated, user?.role])

  useEffect(() => { load() }, [load])

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

  /** Legacy page-level access check */
  const canAccess = useCallback((pageId: string): boolean => {
    if (!loaded) return true
    if (allowedPages.includes('*')) return true
    if (allowedPages.includes(pageId)) return true

    if (pageId === 'user-settings') {
      return canView('user-mgmt') || canView('permissions')
    }

    return false
  }, [allowedPages, canView, loaded])

  const topTabs = React.useMemo<TopTab[]>(() => {
    const knownTopScreens = new Set(['dashboard', 'entry', 'masters-config', 'report', 'opinion-poll'])

    const fromBackend = mainScreens
      .filter(ms => ms.is_active && knownTopScreens.has(ms.slug))
      .sort((a, b) => a.order - b.order)
      .map(ms => ({
        id: ms.slug,
        label: ms.name,
        icon: ms.icon || 'ph ph-squares-four',
      }))
      .filter(tab => canAccess(tab.id))

    const fallback: TopTab[] = [
      { id: 'dashboard', label: 'Dashboard', icon: 'ph ph-gauge' },
      { id: 'entry', label: 'Entry', icon: 'ph ph-pencil-simple' },
      { id: 'masters-config', label: 'Masters', icon: 'ph ph-sliders' },
      { id: 'report', label: 'Reports', icon: 'ph ph-chart-bar' },
      { id: 'opinion-poll', label: 'Opinion Poll', icon: 'ph ph-megaphone' },
    ].filter(tab => canAccess(tab.id))

    const base = fromBackend.length > 0 ? fromBackend : fallback
    const showUserSettings = canView('user-mgmt') || canView('permissions')
    const showTaskDashboard = canView('event')
    const showCampaignDashboard = canAccess('report')

    const tabs = [...base]
    if (showCampaignDashboard) {
      const analyticsTab = { id: 'campaign-dashboard', label: 'Activity Dashboard', icon: 'ph ph-chart-pie-slice' }
      const reportIndex = tabs.findIndex(tab => tab.id === 'report')
      if (reportIndex >= 0) tabs.splice(reportIndex + 1, 0, analyticsTab)
      else tabs.push(analyticsTab)
    }
    if (showUserSettings) {
      tabs.push({ id: 'user-settings', label: 'User Settings', icon: 'ph ph-user-gear' })
    }
    if (showTaskDashboard) {
      tabs.push({ id: 'task-dashboard', label: 'Task Dashboard', icon: 'ph ph-kanban' })
    }
    return tabs
  }, [mainScreens, canAccess, canView])

  return (
    <PermissionContext.Provider value={{
      allowedPages,
      screenPermissions,
      mainScreens,
      topTabs,
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
