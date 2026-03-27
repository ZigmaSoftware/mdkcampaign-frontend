import React, { useRef, useState, useEffect } from 'react'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { TaskRecord } from '../../hooks/useEntryAPI'
import type { RecordTag } from '../../components/entry/RecordItem'
import { useUserAPI } from '../../hooks/usePollAPI'
import type { UserRecord } from '../../hooks/usePollAPI'
import EntryListHeader from '../../components/entry/EntryListHeader'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import RecordList from '../../components/entry/RecordList'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'
import { exportRecordsToCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'
import { useToast } from '../../context/ToastContext'
import type { EntryRecord } from '../../types/entry.types'

const FORM_ID = 'task-form'

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'material_preparation', label: 'Material Preparation' },
  { value: 'distribution',         label: 'Distribution' },
  { value: 'event_coordination',   label: 'Event Coordination' },
  { value: 'voter_outreach',       label: 'Voter Outreach' },
  { value: 'social_media',         label: 'Social Media' },
  { value: 'logistics',            label: 'Logistics' },
  { value: 'communication',        label: 'Communication' },
  { value: 'data_entry',           label: 'Data Entry' },
  { value: 'finance',              label: 'Finance' },
  { value: 'other',                label: 'Other' },
]

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
]

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map(s => [s.value, s.label])
)
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(c => [c.value, c.label])
)

function userName(u: UserRecord) {
  return u.full_name?.trim() || `${u.first_name} ${u.last_name}`.trim() || u.username
}

