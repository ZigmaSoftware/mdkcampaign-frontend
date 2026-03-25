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

const FORM_ID = 'event-form'

export default function EventEntry() {
  const em = useEntryModule('event', FORM_ID)

  const r = {
    title:     useRef<HTMLInputElement>(null),
    type:      useRef<HTMLSelectElement>(null),
    date:      useRef<HTMLInputElement>(null),
    time:      useRef<HTMLInputElement>(null),
    endtime:   useRef<HTMLInputElement>(null),
    block:     useRef<HTMLSelectElement>(null),
    venue:     useRef<HTMLInputElement>(null),
    organiser: useRef<HTMLInputElement>(null),
    expected:  useRef<HTMLInputElement>(null),
    actual:    useRef<HTMLInputElement>(null),
    chief:     useRef<HTMLInputElement>(null),
    budget:    useRef<HTMLInputElement>(null),
    spent:     useRef<HTMLInputElement>(null),
    status:    useRef<HTMLSelectElement>(null),
    materials: useRef<HTMLTextAreaElement>(null),
    vols:      useRef<HTMLTextAreaElement>(null),
    notes:     useRef<HTMLTextAreaElement>(null),
  }

  const fill = (data: Record<string, string>) =>
    Object.entries(r).forEach(([k, ref]) => { if (ref.current) ref.current.value = data[k] ?? '' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k, ref]) => [k, ref.current?.value ?? '']))

  const handleSave = () => {
    const d = collect()
    if (!d.title) return
    em.saveRecord(
      d.title,
      `${d.date || '—'} · ${d.block || '—'} · ${d.venue || ''} · ${d.status || ''}`,
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
        <EntryListHeader title="Events List" icon="ph ph-calendar" count={em.records.length} onAddNew={em.openForm} addLabel="Add Event" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search events..." value={em.searchQuery} onChange={em.setSearch}
            onExport={() => exportRecordsToCsv(em.records, 'Event_Mgmt')}
            onPrint={() => printModule(em.records, 'Event Management')} />
          <RecordList records={em.filtered} editingId={em.editingId}
            emptyMsg='No events yet. Click "Add Event" to begin.'
            icon="ph ph-calendar" iconBg="#ede9fe" iconColor="#7c3aed"
            onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id={FORM_ID} title="Event Management" icon="ph ph-calendar" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Event Title" required><input ref={r.title} className={inputCls} placeholder="Event name" /></FormGroup>
          <FormGroup label="Event Type" required><select ref={r.type} className={selectCls}><option value="">Select</option><option>Rally</option><option>Corner Meeting</option><option>House Meeting (Ghar Sabha)</option><option>Training Camp</option><option>Health Camp</option><option>Women Sabha</option><option>Youth Event</option><option>Voter ID Drive</option><option>Cultural Programme</option><option>Press Conference</option><option>Internal Meeting</option><option>Other</option></select></FormGroup>
          <FormGroup label="Date" required><input ref={r.date} type="date" className={inputCls} defaultValue={todayISO()} /></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Start Time"><input ref={r.time} type="time" className={inputCls} /></FormGroup>
          <FormGroup label="End Time"><input ref={r.endtime} type="time" className={inputCls} /></FormGroup>
          <FormGroup label="Block" required><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option><option>All Blocks</option></select></FormGroup>
          <FormGroup label="Venue / Location"><input ref={r.venue} className={inputCls} placeholder="Full venue address" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Organiser / In-charge"><input ref={r.organiser} className={inputCls} placeholder="Who is organising?" /></FormGroup>
          <FormGroup label="Chief Guest / Speaker"><input ref={r.chief} className={inputCls} placeholder="Guest name" /></FormGroup>
          <FormGroup label="Expected Attendance"><input ref={r.expected} type="number" className={inputCls} placeholder="Count" /></FormGroup>
        </FormRow>
        {/* <FormRow cols={3}>
          <FormGroup label="Actual Attendance"><input ref={r.actual} type="number" className={inputCls} placeholder="Count (post-event)" /></FormGroup>
          <FormGroup label="Budget (₹)"><input ref={r.budget} type="number" className={inputCls} placeholder="₹" /></FormGroup>
          <FormGroup label="Amount Spent (₹)"><input ref={r.spent} type="number" className={inputCls} placeholder="₹" /></FormGroup>
        </FormRow> */}
        <FormRow cols={1}><FormGroup label="Status" required><select ref={r.status} className={selectCls}><option>Planning</option><option>Confirmed</option><option>Awaiting</option><option>TBD</option><option>Completed</option><option>Cancelled</option></select></FormGroup></FormRow>
        <FormRow cols={2}>
          <FormGroup label="Materials / Resources Needed"><textarea ref={r.materials} className={textareaCls} style={{minHeight:50}} placeholder="Stage, mics, banners, chairs..." /></FormGroup>
          <FormGroup label="Volunteers Assigned"><textarea ref={r.vols} className={textareaCls} style={{minHeight:50}} placeholder="List volunteers / teams assigned..." /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Post-Event Notes / Outcome"><textarea ref={r.notes} className={textareaCls} placeholder="What happened? Any outcomes or follow-ups?" /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Event" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}
