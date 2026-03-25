import type { PollCandidate } from '../types/poll.types'

export const POLL_CANDIDATES: PollCandidate[] = [
  { key: 'bjp',   name: 'Kirthika Shivkumar', party: 'BJP',      color: '#FF9933', initial: 'K' },
  { key: 'dmk',   name: 'DMK Candidate',       party: 'DMK',      color: '#dd0000', initial: 'D' },
  { key: 'admk',  name: 'ADMK Candidate',       party: 'ADMK',     color: '#004C97', initial: 'A' },
  { key: 'other', name: 'Others / NOTA',        party: 'Others',   color: '#64748b', initial: 'O' },
]

export const POLL_CRITERIA = [
  { key: 'development', label: 'Development Work',   labelTa: 'வளர்ச்சி பணிகள்'  },
  { key: 'welfare',     label: 'Welfare Schemes',    labelTa: 'நலத்திட்டங்கள்'   },
  { key: 'leadership',  label: 'Leadership Quality', labelTa: 'தலைமைத்துவம்'    },
  { key: 'party',       label: 'Party Ideology',     labelTa: 'கட்சி கொள்கை'    },
]

export const INITIAL_POLL_VOTES_Q1: Record<string, number> = {
  bjp: 1840, dmk: 920, admk: 540, other: 280,
}

export const INITIAL_POLL_VOTES_Q2: Record<string, number> = {
  development: 1100, welfare: 980, leadership: 820, party: 680,
}

export const INITIAL_POLL_TOTAL = 3580