export default function EventEntry() {
  const api     = useEntryAPI()
  const userApi = useUserAPI()
  const { showToast } = useToast()

  const [tasks,   setTasks]   = useState<TaskRecord[]>([])
  const [users,   setUsers]   = useState<UserRecord[]>([])
  const [editing, setEditing] = useState<TaskRecord | null>(null)
  const [isFormOpen, setFormOpen] = useState(false)
  const [search,  setSearch]  = useState('')

  // status state to conditionally show completed datetime
  const [statusVal, setStatusVal] = useState('pending')
  const pendingCompletedAt = useRef<string>('')

  const pendingFill = useRef<TaskRecord | null>(null)

  useEffect(() => {
    api.fetchTasks().then(d => d && setTasks(d))
    userApi.fetchUsers().then(d => d && setUsers(d))
  }, [])

  useEffect(() => {
    if (isFormOpen && pendingFill.current) {
      fill(pendingFill.current)
      pendingFill.current = null
    }
  }, [isFormOpen])

  useEffect(() => {
    if (statusVal === 'completed' && pendingCompletedAt.current && r.completed.current) {
      r.completed.current.value = pendingCompletedAt.current
      pendingCompletedAt.current = ''
    }
  }, [statusVal])

  const r = {
    title:     useRef<HTMLInputElement>(null),
    category:  useRef<HTMLSelectElement>(null),
    details:   useRef<HTMLTextAreaElement>(null),
    expected:  useRef<HTMLInputElement>(null),
    venue:     useRef<HTMLInputElement>(null),
    incharge:  useRef<HTMLSelectElement>(null),
    coord:     useRef<HTMLSelectElement>(null),
    qty:       useRef<HTMLInputElement>(null),
    completed: useRef<HTMLInputElement>(null),
    notes:     useRef<HTMLTextAreaElement>(null),
  }

  const fill = (t: TaskRecord) => {
    if (r.title.current)    r.title.current.value    = t.title
    if (r.category.current) r.category.current.value = t.category || ''
    if (r.details.current)  r.details.current.value  = t.details || ''
    // datetime-local expects "YYYY-MM-DDTHH:MM"
    if (r.expected.current) r.expected.current.value = t.expected_datetime
      ? t.expected_datetime.slice(0, 16) : ''
    if (r.venue.current)    r.venue.current.value    = t.venue || ''
    if (r.incharge.current) r.incharge.current.value = t.delivery_incharge ? String(t.delivery_incharge) : ''
    if (r.coord.current)    r.coord.current.value    = t.coordinator ? String(t.coordinator) : ''
    if (r.qty.current)      r.qty.current.value      = String(t.qty ?? 1)
    const sv = t.status || 'pending'
    pendingCompletedAt.current = t.completed_datetime ? t.completed_datetime.slice(0, 16) : ''
    setStatusVal(sv)
    if (r.notes.current)    r.notes.current.value    = t.notes || ''
  }

  const clear = () => {
    Object.values(r).forEach(ref => { if (ref.current) ref.current.value = '' })
    if (r.qty.current) r.qty.current.value = '1'
    setStatusVal('pending')
  }

  const handleSave = async () => {
    const title = r.title.current?.value.trim() ?? ''
    if (!title) { showToast('<i class="ph ph-warning"></i> Task title is required.', '#dc2626'); return }

    const payload: Partial<TaskRecord> = {
      title,
      category:          r.category.current?.value  || 'other',
      details:           r.details.current?.value   || '',
      expected_datetime: r.expected.current?.value  || new Date().toISOString(),
      venue:             r.venue.current?.value     || '',
      delivery_incharge: r.incharge.current?.value  ? Number(r.incharge.current.value) : null,
      coordinator:       r.coord.current?.value     ? Number(r.coord.current.value)    : null,
      qty:               r.qty.current?.value       ? Number(r.qty.current.value)      : 1,
      status:            statusVal,
      completed_datetime: statusVal === 'completed' && r.completed.current?.value
        ? r.completed.current.value : null,
      notes:             r.notes.current?.value     || '',
    }

    if (editing) {
      const updated = await api.updateTask(editing.id, payload)
      if (updated) {
        setTasks(prev => prev.map(t => t.id === editing.id ? { ...t, ...updated } : t))
        showToast('<i class="ph ph-check-circle"></i> Task updated!', '#138808')
        setEditing(null)
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update task. Please check all required fields.', '#dc2626')
      }
    } else {
      const created = await api.createTask(payload)
      if (created) {
        setTasks(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Task saved!', '#138808')
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save task. Please check all required fields.', '#dc2626')
      }
    }
    clear()
  }

  const handleEdit = (id: string) => {
    const task = tasks.find(t => String(t.id) === id)
    if (!task) return
    pendingFill.current = task
    setEditing(task)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this task?')) return
    const task = tasks.find(t => String(t.id) === id)
    if (!task) return
    const ok = await api.deleteTask(task.id)
    if (ok) {
      setTasks(prev => prev.filter(t => t.id !== task.id))
      showToast('<i class="ph ph-trash"></i> Task deleted.', '#dc2626')
    }
  }

  const mapTask = (t: TaskRecord): EntryRecord => ({
    id:       String(t.id),
    keyField: t.title,
    sub: [
      CATEGORY_LABEL[t.category] || t.category,
      t.expected_datetime ? t.expected_datetime.slice(0, 10) : '—',
      t.delivery_incharge_name ? `Incharge: ${t.delivery_incharge_name}` : '',
      t.coordinator_name       ? `Coord: ${t.coordinator_name}`          : '',
    ].filter(Boolean).join(' · '),
    data: {
      category:               t.category,
      status:                 t.status,
      expected_datetime:      t.expected_datetime        || '',
      venue:                  t.venue                    || '',
      qty:                    t.qty != null ? String(t.qty) : '',
      delivery_incharge:      t.delivery_incharge_name   || '',
      coordinator:            t.coordinator_name         || '',
      details:                t.details                  || '',
      completed_datetime:     t.completed_datetime       || '',
      notes:                  t.notes                    || '',
    },
    createdAt: t.created_at || '',
    backendId: t.id,
  })

  const filtered = tasks
    .filter(t => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        t.title.toLowerCase().includes(q) ||
        (t.venue || '').toLowerCase().includes(q) ||
        CATEGORY_LABEL[t.category]?.toLowerCase().includes(q)
      )
    })
    .map<EntryRecord>(mapTask)

  const allTaskRecords = tasks.map<EntryRecord>(mapTask)

  const getTaskTag = (rec: EntryRecord): RecordTag | undefined => {
    const { status, expected_datetime } = rec.data
    if (status === 'completed') return { label: 'Completed', bg: '#dcfce7', color: '#138808' }
    if (status === 'cancelled') return { label: 'Cancelled', bg: '#f3f4f6', color: '#6b7280' }
    if (expected_datetime) {
      const now = new Date()
      const exp = new Date(expected_datetime)
      if (exp < now) return { label: 'Overdue', bg: '#fee2e2', color: '#dc2626' }
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      if (exp <= todayEnd) return { label: 'Due Today', bg: '#fff3e0', color: '#e07010' }
    }
    if (status === 'in_progress') return { label: 'In Progress', bg: '#dbeafe', color: '#1d4ed8' }
    return { label: 'Pending', bg: '#f1f5f9', color: '#64748b' }
  }

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Task Management"
          icon="ph ph-clipboard-text"
          count={tasks.length}
          onAddNew={() => { setEditing(null); clear(); setFormOpen(true) }}
          addLabel="Add Task"
        />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search tasks..."
            value={search}
            onChange={setSearch}
            onExport={() => exportRecordsToCsv(allTaskRecords, 'Task_Management')}
            onPrint={() => printModule(allTaskRecords, 'Task Management')}
          />
          <RecordList
            records={filtered}
            editingId={editing ? String(editing.id) : null}
            emptyMsg='No tasks yet. Click "Add Task" to begin.'
            icon="ph ph-clipboard-text"
            iconBg="#ede9fe"
            iconColor="#7c3aed"
            onEdit={handleEdit}
            onDelete={handleDelete}
            getTag={getTaskTag}
            filterConfig={[
              { key: 'category', label: 'Category', options: CATEGORY_OPTIONS },
              { key: 'status',   label: 'Status',   options: STATUS_OPTIONS   },
            ]}
          />
        </div>
      </div>

      <EntryFormPanel
        id={FORM_ID}
        title="Task Management"
        icon="ph ph-clipboard-text"
        isOpen={isFormOpen}
        isEditing={!!editing}
        onClose={() => { setFormOpen(false); setEditing(null); clear() }}
      >
        <FormRow cols={3}>
          <FormGroup label="Task Title" required>
            <input ref={r.title} className={inputCls} placeholder="Task name" />
          </FormGroup>
          <FormGroup label="Task Category" required>
            <select ref={r.category} className={selectCls}>
              <option value="">Select Category</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Expected Delivery Date &amp; Time" required>
            <input ref={r.expected} type="datetime-local" className={inputCls} />
          </FormGroup>
        </FormRow>

        <FormRow cols={1}>
          <FormGroup label="Task Details">
            <textarea ref={r.details} className={textareaCls} placeholder="Describe the task..." />
          </FormGroup>
        </FormRow>

        <FormRow cols={3}>
          <FormGroup label="Venue / Location">
            <input ref={r.venue} className={inputCls} placeholder="Where will this be done?" />
          </FormGroup>
          <FormGroup label="Delivery Incharge">
            <select ref={r.incharge} className={selectCls}>
              <option value="">Select Incharge</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{userName(u)}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Co-ordinator">
            <select ref={r.coord} className={selectCls}>
              <option value="">Select Co-ordinator</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{userName(u)}</option>
              ))}
            </select>
          </FormGroup>
        </FormRow>

        <FormRow cols={3}>
          <FormGroup label="Qty">
            <input ref={r.qty} type="number" className={inputCls} placeholder="1" min="1" defaultValue="1" />
          </FormGroup>
          <FormGroup label="Status" required>
            <select
              className={selectCls}
              value={statusVal}
              onChange={e => setStatusVal(e.target.value)}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </FormGroup>
          {statusVal === 'completed' && (
            <FormGroup label="Completed Date &amp; Time">
              <input ref={r.completed} type="datetime-local" className={inputCls} />
            </FormGroup>
          )}
        </FormRow>

        <FormRow cols={1}>
          <FormGroup label="Notes">
            <textarea ref={r.notes} className={textareaCls} placeholder="Any notes or remarks..." />
          </FormGroup>
        </FormRow>

        <FormActions
          onSave={handleSave}
          onClear={clear}
          saveLabel={editing ? 'Update Task' : 'Save Task'}
          isEditing={!!editing}
        />
      </EntryFormPanel>
    </div>
  )
}
