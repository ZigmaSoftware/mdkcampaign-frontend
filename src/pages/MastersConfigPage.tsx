import React, { useEffect } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import type { MasterModuleId } from '../types/nav.types'
import { MASTER_TABS } from '../constants/nav.constants'
import { usePermissions } from '../context/PermissionContext'

import {
  DistrictMaster,
  ConstituencyMaster,
  WardMaster,
  AreaMaster,
  BoothMaster,
  VillageMaster,
  SchemeMaster,
  AchievementMaster,
  CandidateMaster,
  PartyMaster,
  TaskCategoryMaster,
  CampaignActivityTypeMaster,
  VolunteerRoleMaster,
  VolunteerTypeMaster,
  PanchayatMaster,
  UnionMaster,
} from './master-modules/AllMasters'

interface MastersConfigPageProps {
  activeTab: MasterModuleId
  onTabChange: (id: MasterModuleId) => void
}

export default function MastersConfigPage({ activeTab, onTabChange }: MastersConfigPageProps) {
  const { canView, loaded } = usePermissions()

  const visibleTabs = MASTER_TABS.filter(t => canView(t.id))

  // Auto-redirect to first accessible tab when current tab is not visible
  useEffect(() => {
    if (!loaded || visibleTabs.length === 0) return
    if (!visibleTabs.some(t => t.id === activeTab)) {
      onTabChange(visibleTabs[0].id)
    }
  }, [loaded, visibleTabs, activeTab, onTabChange])

  const renderMaster = () => {
    switch (activeTab) {
      case 'district':          return <DistrictMaster />
      case 'constituency':      return <ConstituencyMaster />
      case 'ward':              return <WardMaster />
      case 'area':              return <AreaMaster />
      case 'booth-master':      return <BoothMaster />
      case 'village':           return <VillageMaster />
      case 'scheme':            return <SchemeMaster />
      case 'achievement':       return <AchievementMaster />
      case 'candidate':         return <CandidateMaster />
      case 'party':             return <PartyMaster />
      case 'task-category':     return <TaskCategoryMaster />
      case 'campaign-activity': return <CampaignActivityTypeMaster />
      case 'volunteer-role':    return <VolunteerRoleMaster />
      case 'volunteer-type':    return <VolunteerTypeMaster />
      case 'panchayat':         return <PanchayatMaster />
      case 'union':             return <UnionMaster />
      default:                  return visibleTabs[0] ? renderFirst(visibleTabs[0].id) : null
    }
  }

  const renderFirst = (id: MasterModuleId) => {
    switch (id) {
      case 'district':          return <DistrictMaster />
      case 'constituency':      return <ConstituencyMaster />
      case 'ward':              return <WardMaster />
      case 'area':              return <AreaMaster />
      case 'booth-master':      return <BoothMaster />
      case 'scheme':            return <SchemeMaster />
      case 'achievement':       return <AchievementMaster />
      case 'candidate':         return <CandidateMaster />
      case 'party':             return <PartyMaster />
      case 'task-category':     return <TaskCategoryMaster />
      case 'campaign-activity': return <CampaignActivityTypeMaster />
      case 'volunteer-role':    return <VolunteerRoleMaster />
      case 'volunteer-type':    return <VolunteerTypeMaster />
      case 'panchayat':         return <PanchayatMaster />
      case 'union':             return <UnionMaster />
      default:                  return <DistrictMaster />
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <SectionHeader
        title="Masters & Configuration"
        icon="ph ph-sliders"
        subtitle="Manage dropdown data · Constituency · Candidate · Party details"
      />

      <div className="flex gap-[6px] mb-6 flex-wrap" id="masters-nav-bar">
        {visibleTabs.map(tab => {
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

      {renderMaster()}
    </div>
  )
}
