import { useRef } from 'react'
import { useEntryModule } from '../../hooks/useEntryModule'
import { useAuth } from '../../context/AuthContext'
import EntryListHeader from '../../components/entry/EntryListHeader'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import RecordList from '../../components/entry/RecordList'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'
import { exportRecordsToCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'
import { todayISO } from '../../utils/formatters'
import type { EntryModuleId } from '../../types/nav.types'

interface ActivityEntryBaseProps {
  moduleId: EntryModuleId
  formId: string
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
}

export default function ActivityEntryBase({
  moduleId, formId, title, icon, addLabel, saveLabel,
  listTitle, emptyMsg, iconBg, iconColor, activityTypes, userIdPrefix,
}: ActivityEntryBaseProps) {
  const em = useEntryModule(moduleId, formId)
  const { currentUser } = useAuth()

  const userId   = `${userIdPrefix}-${(currentUser?.username ?? 'USER').toUpperCase()}`
  const username = currentUser?.username ?? ''
  const role     = currentUser?.role === 'admin' ? 'Admin' : 'Booth Agent'

  const r = {
    activityType: useRef<HTMLSelectElement>(null),
    date:         useRef<HTMLInputElement>(null),
    hoursWorked:  useRef<HTMLInputElement>(null),
    village:      useRef<HTMLInputElement>(null),
    booth:        useRef<HTMLInputElement>(null),
    notes:        useRef<HTMLTextAreaElement>(null),
  }

  const fill = (data: Record<string, string>) =>
    Object.entries(r).forEach(([k, ref]) => { if (ref.current) ref.current.value = data[k] ?? '' })

  const clear = () => {
    fill({})
    if (r.date.current) r.date.current.value = todayISO()
  }

  const collect = () => ({
    userId,
    username,
    role,
    ...Object.fromEntries(Object.entries(r).map(([k, ref]) => [k, ref.current?.value ?? ''])),
  })

  const handleSave = () => {
    const d = collect()
    if (!d.activityType) return
    em.saveRecord(
      `${d.activityType} · ${d.date}`,
      `${username} · ${d.village || '—'} · Booth ${d.booth || '—'} · ${d.hoursWorked ? d.hoursWorked + ' hrs' : ''}`,
      d,
    )
    clear()
  }

  const handleEdit = (id: string) => {
    const rec = em.startEdit(id)
    if (rec) fill(rec.data)
  }

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title={listTitle} icon={icon} count={em.records.length}
          onAddNew={em.openForm} addLabel={addLabel}
        />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder={`Search ${title.toLowerCase()}...`}
            value={em.searchQuery} onChange={em.setSearch}
            onExport={() => exportRecordsToCsv(em.records, title)}
            onPrint={() => printModule(em.records, title)}
          />
          <RecordList
            records={em.filtered} editingId={em.editingId}
            emptyMsg={emptyMsg} icon={icon} iconBg={iconBg} iconColor={iconColor}
            onEdit={handleEdit} onDelete={em.deleteRecord}
          />
        </div>
      </div>

      <EntryFormPanel id={formId} title={title} icon={icon} isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>

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
              {activityTypes.map(t => <option key={t}>{t}</option>)}
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
          <FormGroup label="Village / Ward">
            <input ref={r.village} className={inputCls} placeholder="Ward / village" />
          </FormGroup>
          <FormGroup label="Booth No.">
            <input ref={r.booth} className={inputCls} placeholder="Booth covered" />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Activity Notes">
            <textarea ref={r.notes} className={textareaCls} rows={3} placeholder="Describe what was done, any observations..." />
          </FormGroup>
        </FormRow>

        <FormActions onSave={handleSave} onClear={clear} saveLabel={saveLabel} isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}
