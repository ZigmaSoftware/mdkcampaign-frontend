import React from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import type { MasterModuleId } from '../types/nav.types'
import { MASTER_TABS } from '../constants/nav.constants'

import {
  AreaMaster,
  BoothMaster,
  VillageMaster,
  SchemeMaster,
  IssueMaster,
  CandidateMaster,
  PartyMaster,
} from './master-modules/AllMasters'

interface MastersConfigPageProps {
  activeTab: MasterModuleId
  onTabChange: (id: MasterModuleId) => void
}

export default function MastersConfigPage({ activeTab, onTabChange }: MastersConfigPageProps) {
  const renderMaster = () => {
    switch (activeTab) {
      case 'area':      return <AreaMaster />
      case 'booth':     return <BoothMaster />
      case 'village':   return <VillageMaster />
      case 'scheme':    return <SchemeMaster />
      case 'issue':     return <IssueMaster />
      case 'candidate': return <CandidateMaster />
      case 'party':     return <PartyMaster />
      default:          return <AreaMaster />
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <SectionHeader
        title="Masters & Configuration"
        icon="ph ph-sliders"
        subtitle="Manage dropdown data · Constituency · Candidate · Party details"
      />

      {/* Masters tab bar — card-style buttons exactly as in HTML .mtab */}
      <div className="flex gap-[6px] mb-6 flex-wrap" id="masters-nav-bar">
        {MASTER_TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
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
              <i
                className={`${tab.icon} text-[20px] transition-all duration-[180ms]
                  ${isActive ? 'text-saffron' : ''}`}
              />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Active master pane */}
      {renderMaster()}
    </div>
  )
}
