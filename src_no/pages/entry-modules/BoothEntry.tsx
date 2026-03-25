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

const FORM_ID = 'booth-form'

export default function BoothEntry() {
  const em = useEntryModule('booth', FORM_ID)

  const r = {
    num:       useRef<HTMLInputElement>(null),
    name:      useRef<HTMLInputElement>(null),
    block:     useRef<HTMLSelectElement>(null),
    village:   useRef<HTMLInputElement>(null),
    address:   useRef<HTMLInputElement>(null),
    voters:    useRef<HTMLInputElement>(null),
    male:      useRef<HTMLInputElement>(null),
    female:    useRef<HTMLInputElement>(null),
    agent:       useRef<HTMLInputElement>(null),
    agentph:     useRef<HTMLInputElement>(null),
    boothStatus: useRef<HTMLSelectElement>(null),
    status:      useRef<HTMLSelectElement>(null),
    sentiment:   useRef<HTMLSelectElement>(null),
    notes:       useRef<HTMLTextAreaElement>(null),
  }

  const fill = (data: Record<string, string>) =>
    Object.entries(r).forEach(([k, ref]) => { if (ref.current) ref.current.value = data[k] ?? '' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k, ref]) => [k, ref.current?.value ?? '']))

  const handleSave = () => {
    const d = collect()
    if (!d.num) return
    em.saveRecord(
      `Booth ${d.num}${d.name ? ' – ' + d.name : ''}`,
      `${d.block || '—'} · ${d.voters || '0'} voters · Agent: ${d.agent || 'Not assigned'} · ${d.status || ''}`,
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
        <EntryListHeader title="Booth Records" icon="ph ph-map-pin" count={em.records.length} onAddNew={em.openForm} addLabel="Add Booth" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search booths..." value={em.searchQuery} onChange={em.setSearch}
            onExport={() => exportRecordsToCsv(em.records, 'Booth_Info')}
            onPrint={() => printModule(em.records, 'Booth Info')} />
          <RecordList records={em.filtered} editingId={em.editingId}
            emptyMsg='No booth records yet. Click "Add Booth" to begin.'
            icon="ph ph-map-pin" iconBg="#dbeafe" iconColor="#0d2455"
            onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id={FORM_ID} title="Booth Info" icon="ph ph-map-pin" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Booth No." required><input ref={r.num} className={inputCls} placeholder="001" /></FormGroup>
          <FormGroup label="Booth Name / Location"><input ref={r.name} className={inputCls} placeholder="School name or landmark" /></FormGroup>
          <FormGroup label="Block" required><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Village / Ward"><input ref={r.village} className={inputCls} placeholder="Village name" /></FormGroup>
          <FormGroup label="Address"><input ref={r.address} className={inputCls} placeholder="Full address" /></FormGroup>
          <FormGroup label="Total Voters"><input ref={r.voters} type="number" className={inputCls} placeholder="Count" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Male Voters"><input ref={r.male} type="number" className={inputCls} placeholder="Count" /></FormGroup>
          <FormGroup label="Female Voters"><input ref={r.female} type="number" className={inputCls} placeholder="Count" /></FormGroup>
          <FormGroup label="Booth Agent Name"><input ref={r.agent} className={inputCls} placeholder="Agent name" /></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Agent Phone"><input ref={r.agentph} type="tel" className={inputCls} placeholder="9XXXXXXXXX" /></FormGroup>
          <FormGroup label="Booth Status" required><select ref={r.boothStatus} className={selectCls}><option value="">Select</option><option>Ready</option><option>Partial</option><option>No Agent</option></select></FormGroup>
          <FormGroup label="Agent Status"><select ref={r.status} className={selectCls}><option value="">Select</option><option>Assigned &amp; Ready</option><option>Assigned – Not Confirmed</option><option>Vacant – Urgent</option><option>Backup Needed</option></select></FormGroup>
          <FormGroup label="Booth Sentiment"><select ref={r.sentiment} className={selectCls}><option value="">Select</option><option>Strongly Favourable</option><option>Favourable</option><option>Neutral</option><option>Challenging</option><option>Opposition Stronghold</option></select></FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Notes"><textarea ref={r.notes} className={textareaCls} placeholder="Any notes about this booth..." /></FormGroup>
        </FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Booth" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}
