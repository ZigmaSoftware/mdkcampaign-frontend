import React from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import EntryTabBar from '../components/entry/EntryTabBar'
import type { EntryModuleId } from '../types/nav.types'

import VoterEntry from './entry-modules/VoterEntry'
import BoothEntry from './entry-modules/BoothEntry'
import VolunteerEntry from './entry-modules/VolunteerEntry'
import EventEntry from './entry-modules/EventEntry'
import AgentActivityEntry from './entry-modules/AgentActivityEntry'
import FieldActivityEntry from './entry-modules/FieldActivityEntry'
import VolunteerActivityEntry from './entry-modules/VolunteerActivityEntry'
import VoterSurveyEntry from './entry-modules/VoterSurveyEntry'
import UserEntryPage from './entry-modules/UserEntry'
import AttendanceEntry from './entry-modules/AttendanceEntry'
import {
  CampaignEntry,
  WarRoomEntry,
  DashboardEntry,
  AllianceEntry,
  KeyPeopleEntry,
  FeedbackEntry,
  CommitmentEntry,
  GrievanceEntry,
} from './entry-modules/RemainingEntries'

interface EntryPageProps {
  activeTab: EntryModuleId
  onTabChange: (id: EntryModuleId) => void
}

export default function EntryPage({ activeTab, onTabChange }: EntryPageProps) {
  const renderModule = () => {
    switch (activeTab) {
      case 'voter':      return <VoterEntry />
      case 'booth':      return <BoothEntry />
      case 'volunteer':  return <VolunteerEntry />
      case 'event':      return <EventEntry />
      case 'campaign':   return <CampaignEntry />
      case 'user':       return <UserEntryPage />
      case 'warroom':    return <WarRoomEntry />
      case 'dashboard':  return <DashboardEntry />
      case 'alliance':   return <AllianceEntry />
      case 'keypeople':  return <KeyPeopleEntry />
      case 'feedback':   return <FeedbackEntry />
      case 'commitment':         return <CommitmentEntry />
      case 'grievance':          return <GrievanceEntry />
      case 'agent-activity':     return <AgentActivityEntry />
      case 'field-activity':     return <FieldActivityEntry />
      case 'volunteer-activity': return <VolunteerActivityEntry />
      case 'voter-survey':       return <VoterSurveyEntry />
      case 'attendance':         return <AttendanceEntry />
      default:                   return <VoterEntry />
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <SectionHeader
        title="Data Entry Modules"
        icon="ph ph-pencil-simple"
        subtitle="18 modules · Enter, update and manage all campaign data"
      />
      {/* Tab bar */}
      <EntryTabBar active={activeTab} onChange={onTabChange} />
      {/* Active module */}
      <div className="mt-5">
        {renderModule()}
      </div>
    </div>
  )
}
