import { useCallback, useMemo, useState } from 'react'
import { useEntryStore } from '../context/EntryStoreContext'
import { useToast } from '../context/ToastContext'
import type { EntryModuleId } from '../types/nav.types'
import type { EntryRecord } from '../types/entry.types'

function genId(module: EntryModuleId, len: number): string {
  return `${module}-${Date.now()}-${len}`
}

interface UseEntryModuleReturn {
  records:     EntryRecord[]
  filtered:    EntryRecord[]
  searchQuery: string
  setSearch:   (q: string) => void
  isFormOpen:  boolean
  isEditing:   boolean
  editingId:   string | null
  openForm:    () => void
  closeForm:   () => void
  saveRecord:  (keyField: string, sub: string, data: Record<string, string>, backendId?: number) => void
  startEdit:   (recId: string) => EntryRecord | undefined
  deleteRecord:(recId: string) => void
}

export function useEntryModule(module: EntryModuleId, formId: string): UseEntryModuleReturn {
  const { state, dispatch } = useEntryStore()
  const { showToast } = useToast()
  const [searchQuery, setSearch] = useState('')

  const records  = state.records[module] ?? []
  const isFormOpen = state.openFormId === formId
  const editCtx   = state.editCtx
  const isEditing  = !!(editCtx && editCtx.module === module)
  const editingId  = isEditing ? editCtx!.recId : null

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return records
    const q = searchQuery.toLowerCase()
    return records.filter(r =>
      r.keyField.toLowerCase().includes(q) ||
      r.sub.toLowerCase().includes(q)
    )
  }, [records, searchQuery])

  const openForm = useCallback(() => {
    dispatch({ type: 'TOGGLE_FORM', formId })
  }, [dispatch, formId])

  const closeForm = useCallback(() => {
    dispatch({ type: 'CLEAR_FORM' })
  }, [dispatch])

  const saveRecord = useCallback((
    keyField: string,
    sub: string,
    data: Record<string, string>,
    backendId?: number,
  ) => {
    if (!keyField.trim()) {
      showToast('<i class="ph ph-warning"></i> Fill required field!', '#dc2626')
      return
    }
    if (isEditing && editingId) {
      dispatch({
        type: 'UPDATE_RECORD',
        module,
        recId: editingId,
        record: { keyField, sub, data, ...(backendId !== undefined ? { backendId } : {}) },
      })
      showToast('<i class="ph ph-check-circle"></i> Record updated!', '#138808')
    } else {
      const record: EntryRecord = {
        id: genId(module, records.length),
        keyField,
        sub,
        data,
        createdAt: new Date().toISOString(),
        backendId,
      }
      dispatch({ type: 'ADD_RECORD', module, record })
      showToast('<i class="ph ph-check-circle"></i> Record saved!', '#138808')
    }
  }, [dispatch, isEditing, editingId, module, records.length, showToast])

  const startEdit = useCallback((recId: string): EntryRecord | undefined => {
    const rec = records.find(r => r.id === recId)
    if (!rec) return undefined
    dispatch({ type: 'SET_EDIT_CTX', ctx: { module, recId } })
    dispatch({ type: 'TOGGLE_FORM', formId })
    showToast('<i class="ph ph-pencil-simple"></i> Loaded for editing.', '#0d2455')
    return rec
  }, [records, dispatch, module, formId, showToast])

  const deleteRecord = useCallback((recId: string) => {
    if (editingId === recId) {
      dispatch({ type: 'CLEAR_FORM' })
    }
    dispatch({ type: 'DELETE_RECORD', module, recId })
    showToast('<i class="ph ph-trash"></i> Record deleted.', '#dc2626')
  }, [dispatch, module, editingId, showToast])

  return {
    records,
    filtered,
    searchQuery,
    setSearch,
    isFormOpen,
    isEditing,
    editingId,
    openForm,
    closeForm,
    saveRecord,
    startEdit,
    deleteRecord,
  }
}
