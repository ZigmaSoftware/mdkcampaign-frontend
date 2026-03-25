import React from 'react'
import { MASTER_TABS } from '../../constants/nav.constants'
import type { MasterModuleId } from '../../types/nav.types'

interface MastersTabBarProps {
  active:   MasterModuleId
  onChange: (id: MasterModuleId) => void
}

export default function MastersTabBar({ active, onChange }: MastersTabBarProps) {
  return (
    <div
      className="scrollbar-none flex overflow-x-auto border-b border-white/[0.08]
                 bg-navy rounded-t-card mb-0"
    >
      {MASTER_TABS.map(tab => (
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
