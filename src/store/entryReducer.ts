import type { EntryState, EntryAction, EntryStore } from '../types/entry.types'
import type { EntryModuleId } from '../types/nav.types'

const ALL_MODULES: EntryModuleId[] = [
  'voter','booth','volunteer','event','campaign',
  'user','warroom','dashboard','alliance','keypeople',
  'feedback','commitment','grievance',
]

const initialRecords: EntryStore = ALL_MODULES.reduce((acc, id) => {
  acc[id] = []
  return acc
}, {} as EntryStore)

export const initialEntryState: EntryState = {
  records:    initialRecords,
  editCtx:    null,
  openFormId: null,
}

export function entryReducer(state: EntryState, action: EntryAction): EntryState {
  switch (action.type) {
    case 'ADD_RECORD':
      return {
        ...state,
        records: {
          ...state.records,
          [action.module]: [...state.records[action.module], action.record],
        },
        openFormId: null,
        editCtx: null,
      }

    case 'UPDATE_RECORD':
      return {
        ...state,
        records: {
          ...state.records,
          [action.module]: state.records[action.module].map(r =>
            r.id === action.recId ? { ...r, ...action.record } : r
          ),
        },
        editCtx: null,
      }

    case 'DELETE_RECORD':
      return {
        ...state,
        records: {
          ...state.records,
          [action.module]: state.records[action.module].filter(r => r.id !== action.recId),
        },
        editCtx: state.editCtx?.recId === action.recId ? null : state.editCtx,
      }

    case 'SET_EDIT_CTX':
      return { ...state, editCtx: action.ctx }

    case 'TOGGLE_FORM':
      return {
        ...state,
        openFormId: state.openFormId === action.formId ? null : action.formId,
      }

    case 'CLEAR_FORM':
      return { ...state, openFormId: null, editCtx: null }

    default:
      return state
  }
}
