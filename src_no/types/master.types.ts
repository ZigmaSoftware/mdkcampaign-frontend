import type { MasterModuleId } from './nav.types'

export interface MasterRecord {
  id: string
  key: string
  meta?: string
}

export type MasterStore = Record<MasterModuleId, MasterRecord[]>

export type MasterAction =
  | { type: 'ADD_MASTER';    module: MasterModuleId; record: MasterRecord }
  | { type: 'UPDATE_MASTER'; module: MasterModuleId; id: string; key: string; meta?: string }
  | { type: 'DELETE_MASTER'; module: MasterModuleId; id: string }
