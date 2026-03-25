import React, { useRef } from 'react'
import { useEntryModule } from '../../hooks/useEntryModule'
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

const FORM_ID = 'volunteer-form'

export default function VolunteerEntry() {
  const em = useEntryModule('volunteer', FORM_ID)

  const r = {
    name:    useRef<HTMLInputElement>(null),
    phone:   useRef<HTMLInputElement>(null),
    phone2:  useRef<HTMLInputElement>(null),
    block:   useRef<HTMLSelectElement>(null),
    village: useRef<HTMLInputElement>(null),
    booth:   useRef<HTMLInputElement>(null),
    role:    useRef<HTMLSelectElement>(null),
    age:     useRef<HTMLInputElement>(null),
    gender:  useRef<HTMLSelectElement>(null),
    joined:  useRef<HTMLInputElement>(null),
    source:  useRef<HTMLSelectElement>(null),
    skills:  useRef<HTMLInputElement>(null),
    vehicle:    useRef<HTMLSelectElement>(null),
    status:     useRef<HTMLSelectElement>(null),
    supervisor: useRef<HTMLInputElement>(null),
    supphone:   useRef<HTMLInputElement>(null),
    enrollvia:  useRef<HTMLSelectElement>(null),
    wastatus:   useRef<HTMLSelectElement>(null),
    notes:      useRef<HTMLTextAreaElement>(null),
  }

  const fill = (data: Record<string, string>) =>
    Object.entries(r).forEach(([k, ref]) => { if (ref.current) ref.current.value = data[k] ?? '' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k, ref]) => [k, ref.current?.value ?? '']))

  const handleSave = () => {
    const d = collect()
    if (!d.name) return
    em.saveRecord(
      d.name,
      `${d.role || '—'} · ${d.block || '—'} · ${d.phone || ''} · ${d.status || 'Active'}`,
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
        <EntryListHeader title="Volunteer Records" icon="ph ph-users-three" count={em.records.length} onAddNew={em.openForm} addLabel="Add Volunteer" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search volunteers..." value={em.searchQuery} onChange={em.setSearch}
            onExport={() => exportRecordsToCsv(em.records, 'Volunteers')}
            onPrint={() => printModule(em.records, 'Volunteers')} />
          <RecordList records={em.filtered} editingId={em.editingId}
            emptyMsg='No volunteer records yet. Click "Add Volunteer" to begin.'
            icon="ph ph-users-three" iconBg="#dcfce7" iconColor="#0d6606"
            onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id={FORM_ID} title="Volunteer" icon="ph ph-users-three" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Full Name" required><input ref={r.name} className={inputCls} placeholder="Volunteer name" /></FormGroup>
          <FormGroup label="Phone" required><input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" /></FormGroup>
          <FormGroup label="Alt. Phone"><input ref={r.phone2} type="tel" className={inputCls} placeholder="Optional" /></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Block" required><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
          <FormGroup label="Village / Ward"><input ref={r.village} className={inputCls} placeholder="Village name" /></FormGroup>
          <FormGroup label="Booth No."><input ref={r.booth} className={inputCls} placeholder="001" /></FormGroup>
          <FormGroup label="Role" required><select ref={r.role} className={selectCls}><option value="">Select</option><option>Booth Agent</option><option>Street Captain</option><option>Village Coordinator</option><option>WhatsApp Coordinator</option><option>Women Wing Member</option><option>Youth Wing Member</option><option>Data Entry Operator</option><option>Driver / Vehicle Support</option><option>Event Coordinator</option><option>General Volunteer</option></select></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Age"><input ref={r.age} type="number" className={inputCls} placeholder="Age" /></FormGroup>
          <FormGroup label="Gender"><select ref={r.gender} className={selectCls}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></FormGroup>
          <FormGroup label="Joined Date"><input ref={r.joined} type="date" className={inputCls} defaultValue={todayISO()} /></FormGroup>
          <FormGroup label="Source / How Enrolled"><select ref={r.source} className={selectCls}><option value="">Select</option><option>WhatsApp Drive</option><option>Door-to-door</option><option>Party Event</option><option>Personal Reference</option><option>Social Media</option><option>NaMo App</option></select></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Skills / Expertise"><input ref={r.skills} className={inputCls} placeholder="e.g. Driving, Social media, Data entry" /></FormGroup>
          <FormGroup label="Own Vehicle"><select ref={r.vehicle} className={selectCls}><option value="">Select</option><option>Two-Wheeler</option><option>Four-Wheeler</option><option>Auto</option><option>None</option></select></FormGroup>
          <FormGroup label="Status"><select ref={r.status} className={selectCls}><option>Active</option><option>Inactive</option><option>Suspended</option></select></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Supervisor / Team Lead"><input ref={r.supervisor} className={inputCls} placeholder="Team lead name" /></FormGroup>
          <FormGroup label="Team Lead Phone"><input ref={r.supphone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" /></FormGroup>
          <FormGroup label="Enrol Via"><select ref={r.enrollvia} className={selectCls}><option value="">Select</option><option>WhatsApp Drive</option><option>Door-to-door</option><option>Party Event</option><option>Personal Reference</option><option>Social Media</option><option>NaMo App</option><option>Walk-in</option></select></FormGroup>
          <FormGroup label="WhatsApp Status"><select ref={r.wastatus} className={selectCls}><option value="">Select</option><option>Yes</option><option>No</option></select></FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Notes"><textarea ref={r.notes} className={textareaCls} placeholder="Any notes about this volunteer..." /></FormGroup>
        </FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Volunteer" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}
