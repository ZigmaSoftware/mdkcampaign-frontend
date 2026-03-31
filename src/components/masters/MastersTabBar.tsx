import React, { useEffect } from 'react'
import { MASTER_TABS } from '../../constants/nav.constants'
import type { MasterModuleId } from '../../types/nav.types'
import { usePermissions } from '../../context/PermissionContext'

interface MastersTabBarProps {
  active:   MasterModuleId
  onChange: (id: MasterModuleId) => void
}

export default function MastersTabBar({ active, onChange }: MastersTabBarProps) {
  const { canView, loaded } = usePermissions()
  const visibleTabs = MASTER_TABS.filter(t => canView(t.id))

  // Auto-redirect to first accessible tab when current tab is not visible
  useEffect(() => {
    if (!loaded) return
    const isActiveVisible = visibleTabs.some(t => t.id === active)
    if (!isActiveVisible && visibleTabs.length > 0) {
      onChange(visibleTabs[0].id)
    }
  }, [loaded, visibleTabs, active, onChange])

  return (
    <div
      className="scrollbar-none flex overflow-x-auto border-b border-white/[0.08]
                 bg-navy rounded-t-card mb-0"
    >
      {visibleTabs.map(tab => (
        <button
          key={tab.id}
          className={`mtab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <i className={`${tab.icon} text-[13px]`} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
