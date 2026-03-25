import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react'
import { entryReducer, initialEntryState } from '../store/entryReducer'
import type { EntryState, EntryAction } from '../types/entry.types'

interface EntryStoreContextValue {
  state:    EntryState
  dispatch: Dispatch<EntryAction>
}

const EntryStoreContext = createContext<EntryStoreContextValue | null>(null)

export function EntryStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(entryReducer, initialEntryState)
  return (
    <EntryStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </EntryStoreContext.Provider>
  )
}

export function useEntryStore(): EntryStoreContextValue {
  const ctx = useContext(EntryStoreContext)
  if (!ctx) throw new Error('useEntryStore must be used within EntryStoreProvider')
  return ctx
}
