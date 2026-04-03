import type { EntryModuleId } from './nav.types'

export interface EntryRecord {
  id: string
  keyField: string
  sub: string
  data: Record<string, string>
  createdAt: string
  backendId?: number
}

export interface EditCtx {
  module: EntryModuleId
  recId: string
}

export type EntryStore = Record<EntryModuleId, EntryRecord[]>

export type EntryAction =
  | { type: 'ADD_RECORD';    module: EntryModuleId; record: EntryRecord }
  | { type: 'SET_MODULE_RECORDS'; module: EntryModuleId; records: EntryRecord[] }
  | { type: 'UPDATE_RECORD'; module: EntryModuleId; recId: string; record: Partial<EntryRecord> }
  | { type: 'DELETE_RECORD'; module: EntryModuleId; recId: string }
  | { type: 'SET_EDIT_CTX';  ctx: EditCtx | null }
  | { type: 'TOGGLE_FORM';   formId: string | null }
  | { type: 'CLEAR_FORM' }

export interface EntryState {
  records: EntryStore
  editCtx: EditCtx | null
  openFormId: string | null
}
