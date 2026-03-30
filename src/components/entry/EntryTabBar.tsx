import React, { useState, useEffect } from 'react'
import { ENTRY_TABS } from '../../constants/nav.constants'
import type { EntryModuleId } from '../../types/nav.types'
import { usePermissions } from '../../context/PermissionContext'

interface TabGroup {
  id:    string
  label: string
  icon:  string
  tabs:  { id: EntryModuleId; label: string; icon: string }[]
}

const TAB_GROUPS: TabGroup[] = [
  {
    id:    'search',
    label: 'Search',
    icon:  'ph ph-magnifying-glass',
    tabs: [
      { id: 'global-search', label: 'Global Search', icon: 'ph ph-magnifying-glass' },
    ],
  },
  {
    id:    'field-data',
    label: 'Field Data',
    icon:  'ph ph-database',
    tabs: [
      { id: 'voter', label: 'Voter Details', icon: 'ph ph-user'    },
      { id: 'booth', label: 'Booth Info',    icon: 'ph ph-map-pin' },
    ],
  },
  {
    id:    'people',
    label: 'People',
    icon:  'ph ph-users-three',
    tabs: [
      { id: 'volunteer', label: 'Volunteers', icon: 'ph ph-users-three' },
      { id: 'user',      label: 'User Mgmt',  icon: 'ph ph-user-gear'  },
    ],
  },
  {
    id:    'campaign',
    label: 'Campaign',
    icon:  'ph ph-megaphone',
    tabs: [
      { id: 'event',    label: 'Task Mgmt', icon: 'ph ph-calendar'  },
      { id: 'campaign', label: 'Campaign',  icon: 'ph ph-megaphone' },
    ],
  },
  {
    id:    'feedback',
    label: 'Feedback',
    icon:  'ph ph-chats',
    tabs: [
      { id: 'feedback',   label: 'Feedback',    icon: 'ph ph-chats'    },
      { id: 'commitment', label: 'Commitments', icon: 'ph ph-push-pin' },
      { id: 'grievance',  label: 'Grievance',   icon: 'ph ph-warning'  },
    ],
  },
  {
    id:    'activity',
    label: 'Activity Logs',
    icon:  'ph ph-clipboard-text',
    tabs: [
      { id: 'voter-survey',         label: 'Voter Survey',         icon: 'ph ph-notepad'             },
      { id: 'agent-activity',       label: 'Agent Log',            icon: 'ph ph-identification-card' },
      { id: 'field-activity',       label: 'Field Log',            icon: 'ph ph-map-trifold'         },
      { id: 'volunteer-activity',   label: 'Volunteer Log',        icon: 'ph ph-clipboard-text'      },
      { id: 'attendance',           label: 'Attendance',           icon: 'ph ph-clock'               },
      { id: 'assign-telecalling',   label: 'Assign Telecalling',   icon: 'ph ph-phone-outgoing'      },
      { id: 'telecalling-assigned', label: 'Telecalling Assigned', icon: 'ph ph-clipboard-text'      },
      { id: 'feedback-review',      label: 'Feedback Review',      icon: 'ph ph-git-branch'          },
    ],
  },
]

interface EntryTabBarProps {
  active:   EntryModuleId
  onChange: (id: EntryModuleId) => void
}

