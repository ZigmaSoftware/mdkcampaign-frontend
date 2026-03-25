import type { MasterStore, MasterAction, MasterRecord } from '../types/master.types'
import type { MasterModuleId } from '../types/nav.types'

const seed = (module: string, items: Omit<MasterRecord, 'id'>[]): MasterRecord[] =>
  items.map((item, i) => ({ ...item, id: `${module}-${i}` }))

const initialMasterStore: MasterStore = {
  district: seed('district', []),
  constituency: seed('constituency', []),
  ward: seed('ward', []),
  area: seed('area', [
    { key: 'Modakkurichi',  meta: '112 Booths · 88,420 Voters' },
    { key: 'Sivagiri',      meta: '89 Booths · 74,315 Voters'  },
    { key: 'Erode City',    meta: '73 Booths · 79,450 Voters'  },
  ]),
  booth: seed('booth', []),
  village: seed('village', []),
  scheme: seed('scheme', [
    { key: 'PM Awas Yojana',       meta: 'Housing · Central · BPL Families'     },
    { key: 'Ayushman Bharat',      meta: 'Healthcare · Central · All Families'  },
    { key: 'PM Kisan',             meta: 'Agriculture · Central · Farmers'      },
    { key: 'Ujjwala Yojana',       meta: 'Energy · Central · Women'             },
    { key: 'Skill India',          meta: 'Employment · Central · Youth'         },
    { key: 'Arram Clinics',        meta: 'Healthcare · Arram Trust · All'       },
    { key: 'Arram Jobs',           meta: 'Employment · Arram Trust · Youth'     },
    { key: 'Arram NEET Coaching',  meta: 'Education · Arram Trust · Students'   },
  ]),
  issue: seed('issue', [
    { key: 'Jobs / Employment',  meta: 'Voter Issue · High'   },
    { key: 'Roads / Infrastructure', meta: 'Voter Issue · High' },
    { key: 'Healthcare',         meta: 'Voter Issue · High'   },
    { key: 'Farmers / PM Kisan', meta: 'Voter Issue · High'   },
    { key: 'Housing / PM Awas',  meta: 'Voter Issue · Medium' },
    { key: 'Women Safety',       meta: 'Voter Issue · Medium' },
    { key: 'Education',          meta: 'Voter Issue · Medium' },
    { key: 'LPG / Ujjwala',      meta: 'Voter Issue · Medium' },
  ]),
  achievement: seed('achievement', []),
  candidate: seed('candidate', []),
  party: seed('party', []),
}

export function masterReducer(state: MasterStore, action: MasterAction): MasterStore {
  switch (action.type) {
    case 'ADD_MASTER':
      return {
        ...state,
        [action.module]: [...state[action.module], action.record],
      }

    case 'UPDATE_MASTER': {
      const updated = state[action.module].map(r =>
        r.id === action.id
          ? { ...r, key: action.key, meta: action.meta ?? r.meta, backendId: action.backendId ?? r.backendId }
          : r
      )
      return { ...state, [action.module]: updated }
    }

    case 'DELETE_MASTER':
      return {
        ...state,
        [action.module]: state[action.module].filter(r => r.id !== action.id),
      }

    default:
      return state
  }
}

export { initialMasterStore }

export function generateMasterId(module: MasterModuleId, existing: MasterRecord[]): string {
  return `${module}-${Date.now()}-${existing.length}`
}
