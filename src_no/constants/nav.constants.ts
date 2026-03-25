import type { PageId, EntryModuleId, MasterModuleId } from '../types/nav.types'

export const TOP_NAV_TABS: { id: PageId; label: string; icon: string }[] = [
  { id: 'dashboard',      label: 'Dashboard',    icon: 'ph ph-house'          },
  { id: 'master',         label: 'Overview',     icon: 'ph ph-chart-bar'      },
  { id: 'entry',          label: 'Entry',        icon: 'ph ph-pencil-simple'  },
  { id: 'masters-config', label: 'Masters',      icon: 'ph ph-sliders'        },
  { id: 'report',         label: 'Reports',      icon: 'ph ph-trend-up'       },
  { id: 'opinion-poll',   label: 'Opinion Poll', icon: 'ph ph-megaphone'      },
]

export const ENTRY_TABS: { id: EntryModuleId; label: string; icon: string }[] = [
  { id: 'voter',      label: 'Voter Details', icon: 'ph ph-user'           },
  { id: 'booth',      label: 'Booth Info',    icon: 'ph ph-map-pin'        },
  { id: 'volunteer',  label: 'Volunteers',    icon: 'ph ph-users-three'    },
  { id: 'event',      label: 'Event Mgmt',    icon: 'ph ph-calendar'       },
  { id: 'campaign',   label: 'Campaign',      icon: 'ph ph-megaphone'      },
  { id: 'user',       label: 'User Mgmt',     icon: 'ph ph-user-gear'      },
  { id: 'warroom',    label: 'War Room',      icon: 'ph ph-castle-turret'  },
  { id: 'alliance',   label: 'Alliance',      icon: 'ph ph-handshake'      },
  { id: 'keypeople',  label: 'Key People',    icon: 'ph ph-star'           },
  { id: 'feedback',   label: 'Feedback',      icon: 'ph ph-chats'          },
  { id: 'commitment', label: 'Commitments',   icon: 'ph ph-push-pin'       },
  { id: 'grievance',          label: 'Grievance',         icon: 'ph ph-warning'           },
  { id: 'volunteer-activity', label: 'Volunteer Activity', icon: 'ph ph-clipboard-text'    },
  { id: 'agent-activity',     label: 'Agent Activity',    icon: 'ph ph-identification-card'},
  { id: 'field-activity',     label: 'Field Activity',    icon: 'ph ph-map-trifold'       },
  { id: 'voter-survey',       label: 'Voter Survey',      icon: 'ph ph-notepad'           },
]

export const MASTER_TABS: { id: MasterModuleId; label: string; icon: string }[] = [
  { id: 'area',      label: 'Block',     icon: 'ph ph-map-pin-area'   },
  { id: 'booth',     label: 'Booth',     icon: 'ph ph-map-pin'        },
  { id: 'village',   label: 'Village',   icon: 'ph ph-house'          },
  { id: 'scheme',    label: 'Scheme',    icon: 'ph ph-file-text'      },
  { id: 'issue',     label: 'Issues',    icon: 'ph ph-warning'        },
  { id: 'candidate', label: 'Candidate', icon: 'ph ph-user-circle'    },
  { id: 'party',     label: 'Party',     icon: 'ph ph-flag'           },
]
