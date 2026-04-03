import { useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import UserEntryPage from './entry-modules/UserEntry'
import PermissionsPage from './master-modules/PermissionsPage'
import { usePermissions } from '../context/PermissionContext'

type Tab = 'user-mgmt' | 'permissions'

export default function UserSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('user-mgmt')
  const { canView, loaded, mainScreens } = usePermissions()

  const tabs = useMemo<{ id: Tab; label: string; icon: string }[]>(() => {
    const mastersScreen = mainScreens.find(ms => ms.slug === 'masters-config')
    const dynamicTabs = (mastersScreen?.screens ?? [])
      .filter(screen => screen.is_active && (screen.slug === 'user-mgmt' || screen.slug === 'permissions'))
      .sort((a, b) => a.order - b.order)
      .map(screen => ({
        id: screen.slug as Tab,
        label: screen.name,
        icon: screen.icon || (screen.slug === 'permissions' ? 'ph ph-shield-check' : 'ph ph-users'),
      }))

    if (dynamicTabs.length > 0) return dynamicTabs
    return [
      { id: 'user-mgmt', label: 'User Management', icon: 'ph ph-users' },
      { id: 'permissions', label: 'Permissions', icon: 'ph ph-shield-check' },
    ]
  }, [mainScreens])

  const visibleTabs = useMemo(
    () => tabs.filter(tab => canView(tab.id)),
    [tabs, canView]
  )

  useEffect(() => {
    if (!loaded || visibleTabs.length === 0) return
    if (!visibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [loaded, visibleTabs, activeTab])

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <SectionHeader
        title="User Settings"
        icon="ph ph-user-gear"
        subtitle="Manage users · Assign roles · Configure access permissions"
      />

      <div className="flex gap-[6px] mb-6 flex-wrap" id="user-settings-nav-bar">
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex flex-col items-center gap-[5px] px-[22px] py-[14px]
                border-2 rounded-[10px] cursor-pointer
                font-inter text-[10px] font-bold tracking-[0.8px] uppercase
                transition-all duration-[180ms] min-w-[90px] flex-1
                ${isActive
                  ? 'bg-navy border-navy text-white shadow-[0_4px_14px_rgba(13,36,85,0.25)]'
                  : 'bg-surface border-border text-muted hover:border-saffron hover:text-navy hover:bg-[#fff9f0]'
                }
              `}
            >
              <i className={`${tab.icon} text-[20px] transition-all duration-[180ms] ${isActive ? 'text-saffron' : ''}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {loaded && visibleTabs.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-6 text-[13px] text-muted">
          You do not have access to User Settings.
        </div>
      ) : (
        <div className="page-enter" key={activeTab}>
          {activeTab === 'user-mgmt'   && <UserEntryPage />}
          {activeTab === 'permissions' && <PermissionsPage />}
        </div>
      )}
    </div>
  )
}