export default function EntryTabBar({ active, onChange }: EntryTabBarProps) {
  const [mobileOpen,    setMobileOpen]    = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const { canView, loaded } = usePermissions()

  // Filter groups and their tabs based on screen permissions
  const visibleGroups = TAB_GROUPS
    .map(g => ({ ...g, tabs: g.tabs.filter(t => canView(t.id)) }))
    .filter(g => g.tabs.length > 0)

  // Auto-redirect to first accessible tab when current tab is not visible
  useEffect(() => {
    if (!loaded) return
    const allVisibleTabs = visibleGroups.flatMap(g => g.tabs)
    const isActiveVisible = allVisibleTabs.some(t => t.id === active)
    if (!isActiveVisible && allVisibleTabs.length > 0) {
      onChange(allVisibleTabs[0].id)
    }
  }, [loaded, visibleGroups, active, onChange])

  const activeGroup = visibleGroups.find(g => g.tabs.some(t => t.id === active))
  const activeTab   = ENTRY_TABS.find(t => t.id === active)

  const handleGroupClick = (group: TabGroup) => {
    if (!group.tabs.some(t => t.id === active)) {
      onChange(group.tabs[0].id)
    }
  }

  const handleMobileTabClick = (id: EntryModuleId) => {
    onChange(id)
    setMobileOpen(false)
    setExpandedGroup(null)
  }

  return (
    <div className="bg-navy rounded-t-card relative">

      {/* ══════════════════════════════════════════════════════
          MOBILE  (< md): collapsed bar + dropdown
      ══════════════════════════════════════════════════════ */}
      <div className="flex md:hidden items-center gap-2 px-3 py-[10px] border-b border-white/[0.08]">
        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="flex items-center justify-center w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 text-white/80 transition-colors flex-shrink-0"
          aria-label="Toggle module menu"
        >
          <i className={`ph ${mobileOpen ? 'ph-x' : 'ph-list'} text-[18px]`} />
        </button>

        {/* Breadcrumb: Group > Sub-tab */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {activeGroup && (
            <>
              <i className={`${activeGroup.icon} text-[12px] text-white/40 flex-shrink-0`} />
              <span className="text-[9px] font-bold tracking-[0.6px] uppercase text-white/40">
                {activeGroup.label}
              </span>
              <i className="ph ph-caret-right text-[9px] text-white/20 flex-shrink-0" />
            </>
          )}
          {activeTab && (
            <>
              <i className={`${activeTab.icon} text-[14px] text-saffron flex-shrink-0`} />
              <span className="text-[11px] font-bold tracking-[0.8px] uppercase text-white truncate">
                {activeTab.label}
              </span>
            </>
          )}
        </div>

        <i className={`ph ${mobileOpen ? 'ph-caret-up' : 'ph-caret-down'} text-[14px] text-white/30 flex-shrink-0`} />
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="md:hidden absolute left-0 right-0 top-full z-50 shadow-2xl rounded-b-lg overflow-hidden"
          style={{ background: '#0a1a3e', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none' }}
        >
          {visibleGroups.map((group, gi) => {
            const isGroupActive = group.tabs.some(t => t.id === active)
            const isExpanded    = expandedGroup === group.id || isGroupActive

            return (
              <div key={group.id} className={gi > 0 ? 'border-t border-white/[0.06]' : ''}>
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-[11px] transition-all duration-150
                    ${isGroupActive ? 'bg-saffron/10' : 'hover:bg-white/[0.04]'}
                  `}
                >
                  <i className={`${group.icon} text-[15px] flex-shrink-0 ${isGroupActive ? 'text-saffron' : 'text-white/40'}`} />
                  <span className={`text-[11px] font-bold tracking-[0.8px] uppercase flex-1 text-left ${isGroupActive ? 'text-saffron' : 'text-white/50'}`}>
                    {group.label}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isGroupActive ? 'bg-saffron/20 text-saffron' : 'bg-white/10 text-white/30'}`}>
                    {group.tabs.length}
                  </span>
                  <i className={`ph ${isExpanded ? 'ph-caret-up' : 'ph-caret-down'} text-[11px] text-white/30 flex-shrink-0`} />
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
                    {group.tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => handleMobileTabClick(tab.id)}
                        className={`
                          flex items-center gap-2 px-4 py-[10px] text-left transition-all duration-150
                          ${active === tab.id
                            ? 'bg-saffron/[0.12] text-white'
                            : 'bg-[#0a1a3e] text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                          }
                        `}
                      >
                        <i className={`${tab.icon} text-[13px] flex-shrink-0 ${active === tab.id ? 'text-saffron' : ''}`} />
                        <span className="text-[11px] font-semibold leading-tight">{tab.label}</span>
                        {active === tab.id && (
                          <i className="ph ph-check text-[10px] text-saffron ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          DESKTOP  (≥ md): primary group tabs + sub-tab pills
      ══════════════════════════════════════════════════════ */}

      {/* Row 1 — Primary module group tabs */}
      <div className="hidden md:flex items-end gap-0 px-3 pt-3 pb-0 border-b border-white/[0.08]">
        {visibleGroups.map(group => {
          const isActive = group.tabs.some(t => t.id === active)
          return (
            <button
              key={group.id}
              onClick={() => handleGroupClick(group)}
              className={`
                flex items-center gap-[7px] px-4 py-[9px] rounded-t-lg mr-1
                text-[10px] font-bold tracking-[0.9px] uppercase whitespace-nowrap
                border border-b-0 transition-all duration-150
                ${isActive
                  ? 'bg-saffron text-navy border-saffron/60 shadow-sm'
                  : 'bg-transparent text-white/40 border-transparent hover:text-white/70 hover:bg-white/[0.07]'
                }
              `}
            >
              <i className={`${group.icon} text-[13px]`} />
              {group.label}
              <span className={`
                text-[8px] px-[5px] py-[1px] rounded-full font-bold
                ${isActive ? 'bg-navy/25 text-navy' : 'bg-white/10 text-white/35'}
              `}>
                {group.tabs.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Row 2 — Sub-tab filter pills for active group */}
      <div className="hidden md:flex items-center gap-2 px-4 py-[10px] bg-white/[0.025]">
        {activeGroup && (
          <div className="flex items-center gap-[6px] mr-3 flex-shrink-0">
            <i className={`${activeGroup.icon} text-[11px] text-white/30`} />
            <span className="text-[9px] font-bold tracking-[1px] uppercase text-white/30">
              {activeGroup.label}
            </span>
            <i className="ph ph-caret-right text-[9px] text-white/20" />
          </div>
        )}

        {activeGroup?.tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-[6px] px-3 py-[5px] rounded-full
              text-[10px] font-semibold whitespace-nowrap border transition-all duration-150
              ${active === tab.id
                ? 'bg-saffron/15 text-saffron border-saffron/35'
                : 'bg-transparent text-white/45 border-transparent hover:bg-white/[0.08] hover:text-white/75 hover:border-white/10'
              }
            `}
          >
            <i className={`${tab.icon} text-[12px]`} />
            {tab.label}
            {active === tab.id && (
              <i className="ph ph-check-circle text-[11px] text-saffron" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
