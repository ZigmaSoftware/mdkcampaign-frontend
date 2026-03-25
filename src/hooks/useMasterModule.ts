import { useCallback } from 'react'
import { useMasterStore } from '../context/MasterStoreContext'
import { useToast } from '../context/ToastContext'
import type { MasterModuleId } from '../types/nav.types'
import type { MasterRecord } from '../types/master.types'

interface UseMasterModuleReturn {
  records:       MasterRecord[]
  addRecord:     (key: string, meta?: string, backendId?: number) => void
  deleteRecord:  (id: string) => void
  updateRecord:  (id: string, key: string, meta?: string, backendId?: number) => void
}

export function useMasterModule(module: MasterModuleId): UseMasterModuleReturn {
  const { state, dispatch } = useMasterStore()
  const { showToast } = useToast()

  const records = state[module] ?? []

  const addRecord = useCallback((key: string, meta?: string, backendId?: number) => {
    if (!key.trim()) {
      showToast('<i class="ph ph-warning"></i> Fill required field!', '#dc2626')
      return
    }
    const record: MasterRecord = {
      id:  `${module}-${Date.now()}-${records.length}`,
      key: key.trim(),
      meta,
      backendId,
    }
    dispatch({ type: 'ADD_MASTER', module, record })
    showToast('<i class="ph ph-check-circle"></i> Entry saved!', '#138808')
  }, [dispatch, module, records.length, showToast])

  const deleteRecord = useCallback((id: string) => {
    if (!window.confirm('Delete this master entry?')) return
    dispatch({ type: 'DELETE_MASTER', module, id })
    showToast('<i class="ph ph-trash"></i> Entry deleted.', '#dc2626')
  }, [dispatch, module, showToast])

  const updateRecord = useCallback((id: string, key: string, meta?: string, backendId?: number) => {
    dispatch({ type: 'UPDATE_MASTER', module, id, key, meta, backendId })
    showToast('<i class="ph ph-check-circle"></i> Entry updated!', '#138808')
  }, [dispatch, module, showToast])

  return { records, addRecord, deleteRecord, updateRecord }
}
