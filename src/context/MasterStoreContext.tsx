import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react'
import { masterReducer, initialMasterStore } from '../store/masterReducer'
import type { MasterStore, MasterAction } from '../types/master.types'

interface MasterStoreContextValue {
  state:    MasterStore
  dispatch: Dispatch<MasterAction>
}

const MasterStoreContext = createContext<MasterStoreContextValue | null>(null)

export function MasterStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(masterReducer, initialMasterStore)
  return (
    <MasterStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </MasterStoreContext.Provider>
  )
}

export function useMasterStore(): MasterStoreContextValue {
  const ctx = useContext(MasterStoreContext)
  if (!ctx) throw new Error('useMasterStore must be used within MasterStoreProvider')
  return ctx
}
