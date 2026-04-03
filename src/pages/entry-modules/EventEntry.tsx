import { useRef, useState, useEffect } from 'react'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { TaskRecord } from '../../hooks/useEntryAPI'
import type { RecordTag } from '../../components/entry/RecordItem'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { TaskType, TaskCategory, VolunteerRole, VolunteerName, Area, Union, Panchayat, Booth, Ward } from '../../hooks/useMasterAPI'
import EntryListHeader from '../../components/entry/EntryListHeader'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import RecordList from '../../components/entry/RecordList'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import { SearchableSelect } from '../../components/entry/SearchableSelect'
import FormActions from '../../components/entry/FormActions'
import { exportTasksCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'
import { useToast } from '../../context/ToastContext'
import { usePermissions } from '../../context/PermissionContext'
import type { EntryRecord } from '../../types/entry.types'

const FORM_ID = 'task-form'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
]

export default function EventEntry() {
  const api       = useEntryAPI()
  const masterApi = useMasterAPI()
  const { showToast } = useToast()
  const { canAdd, canEdit, canDelete } = usePermissions()

  // ── List data ────────────────────────────────────────────────
  const [tasks,      setTasks]      = useState<TaskRecord[]>([])
  const [editing,    setEditing]    = useState<TaskRecord | null>(null)
  const [isFormOpen, setFormOpen]   = useState(false)
  const [search,     setSearch]     = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  // ── Master data ──────────────────────────────────────────────
  const [taskTypes,       setTaskTypes]       = useState<TaskType[]>([])
  const [allCategories,   setAllCategories]   = useState<TaskCategory[]>([])
  const [volunteerRoles,  setVolunteerRoles]  = useState<VolunteerRole[]>([])
  const [deliveryUsers,   setDeliveryUsers]   = useState<VolunteerName[]>([])
  const [coordinatorUsers, setCoordinatorUsers] = useState<VolunteerName[]>([])
  const [blocks,          setBlocks]          = useState<Area[]>([])
  const [allUnions,       setAllUnions]       = useState<Union[]>([])
  const [allPanchayats,   setAllPanchayats]   = useState<Panchayat[]>([])
  const [allBooths,       setAllBooths]       = useState<Booth[]>([])
  const [allWards,        setAllWards]        = useState<Ward[]>([])

  // ── Form controlled-state fields ─────────────────────────────
  const [statusVal,       setStatusVal]       = useState('pending')
  const [taskTypeId,      setTaskTypeId]      = useState('')   // FK string
  const [taskCatId,       setTaskCatId]       = useState('')   // FK string
  const [deliveryRoleId,  setDeliveryRoleId]  = useState('')   // FK string
  const [coordRoleId,     setCoordRoleId]     = useState('')   // FK string
  const [inchargeUserId,  setInchargeUserId]  = useState('')   // Volunteer FK
  const [coordUserId,     setCoordUserId]     = useState('')   // Volunteer FK
  const [selBlock,        setSelBlock]        = useState('')
  const [selUnion,        setSelUnion]        = useState('')
  const [selPanchayat,    setSelPanchayat]    = useState('')
  const [selBooth,        setSelBooth]        = useState('')
  const [selWard,         setSelWard]         = useState('')

  // ── Listing filters (server-side) ─────────────────────────────
  const [listTaskTypeId,   setListTaskTypeId]   = useState('')
  const [listTaskCatId,    setListTaskCatId]    = useState('')
  const [listStatus,       setListStatus]       = useState('')
  const [listBlockId,      setListBlockId]      = useState('')
  const [listUnionId,      setListUnionId]      = useState('')
  const [listPanchayatId,  setListPanchayatId]  = useState('')
  const [listBoothId,      setListBoothId]      = useState('')
  const [listWardId,       setListWardId]       = useState('')

  // ── Uncontrolled refs (simple text/number/date inputs) ───────
  const r = {
    title:     useRef<HTMLInputElement>(null),
    details:   useRef<HTMLTextAreaElement>(null),
    expected:  useRef<HTMLInputElement>(null),
    venue:     useRef<HTMLInputElement>(null),
    qty:       useRef<HTMLInputElement>(null),
    completed: useRef<HTMLInputElement>(null),
    notes:     useRef<HTMLTextAreaElement>(null),
  }

  const pendingCompletedAt = useRef('')
  const pendingFill        = useRef<TaskRecord | null>(null)
  const firstListRender    = useRef(true)

  // ── Load master data on mount ────────────────────────────────
  useEffect(() => {
    loadTasks()
    masterApi.fetchTaskTypes().then(d => d && setTaskTypes(d))
    masterApi.fetchTaskCategories().then(d => d && setAllCategories(d))
    masterApi.fetchVolunteerRoles().then(d => d && setVolunteerRoles(d))
    masterApi.fetchAreas().then(d => d && setBlocks(d))
    masterApi.fetchUnions().then(d => d && setAllUnions(d))
    masterApi.fetchPanchayats().then(d => d && setAllPanchayats(d))
    masterApi.fetchBooths().then(d => d && setAllBooths(d))
    masterApi.fetchWards().then(d => d && setAllWards(d))
  }, [])

  // ── When form opens with pending fill, apply it ──────────────
  useEffect(() => {
    if (isFormOpen && pendingFill.current) {
      fill(pendingFill.current)
      pendingFill.current = null
    }
  }, [isFormOpen])

  // ── Restore completed datetime when status switches ──────────
  useEffect(() => {
    if (statusVal === 'completed' && pendingCompletedAt.current && r.completed.current) {
      r.completed.current.value = pendingCompletedAt.current
      pendingCompletedAt.current = ''
    }
  }, [statusVal])

  // ── Role-driven lookup (Delivery Incharge) ─
  useEffect(() => {
    if (!deliveryRoleId) {
      setDeliveryUsers([])
      return
    }
    const roleName = volunteerRoles.find(vr => String(vr.id) === deliveryRoleId)?.name || ''
    if (!roleName) {
      setDeliveryUsers([])
      return
    }
    masterApi.fetchVolunteerNames(roleName).then(d => {
      if (d) setDeliveryUsers(d)
    })
  }, [deliveryRoleId, volunteerRoles])

  // ── Role-driven lookup (Coordinator) ─
  useEffect(() => {
    if (!coordRoleId) {
      setCoordinatorUsers([])
      return
    }
    const roleName = volunteerRoles.find(vr => String(vr.id) === coordRoleId)?.name || ''
    if (!roleName) {
      setCoordinatorUsers([])
      return
    }
    masterApi.fetchVolunteerNames(roleName).then(d => {
      if (d) setCoordinatorUsers(d)
    })
  }, [coordRoleId, volunteerRoles])

  // ── Derived: categories filtered by selected task type ───────
  const filteredCategories = taskTypeId
    ? allCategories.filter(c => c.task_type != null && String(c.task_type) === taskTypeId)
    : allCategories

  // ── Location dependencies (form) ─────────────────────────────
  const formUnions = selBlock
    ? allUnions.filter(u => String(u.block ?? '') === selBlock)
    : allUnions

  const formPanchayats = selUnion
    ? allPanchayats.filter(p => String(p.union ?? '') === selUnion)
    : selBlock
      ? allPanchayats.filter(p => formUnions.some(u => u.id === p.union))
      : allPanchayats

  const formBooths = selPanchayat
    ? allBooths.filter(b => String(b.panchayat ?? '') === selPanchayat)
    : allBooths

  const formWards = selBooth
    ? (() => {
        const booth = allBooths.find(b => String(b.id) === selBooth)
        if (!booth?.ward) return [] as Ward[]
        return allWards.filter(w => w.id === booth.ward)
      })()
    : allWards

  // ── Location dependencies (listing filters) ──────────────────
  const listUnions = listBlockId
    ? allUnions.filter(u => String(u.block ?? '') === listBlockId)
    : allUnions

  const listPanchayats = listUnionId
    ? allPanchayats.filter(p => String(p.union ?? '') === listUnionId)
    : listBlockId
      ? allPanchayats.filter(p => listUnions.some(u => u.id === p.union))
      : allPanchayats

  const listBooths = listPanchayatId
    ? allBooths.filter(b => String(b.panchayat ?? '') === listPanchayatId)
    : allBooths

  const listWards = listBoothId
    ? (() => {
        const booth = allBooths.find(b => String(b.id) === listBoothId)
        if (!booth?.ward) return [] as Ward[]
        return allWards.filter(w => w.id === booth.ward)
      })()
    : allWards

  // ── Task loader ──────────────────────────────────────────────
  const loadTasks = (overrides?: Partial<Record<string, string>>) => {
    const filters: Record<string, string> = {
      ...(dateFrom       ? { date_from:   dateFrom }       : {}),
      ...(dateTo         ? { date_to:     dateTo }         : {}),
      ...(listTaskTypeId ? { task_type:   listTaskTypeId } : {}),
      ...(listTaskCatId  ? { task_category: listTaskCatId } : {}),
      ...(listStatus     ? { status:      listStatus }     : {}),
      ...(listBlockId    ? { block:       listBlockId }    : {}),
      ...(listUnionId    ? { union:       listUnionId }    : {}),
      ...(listPanchayatId ? { panchayat:  listPanchayatId } : {}),
      ...(listBoothId    ? { booth:       listBoothId }    : {}),
      ...(listWardId     ? { ward:        listWardId }     : {}),
      ...(overrides || {}),
    }
    api.fetchTasks(filters).then(d => d && setTasks(d))
  }

  // Debounced list refresh for filter changes
  useEffect(() => {
    if (firstListRender.current) {
      firstListRender.current = false
      return
    }
    const t = setTimeout(() => loadTasks(), 250)
    return () => clearTimeout(t)
  }, [dateFrom, dateTo, listTaskTypeId, listTaskCatId, listStatus, listBlockId, listUnionId, listPanchayatId, listBoothId, listWardId])

  // ── Fill form when editing ───────────────────────────────────
  const fill = (t: TaskRecord) => {
    if (r.title.current)    r.title.current.value    = t.title
    if (r.details.current)  r.details.current.value  = t.details || ''
    if (r.expected.current) r.expected.current.value = t.expected_datetime
      ? t.expected_datetime.slice(0, 16) : ''
    if (r.venue.current)    r.venue.current.value    = t.venue    || ''
    if (r.qty.current)      r.qty.current.value      = String(t.qty ?? 1)
    if (r.notes.current)    r.notes.current.value    = t.notes    || ''
    // Controlled state
    setTaskTypeId(t.task_type  ? String(t.task_type)  : '')
    setTaskCatId( t.task_category ? String(t.task_category) : '')
    setDeliveryRoleId( t.volunteer_role ? String(t.volunteer_role) : '')
    setCoordRoleId( t.volunteer_role ? String(t.volunteer_role) : '')
    setInchargeUserId(t.delivery_incharge ? String(t.delivery_incharge) : '')
    setCoordUserId(   t.coordinator       ? String(t.coordinator)       : '')
    setSelBlock(    t.block     ? String(t.block)     : '')
    setSelUnion(    t.union     ? String(t.union)     : '')
    setSelPanchayat(t.panchayat ? String(t.panchayat) : '')
    setSelBooth(    t.booth     ? String(t.booth)     : '')
    setSelWard(     t.ward      ? String(t.ward)      : '')
    pendingCompletedAt.current = t.completed_datetime
      ? t.completed_datetime.slice(0, 16) : ''
    setStatusVal(t.status || 'pending')
  }

  // ── Clear form ───────────────────────────────────────────────
  const clear = () => {
    Object.values(r).forEach(ref => { if (ref.current) ref.current.value = '' })
    if (r.qty.current) r.qty.current.value = '1'
    setStatusVal('pending')
    setTaskTypeId(''); setTaskCatId('')
    setDeliveryRoleId(''); setCoordRoleId('')
    setInchargeUserId(''); setCoordUserId('')
    setSelBlock(''); setSelUnion(''); setSelPanchayat(''); setSelBooth(''); setSelWard('')
  }

  // ── Save / Update ────────────────────────────────────────────
  const handleSave = async () => {
    const title = r.title.current?.value.trim() ?? ''
    if (!title)      { showToast('<i class="ph ph-warning"></i> Task title is required.', '#dc2626'); return }
    if (!taskTypeId) { showToast('<i class="ph ph-warning"></i> Task type is required.',  '#dc2626'); return }

    const payload: Partial<TaskRecord> = {
      task_type:         taskTypeId ? Number(taskTypeId) : null,
      title,
      task_category:     taskCatId ? Number(taskCatId) : null,
      details:           r.details.current?.value   || '',
      expected_datetime: r.expected.current?.value  || new Date().toISOString(),
      venue:             r.venue.current?.value     || '',
      block:             selBlock     ? Number(selBlock)     : null,
      union:             selUnion     ? Number(selUnion)     : null,
      panchayat:         selPanchayat ? Number(selPanchayat) : null,
      booth:             selBooth     ? Number(selBooth)     : null,
      ward:              selWard      ? Number(selWard)      : null,
      volunteer_role:    deliveryRoleId ? Number(deliveryRoleId) : null,
      delivery_incharge: inchargeUserId ? Number(inchargeUserId) : null,
      coordinator:       coordUserId    ? Number(coordUserId)    : null,
      qty:               r.qty.current?.value ? Number(r.qty.current.value) : 1,
      status:            statusVal,
      completed_datetime: statusVal === 'completed' && r.completed.current?.value
        ? r.completed.current.value : null,
      notes: r.notes.current?.value || '',
    }

    if (editing) {
      const updated = await api.updateTask(editing.id, payload)
      if (updated) {
        setTasks(prev => prev.map(t => t.id === editing.id ? { ...t, ...updated } : t))
        showToast('<i class="ph ph-check-circle"></i> Task updated!', '#138808')
        setEditing(null); setFormOpen(false); clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update task.', '#dc2626')
      }
    } else {
      const created = await api.createTask(payload)
      if (created) {
        setTasks(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Task saved!', '#138808')
        setFormOpen(false); clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save task.', '#dc2626')
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

  // ── Map task to EntryRecord ──────────────────────────────────
  const mapTask = (t: TaskRecord): EntryRecord => ({
    id:       String(t.id),
    keyField: t.title,
    sub: [
      t.task_type_name     ? `[${t.task_type_name}]`            : '',
      t.task_category_name || t.category || '',
      t.expected_datetime  ? t.expected_datetime.slice(0, 10)   : '—',
      t.delivery_incharge_name ? `Incharge: ${t.delivery_incharge_name}` : '',
      t.coordinator_name       ? `Coord: ${t.coordinator_name}`          : '',
    ].filter(Boolean).join(' · '),
    data: {
      task_type:          String(t.task_type   ?? ''),
      task_category:      String(t.task_category ?? ''),
      status:             t.status,
      block:              String(t.block     ?? ''),
      union:              String(t.union     ?? ''),
      panchayat:          String(t.panchayat ?? ''),
      booth:              String(t.booth     ?? ''),
      ward:               String(t.ward      ?? ''),
      expected_datetime:  t.expected_datetime ?? '',
      venue:              t.venue             ?? '',
      qty:                t.qty != null ? String(t.qty) : '',
      delivery_incharge:  t.delivery_incharge_name ?? '',
      coordinator:        t.coordinator_name       ?? '',
      details:            t.details                ?? '',
      completed_datetime: t.completed_datetime     ?? '',
      notes:              t.notes                  ?? '',
    },
    createdAt: t.created_at || '',
    backendId: t.id,
  })

  // ── Client-side search ───────────────────────────────────────
  const filtered = tasks
    .filter(t => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        t.title.toLowerCase().includes(q) ||
        (t.venue || '').toLowerCase().includes(q) ||
        (t.task_category_name || '').toLowerCase().includes(q) ||
        (t.task_type_name || '').toLowerCase().includes(q)
      )
    })
    .map<EntryRecord>(mapTask)

  const allTaskRecords = tasks.map<EntryRecord>(mapTask)

  // ── Tag for each task row ────────────────────────────────────
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

  // ── Date filter handlers ─────────────────────────────────────
  const handleApplyDateFilter  = () => loadTasks()
  const handleClearDateFilter  = () => {
    setDateFrom('')
    setDateTo('')
  }

  // ── Select options for form dropdowns ───────────────────────
  const taskTypeOpts     = taskTypes.map(tt => ({ value: String(tt.id), label: tt.name }))
  const taskCatOpts      = filteredCategories.map(c => ({ value: String(c.id), label: c.name }))
  const volRoleOpts      = volunteerRoles.map(vr => ({ value: String(vr.id), label: vr.name }))
  const toVolOpts = (vols: VolunteerName[]) => vols.map(v => ({
    value: String(v.id),
    label: `${v.user_name}${v.phone ? ` · ${v.phone}` : ''}`
  }))
  const inchargeOpts = toVolOpts(deliveryUsers)
  const coordinatorOpts = toVolOpts(coordinatorUsers)

  const blockOpts        = blocks.map(b => ({ value: String(b.id), label: b.name }))
  const unionOpts        = formUnions.map(u => ({ value: String(u.id), label: u.name }))
  const panchayatOpts    = formPanchayats.map(p => ({ value: String(p.id), label: p.name }))
  const boothOpts        = formBooths.map(b => ({ value: String(b.id), label: b.name || b.number }))
  const wardOpts         = formWards.map(w => ({ value: String(w.id), label: w.name }))

  const listTaskTypeOpts = taskTypes.map(t => ({ value: String(t.id), label: t.name }))
  const listTaskCatOpts = (
    listTaskTypeId
      ? allCategories.filter(c => c.task_type != null && String(c.task_type) === listTaskTypeId)
      : allCategories
  ).map(c => ({ value: String(c.id), label: c.name }))
  const listBlockOpts     = blocks.map(b => ({ value: String(b.id), label: b.name }))
  const listUnionOpts     = listUnions.map(u => ({ value: String(u.id), label: u.name }))
  const listPanchayatOpts = listPanchayats.map(p => ({ value: String(p.id), label: p.name }))
  const listBoothOpts     = listBooths.map(b => ({ value: String(b.id), label: b.name || b.number }))
  const listWardOpts      = listWards.map(w => ({ value: String(w.id), label: w.name }))

  // ────────────────────────────────────────────────────────────
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Task Management"
          icon="ph ph-clipboard-text"
          count={tasks.length}
          onAddNew={canAdd('event') ? () => { setEditing(null); clear(); setFormOpen(true) } : undefined}
          addLabel="Add Task"
        />
        <div className="px-[18px] py-[14px]">

          {/* ── Date filter bar ──────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-navy-light rounded-lg border border-border">
            <span className="text-[10px] font-bold text-navy uppercase tracking-[0.6px] flex items-center gap-1">
              <i className="ph ph-calendar-blank" /> Date Filter
            </span>
            <div className="flex items-center gap-1">
              <label className="text-[10px] text-muted">From</label>
              <input
                type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="form-input py-[4px] text-[11px] w-[130px]"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] text-muted">To</label>
              <input
                type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="form-input py-[4px] text-[11px] w-[130px]"
              />
            </div>
            <button
              onClick={handleApplyDateFilter}
              className="px-[10px] py-[4px] text-[10px] font-bold uppercase tracking-[0.6px]
                         bg-navy text-white rounded hover:bg-navy/80 transition-all"
            >
              <i className="ph ph-funnel mr-1" />Apply
            </button>
            {(dateFrom || dateTo) && (
              <button
                onClick={handleClearDateFilter}
                className="px-[10px] py-[4px] text-[10px] font-bold uppercase tracking-[0.6px]
                           border border-border text-muted rounded hover:border-kampr hover:text-kampr transition-all"
              >
                <i className="ph ph-x mr-1" />Clear
              </button>
            )}
          </div>

          {/* ── Task/location filter bar ───────────────────── */}
          <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-[#f8fafc] rounded-lg border border-border">
            <span className="text-[10px] font-bold text-navy uppercase tracking-[0.6px] flex items-center gap-1">
              <i className="ph ph-faders-horizontal" /> Filters
            </span>

            <div className="min-w-[180px] flex-1">
              <SearchableSelect
                value={listTaskTypeId}
                onChange={v => {
                  setListTaskTypeId(v)
                  setListTaskCatId('')
                }}
                options={listTaskTypeOpts}
                placeholder="All Task Types"
              />
            </div>

            <div className="min-w-[180px] flex-1">
              <SearchableSelect
                value={listTaskCatId}
                onChange={setListTaskCatId}
                options={listTaskCatOpts}
                placeholder={listTaskTypeId ? 'All Categories' : 'Select Task Type first'}
                disabled={!listTaskTypeId}
              />
            </div>

            <div className="min-w-[150px]">
              <SearchableSelect
                value={listStatus}
                onChange={setListStatus}
                options={STATUS_OPTIONS}
                placeholder="All Status"
              />
            </div>

            <div className="min-w-[150px]">
              <SearchableSelect
                value={listBlockId}
                onChange={v => {
                  setListBlockId(v)
                  setListUnionId('')
                  setListPanchayatId('')
                  setListBoothId('')
                  setListWardId('')
                }}
                options={listBlockOpts}
                placeholder="All Blocks"
              />
            </div>

            <div className="min-w-[150px]">
              <SearchableSelect
                value={listUnionId}
                onChange={v => {
                  setListUnionId(v)
                  setListPanchayatId('')
                  setListBoothId('')
                  setListWardId('')
                }}
                options={listUnionOpts}
                placeholder="All Unions"
              />
            </div>

            <div className="min-w-[170px]">
              <SearchableSelect
                value={listPanchayatId}
                onChange={v => {
                  setListPanchayatId(v)
                  setListBoothId('')
                  setListWardId('')
                }}
                options={listPanchayatOpts}
                placeholder="All Panchayats"
              />
            </div>

            <div className="min-w-[170px]">
              <SearchableSelect
                value={listBoothId}
                onChange={v => {
                  setListBoothId(v)
                  setListWardId('')
                }}
                options={listBoothOpts}
                placeholder="All Booths"
              />
            </div>

            <div className="min-w-[150px]">
              <SearchableSelect
                value={listWardId}
                onChange={setListWardId}
                options={listWardOpts}
                placeholder="All Wards"
              />
            </div>

            {(listTaskTypeId || listTaskCatId || listStatus || listBlockId || listUnionId || listPanchayatId || listBoothId || listWardId) && (
              <button
                onClick={() => {
                  setListTaskTypeId('')
                  setListTaskCatId('')
                  setListStatus('')
                  setListBlockId('')
                  setListUnionId('')
                  setListPanchayatId('')
                  setListBoothId('')
                  setListWardId('')
                }}
                className="px-[10px] py-[4px] text-[10px] font-bold uppercase tracking-[0.6px]
                           border border-border text-muted rounded hover:border-kampr hover:text-kampr transition-all"
              >
                <i className="ph ph-x mr-1" />Clear
              </button>
            )}
          </div>

          <EntrySearchToolbar
            placeholder="Search tasks..."
            value={search}
            onChange={setSearch}
            onExport={() => exportTasksCsv(tasks)}
            onPrint={() => printModule(allTaskRecords, 'Task Management')}
          />
          <RecordList
            records={filtered}
            editingId={editing ? String(editing.id) : null}
            emptyMsg='No tasks yet. Click "Add Task" to begin.'
            icon="ph ph-clipboard-text"
            iconBg="#ede9fe"
            iconColor="#7c3aed"
            onEdit={canEdit('event') ? handleEdit : undefined}
            onDelete={canDelete('event') ? handleDelete : undefined}
            getTag={getTaskTag}
          />
        </div>
      </div>

      {/* ── Entry Form ────────────────────────────────────────── */}
      <EntryFormPanel
        id={FORM_ID}
        title="Task Management"
        icon="ph ph-clipboard-text"
        isOpen={isFormOpen}
        isEditing={!!editing}
        onClose={() => { setFormOpen(false); setEditing(null); clear() }}
      >
        {/* Row 1: Task Type · Task Title */}
        <FormRow cols={2}>
          <FormGroup label="Task Type" required>
            <SearchableSelect
              value={taskTypeId}
              onChange={v => { setTaskTypeId(v); setTaskCatId('') }}
              options={taskTypeOpts}
              placeholder="— Select Task Type —"
            />
          </FormGroup>
          <FormGroup label="Task Title" required>
            <input ref={r.title} className={inputCls} placeholder="Task name" />
          </FormGroup>
        </FormRow>

        {/* Row 2: Task Category · Expected Date & Time · Status */}
        <FormRow cols={3}>
          <FormGroup label="Task Category">
            <SearchableSelect
              value={taskCatId}
              onChange={setTaskCatId}
              options={taskCatOpts}
              placeholder={taskTypeId ? '— Select Category —' : '— Select Task Type first —'}
              disabled={!taskTypeId}
            />
          </FormGroup>
          <FormGroup label="Expected Delivery Date &amp; Time" required>
            <input ref={r.expected} type="datetime-local" className={inputCls} />
          </FormGroup>
          <FormGroup label="Status" required>
            <select className={selectCls} value={statusVal} onChange={e => setStatusVal(e.target.value)}>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </FormGroup>
        </FormRow>

        {/* ── Location (optional) ──────────────────────────── */}
        <div className="mt-[6px] mb-[2px]">
          <span className="text-[9px] font-bold text-muted uppercase tracking-[0.7px] flex items-center gap-1">
            <i className="ph ph-map-pin" /> Location <span className="font-normal normal-case">(optional)</span>
          </span>
        </div>
        <FormRow cols={3}>
          <FormGroup label="Block">
            <SearchableSelect
              value={selBlock}
              onChange={v => {
                setSelBlock(v)
                setSelUnion('')
                setSelPanchayat('')
                setSelBooth('')
                setSelWard('')
              }}
              options={blockOpts}
              placeholder="— Select Block —"
            />
          </FormGroup>
          <FormGroup label="Union">
            <SearchableSelect
              value={selUnion}
              onChange={v => {
                setSelUnion(v)
                setSelPanchayat('')
                setSelBooth('')
                setSelWard('')
              }}
              options={unionOpts}
              placeholder="— Select Union —"
            />
          </FormGroup>
          <FormGroup label="Panchayat">
            <SearchableSelect
              value={selPanchayat}
              onChange={v => {
                setSelPanchayat(v)
                setSelBooth('')
                setSelWard('')
              }}
              options={panchayatOpts}
              placeholder="— Select Panchayat —"
            />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Booth">
            <SearchableSelect
              value={selBooth}
              onChange={v => {
                setSelBooth(v)
                setSelWard('')
              }}
              options={boothOpts}
              placeholder="— Select Booth —"
            />
          </FormGroup>
          <FormGroup label="Ward">
            <SearchableSelect
              value={selWard}
              onChange={setSelWard}
              options={wardOpts}
              placeholder="— Select Ward —"
            />
          </FormGroup>
        </FormRow>

        {/* ── Task Details ─────────────────────────────────── */}
        <FormRow cols={1}>
          <FormGroup label="Task Details">
            <textarea ref={r.details} className={textareaCls} placeholder="Describe the task..." />
          </FormGroup>
        </FormRow>

        {/* Row: Venue · Qty */}
        <FormRow cols={2}>
          <FormGroup label="Venue / Location">
            <input ref={r.venue} className={inputCls} placeholder="Where will this be done?" />
          </FormGroup>
          <FormGroup label="Qty">
            <input ref={r.qty} type="number" className={inputCls} placeholder="1" min="1" defaultValue="1" />
          </FormGroup>
        </FormRow>

        {/* Row: Delivery Agent Role · Delivery Incharge */}
        <FormRow cols={2}>
          <FormGroup label="Delivery Agent Role">
            <SearchableSelect
              value={deliveryRoleId}
              onChange={v => {
                setDeliveryRoleId(v)
                setInchargeUserId('')
              }}
              options={volRoleOpts}
              placeholder="— Select Role —"
            />
          </FormGroup>
          <FormGroup label="Delivery Incharge">
            <SearchableSelect
              value={inchargeUserId}
              onChange={setInchargeUserId}
              options={inchargeOpts}
              placeholder={deliveryRoleId ? '— Select Incharge —' : '— Select Delivery Role first —'}
              disabled={!deliveryRoleId}
            />
          </FormGroup>
        </FormRow>

        {/* Row: Coordinator Role · Co-ordinator */}
        <FormRow cols={2}>
          <FormGroup label="Coordinator Role">
            <SearchableSelect
              value={coordRoleId}
              onChange={v => {
                setCoordRoleId(v)
                setCoordUserId('')
              }}
              options={volRoleOpts}
              placeholder="— Select Role —"
            />
          </FormGroup>
          <FormGroup label="Co-ordinator">
            <SearchableSelect
              value={coordUserId}
              onChange={setCoordUserId}
              options={coordinatorOpts}
              placeholder={coordRoleId ? '— Select Co-ordinator —' : '— Select Coordinator Role first —'}
              disabled={!coordRoleId}
            />
          </FormGroup>
        </FormRow>

        {/* Completed datetime (conditional) */}
        {statusVal === 'completed' && (
          <FormRow cols={2}>
            <FormGroup label="Completed Date &amp; Time">
              <input ref={r.completed} type="datetime-local" className={inputCls} />
            </FormGroup>
          </FormRow>
        )}

        {/* Notes */}
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
