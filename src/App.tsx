import { useEffect, useState } from 'react'
import { ToastProvider } from './context/ToastContext'
import { EntryStoreProvider } from './context/EntryStoreContext'
import { MasterStoreProvider } from './context/MasterStoreContext'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import { PermissionProvider, usePermissions } from './context/PermissionContext'

import TriBar from './components/layout/TriBar'
import TopBar from './components/layout/TopBar'
import NavTabs from './components/layout/NavTabs'
import Footer from './components/layout/Footer'

import DashboardPage from './pages/DashboardPage'
import OverviewPage from './pages/OverviewPage'
import EntryPage from './pages/EntryPage'
import MastersConfigPage from './pages/MastersConfigPage'
import ReportsPage from './pages/ReportsPage'
import OpinionPollPage from './pages/OpinionPollPage'
import UserSettingsPage from './pages/UserSettingsPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import PublicPollPage from './pages/PublicPollPage'

import type { PageId, EntryModuleId, MasterModuleId } from './types/nav.types'

function AppShell() {
  const { user, isAuthenticated, logout } = useAuthContext()
  const { topTabs, loaded } = usePermissions()

  const [activePage,       setActivePage]       = useState<PageId>('dashboard')
  const [activeEntryTab,   setActiveEntryTab]   = useState<EntryModuleId>('voter')
  const [activeMasterTab,  setActiveMasterTab]  = useState<MasterModuleId>('area')
  const [showSignup,       setShowSignup]       = useState(false)
  const visibleTopTabs = topTabs.filter(
    (tab): tab is (typeof tab & { id: PageId }) =>
      tab.id === 'dashboard' ||
      tab.id === 'entry' ||
      tab.id === 'masters-config' ||
      tab.id === 'report' ||
      tab.id === 'opinion-poll' ||
      tab.id === 'user-settings'
  )

  useEffect(() => {
    if (!loaded || visibleTopTabs.length === 0) return
    if (!visibleTopTabs.some(tab => tab.id === activePage)) {
      setActivePage(visibleTopTabs[0].id)
    }
  }, [loaded, visibleTopTabs, activePage])

  // ── Public poll (no auth needed) ────────────────────────
  if (window.location.hash === '#modakurichi' || window.location.hash === '#poll' || window.location.hash === '#mkpoll') return <PublicPollPage />

  // ── Not logged in → show login or signup ────────────────
  if (!isAuthenticated) {
    if (showSignup) return <SignupPage onGoToLogin={() => setShowSignup(false)} />
    return <LoginPage onGoToSignup={() => setShowSignup(true)} />
  }

  // ── Logged in → main app ────────────────────────────────
  const handlePageChange = (id: PageId) => {
    setActivePage(id)
    window.scrollTo(0, 0)
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />
      case 'master':
        return <OverviewPage />
      case 'entry':
        return (
          <EntryPage
            activeTab={activeEntryTab}
            onTabChange={(id) => { setActiveEntryTab(id); window.scrollTo(0, 0) }}
          />
        )
      case 'masters-config':
        return (
          <MastersConfigPage
            activeTab={activeMasterTab}
            onTabChange={(id) => { setActiveMasterTab(id); window.scrollTo(0, 0) }}
          />
        )
      case 'report':
        return <ReportsPage />
      case 'opinion-poll':
        return <OpinionPollPage />
      case 'user-settings':
        return <UserSettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg font-inter text-textMain text-[14px]">
      {/* Tricolor stripe */}
      <TriBar />

      {/* Sticky top bar */}
      <TopBar />

      {/* Nav tabs + user badge */}
      <div className="relative">
        <NavTabs activePage={activePage} onPageChange={handlePageChange} />
        {/* Floating user pill */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
          {user && (
            <span className="hidden sm:flex items-center gap-1.5 bg-white border border-border rounded-full px-3 py-1 text-[11px] font-semibold text-navy shadow-sm">
              <i className={`ph-fill ${user.role === 'admin' ? 'ph-shield-star text-saffron' : 'ph-user-circle text-kampgreen'} text-[13px]`} />
              {user.username}
              <span className={`ml-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-saffron/20 text-saffron-dark' : 'bg-kampgreen/10 text-kampgreen-dark'}`}>
                {user.role}
              </span>
            </span>
          )}
          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center gap-1 bg-white border border-border rounded-full px-3 py-1 text-[11px] font-semibold text-muted hover:text-red-600 hover:border-red-300 shadow-sm transition-all duration-150"
          >
            <i className="ph ph-sign-out text-[13px]" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Page content with fade-in */}
      <main className="flex-1 page-enter" key={activePage}>
        {renderPage()}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <EntryStoreProvider>
          <MasterStoreProvider>
            <PermissionProvider>
              <AppShell />
            </PermissionProvider>
          </MasterStoreProvider>
        </EntryStoreProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
