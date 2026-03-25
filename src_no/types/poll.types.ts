export interface PollCandidate {
  key: string
  name: string
  party: string
  color: string
  initial: string
}

export interface PollState {
  votesQ1: Record<string, number>
  votesQ2: Record<string, number>
  hasVoted: boolean
  selectedQ1: string
  selectedQ2: string
  total: number
}

export type PollAction =
  | { type: 'SELECT_Q1'; key: string }
  | { type: 'SELECT_Q2'; key: string }
  | { type: 'CAST_VOTE' }
