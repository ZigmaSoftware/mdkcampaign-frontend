import type { PollState, PollAction } from '../types/poll.types'
import {
  INITIAL_POLL_VOTES_Q1,
  INITIAL_POLL_VOTES_Q2,
  INITIAL_POLL_TOTAL,
} from '../constants/poll.constants'

export const initialPollState: PollState = {
  votesQ1:   { ...INITIAL_POLL_VOTES_Q1 },
  votesQ2:   { ...INITIAL_POLL_VOTES_Q2 },
  hasVoted:  false,
  selectedQ1: '',
  selectedQ2: '',
  total:     INITIAL_POLL_TOTAL,
}

export function pollReducer(state: PollState, action: PollAction): PollState {
  switch (action.type) {
    case 'SELECT_Q1':
      return { ...state, selectedQ1: action.key }

    case 'SELECT_Q2':
      return { ...state, selectedQ2: action.key }

    case 'CAST_VOTE': {
      if (state.hasVoted || !state.selectedQ1 || !state.selectedQ2) return state
      return {
        ...state,
        votesQ1: {
          ...state.votesQ1,
          [state.selectedQ1]: (state.votesQ1[state.selectedQ1] || 0) + 1,
        },
        votesQ2: {
          ...state.votesQ2,
          [state.selectedQ2]: (state.votesQ2[state.selectedQ2] || 0) + 1,
        },
        total:    state.total + 1,
        hasVoted: true,
      }
    }

    default:
      return state
  }
}
