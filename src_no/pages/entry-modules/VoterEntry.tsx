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

const FORM_ID = 'voter-form'

export default function VoterEntry() {
  const em = useEntryModule('voter', FORM_ID)

  // refs for all fields
  const r = {
    name:     useRef<HTMLInputElement>(null),
    age:      useRef<HTMLInputElement>(null),
    gender:   useRef<HTMLSelectElement>(null),
    phone:    useRef<HTMLInputElement>(null),
    phone2:   useRef<HTMLInputElement>(null),
    vid:      useRef<HTMLInputElement>(null),
    block:    useRef<HTMLSelectElement>(null),
    village:  useRef<HTMLInputElement>(null),
    booth:    useRef<HTMLInputElement>(null),
    hno:      useRef<HTMLInputElement>(null),
    caste:    useRef<HTMLInputElement>(null),
    religion: useRef<HTMLSelectElement>(null),
    sentiment:useRef<HTMLSelectElement>(null),
    scheme:   useRef<HTMLInputElement>(null),
    issue:    useRef<HTMLInputElement>(null),
    notes:    useRef<HTMLTextAreaElement>(null),
    dob:      useRef<HTMLInputElement>(null),
  }

  const fill = (data: Record<string, string>) => {
    Object.entries(r).forEach(([k, ref]) => {
      if (ref.current) ref.current.value = data[k] ?? ''
    })
  }

  const clear = () => fill({})

  const collect = () =>
    Object.fromEntries(Object.entries(r).map(([k, ref]) => [k, ref.current?.value ?? '']))

  const handleSave = () => {
    const d = collect()
    if (!d.name) { return }
    const sentiment = d.sentiment || 'Unknown'
    em.saveRecord(
      d.name,
      `${d.block || '—'} · Booth ${d.booth || '?'} · ${d.phone || ''} · ${sentiment}`,
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
      {/* List */}
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Voter Records"
          icon="ph ph-user"
          count={em.records.length}
          onAddNew={em.openForm}
          addLabel="Add Voter"
        />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search voters..."
            value={em.searchQuery}
            onChange={em.setSearch}
            onExport={() => exportRecordsToCsv(em.records, 'Voter_Details')}
            onPrint={() => printModule(em.records, 'Voter Details')}
          />
          <RecordList
            records={em.filtered}
            editingId={em.editingId}
            emptyMsg='No voter records yet. Click "Add Voter" to begin.'
            icon="ph ph-user"
            iconBg="#fff3e0"
            iconColor="#e07010"
            onEdit={handleEdit}
            onDelete={em.deleteRecord}
          />
        </div>
      </div>

      {/* Form */}
      <EntryFormPanel
        id={FORM_ID}
        title="Voter Details"
        icon="ph ph-user"
        isOpen={em.isFormOpen}
        isEditing={em.isEditing}
        onClose={em.closeForm}
      >
        <FormRow cols={3}>
          <FormGroup label="Full Name" required><input ref={r.name} className={inputCls} placeholder="Voter full name" /></FormGroup>
          <FormGroup label="Age"><input ref={r.age} type="number" className={inputCls} placeholder="Age" /></FormGroup>
          <FormGroup label="Gender"><select ref={r.gender} className={selectCls}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Phone"><input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" /></FormGroup>
          <FormGroup label="Alt. Phone"><input ref={r.phone2} type="tel" className={inputCls} placeholder="Optional" /></FormGroup>
          <FormGroup label="Voter ID No."><input ref={r.vid} className={inputCls} placeholder="EPI No." /></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Block" required><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
          <FormGroup label="Village / Ward"><input ref={r.village} className={inputCls} placeholder="Village or ward name" /></FormGroup>
          <FormGroup label="Booth No."><input ref={r.booth} className={inputCls} placeholder="001" /></FormGroup>
          <FormGroup label="House No."><input ref={r.hno} className={inputCls} placeholder="H.No / Door No." /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Caste / Community"><input ref={r.caste} className={inputCls} placeholder="Community" /></FormGroup>
          <FormGroup label="Religion"><select ref={r.religion} className={selectCls}><option value="">Select</option><option>Hindu</option><option>Muslim</option><option>Christian</option><option>Other</option></select></FormGroup>
          <FormGroup label="Date of Birth"><input ref={r.dob} type="date" className={inputCls} defaultValue={todayISO()} /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Sentiment / Opinion"><select ref={r.sentiment} className={selectCls}><option value="">Select</option><option>Strongly Favourable</option><option>Favourable</option><option>Neutral / Undecided</option><option>Against</option><option>Strongly Against</option></select></FormGroup>
          <FormGroup label="Scheme Beneficiary"><input ref={r.scheme} className={inputCls} placeholder="Which scheme?" /></FormGroup>
          <FormGroup label="Key Issue Raised"><input ref={r.issue} className={inputCls} placeholder="Main concern" /></FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Notes"><textarea ref={r.notes} className={textareaCls} placeholder="Any additional notes about this voter..." /></FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={clear}
          saveLabel="Save Voter"
          isEditing={em.isEditing}
        />
      </EntryFormPanel>
    </div>
  )
}
