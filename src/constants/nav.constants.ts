import type { PageId, EntryModuleId, MasterModuleId } from '../types/nav.types'

export const TOP_NAV_TABS: { id: PageId; label: string; icon: string }[] = [
  { id: 'dashboard',      label: 'Dashboard',    icon: 'ph ph-gauge'          },
  { id: 'entry',          label: 'Entry',        icon: 'ph ph-pencil-simple'  },
  { id: 'masters-config', label: 'Masters',       icon: 'ph ph-sliders'        },
  { id: 'report',         label: 'Reports',       icon: 'ph ph-chart-bar'      },
  { id: 'opinion-poll',   label: 'Opinion Poll',  icon: 'ph ph-megaphone'      },
  { id: 'user-settings',  label: 'User Settings', icon: 'ph ph-user-gear'      },
]

export const ENTRY_TABS: { id: EntryModuleId; label: string; icon: string }[] = [
  { id: 'voter',      label: 'Voter Details', icon: 'ph ph-user'           },
  { id: 'booth',      label: 'Booth Info',    icon: 'ph ph-map-pin'        },
  { id: 'volunteer',  label: 'Volunteers',    icon: 'ph ph-users-three'    },
  { id: 'beneficiary', label: 'Beneficiary', icon: 'ph ph-hand-heart' },
  { id: 'event',      label: 'Task Mgmt',     icon: 'ph ph-clipboard-text' },
  { id: 'campaign',   label: 'Campaign',      icon: 'ph ph-megaphone'      },
  { id: 'warroom',    label: 'War Room',      icon: 'ph ph-castle-turret'  },
  { id: 'dashboard',  label: 'Dashboard',     icon: 'ph ph-gauge'          },
  { id: 'alliance',   label: 'Alliance',      icon: 'ph ph-handshake'      },
  { id: 'keypeople',  label: 'Key People',    icon: 'ph ph-star'           },
  { id: 'feedback',   label: 'Feedback',      icon: 'ph ph-chats'          },
  { id: 'commitment',         label: 'Commitments', icon: 'ph ph-push-pin'            },
  { id: 'grievance',          label: 'Grievance',   icon: 'ph ph-warning'             },
  { id: 'agent-activity',     label: 'Agent Log',   icon: 'ph ph-identification-card' },
  { id: 'field-activity',     label: 'Field Survey', icon: 'ph ph-map-trifold'         },
  { id: 'volunteer-activity', label: 'Vol. Log',    icon: 'ph ph-clipboard-text'      },
  { id: 'voter-survey',       label: 'Feedback',    icon: 'ph ph-notepad'             },
  { id: 'attendance',         label: 'Attendance',      icon: 'ph ph-clock'               },
  { id: 'assign-telecalling',   label: 'Assign Telecalling',   icon: 'ph ph-phone-outgoing'  },
  { id: 'telecalling-assigned', label: 'Telecalling Assigned', icon: 'ph ph-clipboard-text'  },
  { id: 'feedback-review',      label: 'Feedback Review',      icon: 'ph ph-git-branch'      },
  { id: 'family-mapping',       label: 'Family Mapping',       icon: 'ph ph-house-line'      },
]

export const MASTER_TABS: { id: MasterModuleId; label: string; icon: string }[] = [
  { id: 'district',     label: 'District',     icon: 'ph ph-map-trifold'   },
  { id: 'constituency', label: 'Constituency', icon: 'ph ph-buildings'     },
  { id: 'ward',         label: 'Ward',         icon: 'ph ph-house-line'    },
  { id: 'area',         label: 'Block',        icon: 'ph ph-map-pin-area'  },
  { id: 'booth-master', label: 'Booth',        icon: 'ph ph-map-pin'       },
  { id: 'scheme',       label: 'Scheme',       icon: 'ph ph-file-text'     },
  { id: 'achievement',  label: 'Achievements', icon: 'ph ph-trophy'        },
  { id: 'candidate',    label: 'Candidate',    icon: 'ph ph-user-circle'   },
  { id: 'party',         label: 'Party',         icon: 'ph ph-flag'          },
  { id: 'task-category',    label: 'Task Category',    icon: 'ph ph-tag'          },
  { id: 'campaign-activity', label: 'Campaign Activity', icon: 'ph ph-megaphone'            },
  { id: 'volunteer-role',    label: 'Vol. Roles',        icon: 'ph ph-identification-badge' },
  { id: 'volunteer-type',    label: 'Vol. Types',        icon: 'ph ph-tag'                  },
  { id: 'panchayat',         label: 'Panchayat',         icon: 'ph ph-tree-structure'        },
  { id: 'union',             label: 'Union',             icon: 'ph ph-buildings'             },
]
