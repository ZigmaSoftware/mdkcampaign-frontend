import { useRef, useState, useEffect } from 'react'
import apiClient from '../../utils/api'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { ActivityLogRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Booth, Ward } from '../../hooks/useMasterAPI'
import { useAuthContext } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usePermissions } from '../../context/PermissionContext'
import EntryListHeader from '../../components/entry/EntryListHeader'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'
import { exportRecordsToCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'
import { todayISO } from '../../utils/formatters'
import type { EntryModuleId } from '../../types/nav.types'
import type { EntryRecord } from '../../types/entry.types'

const toEntryRecord = (rec: ActivityLogRecord): EntryRecord => ({
  id: String(rec.id),
  keyField: rec.activity_type,
  sub: `${rec.date} · ${rec.village || '—'} · Booth ${rec.booth_no || '—'}${rec.hours_worked != null ? ` · ${rec.hours_worked} hrs` : ''}`,
  data: {
    category:      rec.category,
    activity_type: rec.activity_type,
    date:          rec.date,
    village:       rec.village      || '',
    booth_no:      rec.booth_no     || '',
    hours_worked:  String(rec.hours_worked ?? ''),
    notes:         rec.notes        || '',
    username:      rec.username     || '',
    user_role:     rec.user_role    || '',
  },
  createdAt: rec.created_at || '',
})

const CATEGORY_MAP: Record<string, 'agent' | 'field' | 'volunteer'> = {
  'agent-activity': 'agent',
  'field-activity': 'field',
  'volunteer-activity': 'volunteer',
}

interface ActivityEntryBaseProps {
  moduleId: EntryModuleId
  title: string
  icon: string
  addLabel: string
  saveLabel: string
  listTitle: string
  emptyMsg: string
  iconBg: string
  iconColor: string
  activityTypes: string[]
  userIdPrefix: string
  showVolunteerAssign?: boolean
}

export default function ActivityEntryBase({
  moduleId, title, icon, addLabel, saveLabel,
  listTitle, emptyMsg, iconBg, iconColor, activityTypes, userIdPrefix, showVolunteerAssign,
}: ActivityEntryBaseProps) {
  const { fetchActivityLogs, createActivityLog, updateActivityLog, deleteActivityLog } = useEntryAPI()
  const masterApi = useMasterAPI()
  const { user } = useAuthContext()
  const { showToast } = useToast()
  const { canAdd, canEdit, canDelete } = usePermissions()

  const [booths,     setBooths]     = useState<Booth[]>([])
  const [wards,      setWards]      = useState<Ward[]>([])
  const [volunteers, setVolunteers] = useState<{ id: number; name: string; role?: string }[]>([])

  const category = CATEGORY_MAP[moduleId] ?? 'agent'
  const username = user?.username ?? ''
  const role     = user?.role === 'admin' ? 'Admin' : 'Booth Agent'
  const userId   = `${userIdPrefix}-${username.toUpperCase()}`

  const [records, setRecords]     = useState<ActivityLogRecord[]>([])
  const [search, setSearch]       = useState('')
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [filterType,   setFilterType]   = useState('')
  const [filterWard,   setFilterWard]   = useState('')
  const [filterBooth,  setFilterBooth]  = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const pendingFill = useRef<Record<string, string> | null>(null)

  const r = {
    activityType: useRef<HTMLSelectElement>(null),
    date:         useRef<HTMLInputElement>(null),
    hoursWorked:  useRef<HTMLInputElement>(null),
    village:      useRef<HTMLSelectElement>(null),
    booth:        useRef<HTMLSelectElement>(null),
    notes:        useRef<HTMLTextAreaElement>(null),
    volunteer:    useRef<HTMLSelectElement>(null),
  }

  useEffect(() => {
    fetchActivityLogs(category).then(res => { if (res) setRecords(res) })
    masterApi.fetchBooths().then(d => d && setBooths(d))
    masterApi.fetchWards().then(d => d && setWards(d))
    if (showVolunteerAssign) {
      apiClient.get('/volunteers/volunteers/', { params: { status: 'active', limit: 500 } })
        .then(res => setVolunteers(res.data.results ?? []))
        .catch(() => {})
    }
  }, [category])

  useEffect(() => {
    if (isFormOpen && pendingFill.current) {
      const d = pendingFill.current
      if (r.activityType.current) r.activityType.current.value = d.activityType ?? ''
      if (r.date.current)         r.date.current.value         = d.date         ?? todayISO()
      if (r.hoursWorked.current)  r.hoursWorked.current.value  = d.hoursWorked  ?? ''
      if (r.village.current)      r.village.current.value      = d.village      ?? ''
      if (r.booth.current)        r.booth.current.value        = d.booth        ?? ''
      if (r.notes.current)        r.notes.current.value        = d.notes        ?? ''
      if (r.volunteer.current)    r.volunteer.current.value    = d.volunteer    ?? ''
      pendingFill.current = null
    }
  }, [isFormOpen, editingId])

  const clear = () => {
    if (r.activityType.current) r.activityType.current.value = ''
    if (r.date.current)         r.date.current.value         = todayISO()
    if (r.hoursWorked.current)  r.hoursWorked.current.value  = ''
    if (r.village.current)      r.village.current.value      = ''
    if (r.booth.current)        r.booth.current.value        = ''
    if (r.notes.current)        r.notes.current.value        = ''
    if (r.volunteer.current)    r.volunteer.current.value    = ''
  }

  const collect = () => {
    const volunteerId = r.volunteer.current?.value ?? ''
    const volunteerRec = volunteers.find(v => String(v.id) === volunteerId)
    return {
      category,
      username,
      user_role: role,
      activity_type: r.activityType.current?.value ?? '',
      date:          r.date.current?.value         ?? todayISO(),
      hours_worked:  r.hoursWorked.current?.value  ? Number(r.hoursWorked.current.value) : undefined,
      village:       r.village.current?.value      ?? '',
      booth_no:      r.booth.current?.value        ?? '',
      notes:         r.notes.current?.value        ?? '',
      ...(showVolunteerAssign && volunteerRec ? { assigned_to: volunteerRec.name ?? String(volunteerRec.id) } : {}),
    }
  }

  const handleSave = async () => {
    const d = collect()
    if (!d.activity_type) {
      showToast('<i class="ph ph-warning"></i> Please select an activity type!', '#dc2626')
      return
    }
    if (editingId !== null) {
      const updated = await updateActivityLog(editingId, d)
      if (updated) {
        setRecords(prev => prev.map(r => r.id === editingId ? updated : r))
        setEditingId(null)
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update log. Please check all required fields.', '#dc2626')
      }
    } else {
      const created = await createActivityLog(d)
      if (created) {
        setRecords(prev => [created, ...prev])
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save log. Please check all required fields.', '#dc2626')
      }
    }
  }

  const handleEdit = (id: number) => {
    const rec = records.find(r => r.id === id)
    if (!rec) return
    const assignedVol = volunteers.find(v => (v.name ?? String(v.id)) === rec.assigned_to)
    pendingFill.current = {
      activityType: rec.activity_type ?? '',
      date:         rec.date          ?? todayISO(),
      hoursWorked:  rec.hours_worked != null ? String(rec.hours_worked) : '',
      village:      rec.village       ?? '',
      booth:        rec.booth_no      ?? '',
      notes:        rec.notes         ?? '',
      volunteer:    assignedVol ? String(assignedVol.id) : '',
    }
    setEditingId(id)
    setFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const ok = await deleteActivityLog(id)
    if (ok) setRecords(prev => prev.filter(r => r.id !== id))
  }

  const filtered = records.filter(rec => {
    const q = search.toLowerCase()
    const matchSearch = !q || (
      rec.activity_type?.toLowerCase().includes(q) ||
      rec.village?.toLowerCase().includes(q) ||
      rec.booth_no?.toLowerCase().includes(q) ||
      rec.notes?.toLowerCase().includes(q)
    )
    const matchType  = !filterType  || rec.activity_type === filterType
    const matchWard  = !filterWard  || rec.village === filterWard
    const matchBooth = !filterBooth || rec.booth_no === filterBooth
    return matchSearch && matchType && matchWard && matchBooth
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const clearFilters = () => { setFilterType(''); setFilterWard(''); setFilterBooth(''); setPage(1) }
  const activeFilters = [filterType, filterWard, filterBooth].filter(Boolean).length

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title={listTitle} icon={icon} count={records.length}
          onAddNew={canAdd(moduleId) ? () => { setEditingId(null); clear(); setFormOpen(true) } : undefined} addLabel={addLabel}
        />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search} onChange={setSearch}
            onExport={() => exportRecordsToCsv(records.map(toEntryRecord), title.replace(/\s+/g, '_'))}
            onPrint={() => printModule(records.map(toEntryRecord), title)}
          />
          {/* ── Filter bar ── */}
          <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-border">
            <span className="text-[10px] font-bold text-muted uppercase tracking-[0.6px] mr-1">Filter:</span>
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(1) }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[130px] w-auto ${filterType ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Types</option>
              {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filterWard}
              onChange={e => { setFilterWard(e.target.value); setPage(1) }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[110px] w-auto ${filterWard ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Wards</option>
              {wards.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
            </select>
            <select
              value={filterBooth}
              onChange={e => { setFilterBooth(e.target.value); setPage(1) }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[110px] w-auto ${filterBooth ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Booths</option>
              {booths.map(b => <option key={b.id} value={b.number}>{b.number} — {b.name}</option>)}
            </select>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="text-[10px] font-bold text-kampr hover:text-red-700 flex items-center gap-1 ml-1">
                <i className="ph ph-x-circle" /> Clear
              </button>
            )}
            <span className="ml-auto text-[10px] text-muted">{filtered.length} records</span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
              <i className={`${icon} text-[32px]`} style={{ color: iconColor }} />
              <p className="text-[13px]">{activeFilters > 0 ? 'No records match the selected filters.' : emptyMsg}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 mt-3">
                {paged.map(rec => (
                  <div key={rec.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-white hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                        <i className={`${icon} text-[17px]`} style={{ color: iconColor }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-navy">{rec.activity_type}</p>
                        <p className="text-[11px] text-muted">{rec.date} · {rec.village || '—'} · Booth {rec.booth_no || '—'}{rec.hours_worked ? ` · ${rec.hours_worked} hrs` : ''}{rec.assigned_to ? ` · Assigned: ${rec.assigned_to}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canEdit(moduleId) && (
                        <button onClick={() => handleEdit(rec.id)} className="p-[7px] rounded-lg hover:bg-[#f0f4ff] text-navy transition-colors">
                          <i className="ph ph-pencil text-[14px]" />
                        </button>
                      )}
                      {canDelete(moduleId) && (
                        <button onClick={() => handleDelete(rec.id)} className="p-[7px] rounded-lg hover:bg-[#fff0f0] text-kampr transition-colors">
                          <i className="ph ph-trash text-[14px]" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-muted text-[10px]">
                    {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(1)} disabled={safePage === 1}
                      className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all">
                      <i className="ph ph-caret-double-left" />
                    </button>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                      className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all">
                      <i className="ph ph-caret-left" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                        acc.push(p); return acc
                      }, [])
                      .map((p, i) => p === '…'
                        ? <span key={`ell-${i}`} className="px-1 text-[10px] text-muted">…</span>
                        : <button key={p} onClick={() => setPage(p as number)}
                            className={`px-2 py-1 text-[10px] font-bold rounded border transition-all ${safePage === p ? 'bg-navy border-navy text-white' : 'border-border text-muted hover:border-saffron hover:text-navy'}`}>
                            {p}
                          </button>
                      )}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                      className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all">
                      <i className="ph ph-caret-right" />
                    </button>
                    <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                      className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all">
                      <i className="ph ph-caret-double-right" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <EntryFormPanel
        id={`${moduleId}-form`} title={title} icon={icon}
        isOpen={isFormOpen} isEditing={editingId !== null}
        onClose={() => { setFormOpen(false); setEditingId(null); clear() }}
      >
        {/* ── User info (read-only) ── */}
        <div className="bg-[#f8fafc] border border-border rounded-[10px] px-4 py-3 mb-4">
          <FormRow cols={2}>
            <FormGroup label="User ID">
              <input className={inputCls + ' bg-[#f0f4f8] text-muted cursor-not-allowed'} value={userId} readOnly />
            </FormGroup>
            <FormGroup label="Username" required>
              <input className={inputCls + ' bg-[#f0f4f8] text-muted cursor-not-allowed'} value={username} readOnly />
            </FormGroup>
          </FormRow>
          <FormRow cols={1}>
            <FormGroup label="Role">
              <input className={inputCls + ' bg-[#f0f4f8] text-muted cursor-not-allowed'} value={role} readOnly />
            </FormGroup>
          </FormRow>
        </div>

        {/* ── Activity Details ── */}
        <div className="flex items-center gap-2 mb-3">
          <i className={`${icon} text-saffron text-[14px]`} />
          <span className="text-[11px] font-bold text-navy uppercase tracking-[1px]">Activity Details</span>
        </div>

        <FormRow cols={1}>
          <FormGroup label="Activity Type" required>
            <select ref={r.activityType} className={selectCls}>
              <option value="">Select activity type</option>
              {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Date" required>
            <input ref={r.date} type="date" className={inputCls} defaultValue={todayISO()} />
          </FormGroup>
          <FormGroup label="Hours Worked">
            <input ref={r.hoursWorked} type="number" min="0" max="24" className={inputCls} placeholder="e.g. 4" />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Ward">
            <select ref={r.village} className={selectCls}>
              <option value="">Select Ward</option>
              {wards.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Booth No.">
            <select ref={r.booth} className={selectCls}>
              <option value="">Select booth</option>
              {booths.map(b => <option key={b.id} value={b.number}>{b.number} — {b.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>

        {showVolunteerAssign && (
          <FormRow cols={1}>
            <FormGroup label="Assign Volunteer">
              <select ref={r.volunteer} className={selectCls}>
                <option value="">— Select volunteer —</option>
                {volunteers.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name ?? `Volunteer #${v.id}`}{v.role ? ` (${v.role})` : ''}
                  </option>
                ))}
              </select>
            </FormGroup>
          </FormRow>
        )}

        <FormRow cols={1}>
          <FormGroup label="Activity Notes">
            <textarea ref={r.notes} className={textareaCls} rows={3} placeholder="Describe what was done, any observations..." />
          </FormGroup>
        </FormRow>

        <FormActions onSave={handleSave} onClear={clear} saveLabel={saveLabel} isEditing={editingId !== null} />
      </EntryFormPanel>
    </div>
  )
}
