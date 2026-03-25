import { useRef, useState } from 'react'
import { useEntryModule } from '../../hooks/useEntryModule'
import EntryListHeader from '../../components/entry/EntryListHeader'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import RecordList from '../../components/entry/RecordList'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import { exportRecordsToCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'
import { todayISO } from '../../utils/formatters'

const FORM_ID = 'voter-survey-form'

type YNS = 'Yes' | 'No' | 'Not Sure' | ''

function ToggleGroup({ label, required, value, onChange }: {
  label: string; required?: boolean; value: YNS; onChange: (v: YNS) => void
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label className="text-[9.5px] font-bold text-navy tracking-[0.5px] uppercase">
        {label}{required && <span className="text-kampr ml-[2px]">*</span>}
      </label>
      <div className="flex gap-2">
        {(['Yes', 'No', 'Not Sure'] as YNS[]).map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`
              px-4 py-[7px] rounded-lg text-[12px] font-semibold border transition-all duration-150
              ${value === opt
                ? opt === 'Yes'
                  ? 'bg-kampgreen text-white border-kampgreen shadow-sm'
                  : opt === 'No'
                    ? 'bg-kampr text-white border-kampr shadow-sm'
                    : 'bg-navy text-white border-navy shadow-sm'
                : 'bg-white text-muted border-border hover:border-navy hover:text-navy'
              }
            `}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function VoterSurveyEntry() {
  const em = useEntryModule('voter-survey', FORM_ID)

  /* ── refs for plain inputs ── */
  const r = {
    surveyDate:   useRef<HTMLInputElement>(null),
    block:        useRef<HTMLSelectElement>(null),
    village:      useRef<HTMLInputElement>(null),
    booth:        useRef<HTMLInputElement>(null),
    voterName:    useRef<HTMLInputElement>(null),
    age:          useRef<HTMLInputElement>(null),
    gender:       useRef<HTMLSelectElement>(null),
    phone:        useRef<HTMLInputElement>(null),
    address:      useRef<HTMLInputElement>(null),
    supportLevel: useRef<HTMLSelectElement>(null),
    partyPref:    useRef<HTMLSelectElement>(null),
    keyIssues:    useRef<HTMLTextAreaElement>(null),
    remarks:      useRef<HTMLTextAreaElement>(null),
  }

  /* ── state for toggle groups ── */
  const [registered, setRegistered] = useState<YNS>('')
  const [awareOfCandidate, setAwareOfCandidate] = useState<YNS>('')
  const [likelyToVote, setLikelyToVote] = useState<YNS>('')

  const resetToggles = () => {
    setRegistered('')
    setAwareOfCandidate('')
    setLikelyToVote('')
  }

  const fill = (data: Record<string, string>) => {
    Object.entries(r).forEach(([k, ref]) => { if (ref.current) ref.current.value = data[k] ?? '' })
    setRegistered((data.registered as YNS) || '')
    setAwareOfCandidate((data.awareOfCandidate as YNS) || '')
    setLikelyToVote((data.likelyToVote as YNS) || '')
  }

  const clear = () => {
    fill({})
    if (r.surveyDate.current) r.surveyDate.current.value = todayISO()
  }

  const collect = () => ({
    ...(Object.fromEntries(Object.entries(r).map(([k, ref]) => [k, ref.current?.value ?? ''])) as Record<string, string>),
    registered,
    awareOfCandidate,
    likelyToVote,
  })

  const handleSave = () => {
    const d = collect()
    if (!d.voterName) return
    em.saveRecord(
      d.voterName,
      `${d.block || '—'} · Booth ${d.booth || '—'} · Support: ${d.supportLevel || '—'} · Registered: ${d.registered || '—'}`,
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
      {/* ── List ── */}
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Voter Survey Records" icon="ph ph-notepad"
          count={em.records.length} onAddNew={em.openForm} addLabel="New Survey"
        />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search surveys..."
            value={em.searchQuery} onChange={em.setSearch}
            onExport={() => exportRecordsToCsv(em.records, 'VoterSurveys')}
            onPrint={() => printModule(em.records, 'VoterSurveys')}
          />
          <RecordList
            records={em.filtered} editingId={em.editingId}
            emptyMsg='No survey records yet. Click "New Survey" to begin.'
            icon="ph ph-notepad" iconBg="#f0f4ff" iconColor="#0d2455"
            onEdit={handleEdit} onDelete={em.deleteRecord}
          />
        </div>
      </div>

      {/* ── Form ── */}
      <EntryFormPanel
        id={FORM_ID} title="Voter Survey Form" icon="ph ph-notepad"
        isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}
      >

        {/* ── Survey Info ── */}
        <FormRow cols={2}>
          <FormGroup label="Survey Date" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                <i className="ph ph-calendar text-[15px]" />
              </span>
              <input ref={r.surveyDate} type="date" className={inputCls + ' pl-9'} defaultValue={todayISO()} />
            </div>
          </FormGroup>
          <FormGroup label="Block">
            <select ref={r.block} className={selectCls}>
              <option value="">Select block</option>
              <option>Modakkurichi</option>
              <option>Sivagiri</option>
              <option>Erode City</option>
              <option>Kodumudi</option>
              <option>Ganapathypalayam</option>
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Village / Ward">
            <input ref={r.village} className={inputCls} placeholder="Village or ward name" />
          </FormGroup>
          <FormGroup label="Booth No.">
            <input ref={r.booth} className={inputCls} placeholder="Polling booth number" />
          </FormGroup>
        </FormRow>

        {/* ── Voter Details ── */}
        <div className="flex items-center gap-2 mt-4 mb-3">
          <i className="ph ph-user text-saffron text-[14px]" />
          <span className="text-[11px] font-bold text-navy uppercase tracking-[1px]">Voter Details</span>
        </div>

        <FormRow cols={2}>
          <FormGroup label="Voter Name" required>
            <input ref={r.voterName} className={inputCls} placeholder="Full name of the voter" />
          </FormGroup>
          <FormGroup label="Age">
            <input ref={r.age} type="number" className={inputCls} placeholder="Age" min="18" max="120" />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Gender">
            <select ref={r.gender} className={selectCls}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </FormGroup>
          <FormGroup label="Phone Number">
            <input ref={r.phone} type="tel" className={inputCls} placeholder="Mobile number (optional)" />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Address">
            <input ref={r.address} className={inputCls} placeholder="Door no., street, locality" />
          </FormGroup>
        </FormRow>

        {/* ── Survey Questions ── */}
        <div className="flex items-center gap-2 mt-4 mb-3">
          <i className="ph ph-list-checks text-saffron text-[14px]" />
          <span className="text-[11px] font-bold text-navy uppercase tracking-[1px]">Survey Questions</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ToggleGroup
            label="Is the voter registered?" required
            value={registered} onChange={setRegistered}
          />
          <ToggleGroup
            label="Aware of our candidate?"
            value={awareOfCandidate} onChange={setAwareOfCandidate}
          />
          <ToggleGroup
            label="Likely to vote?"
            value={likelyToVote} onChange={setLikelyToVote}
          />
        </div>

        <div className="mt-4">
          <FormRow cols={2}>
            <FormGroup label="Voter Support Level">
              <select ref={r.supportLevel} className={selectCls}>
                <option value="">Select support level</option>
                <option>Strong Support</option>
                <option>Leaning Support</option>
                <option>Neutral</option>
                <option>Leaning Against</option>
                <option>Strong Against</option>
                <option>Undecided</option>
              </select>
            </FormGroup>
            <FormGroup label="Party Preference">
              <select ref={r.partyPref} className={selectCls}>
                <option value="">Select party</option>
                <option>BJP</option>
                <option>AIADMK</option>
                <option>DMK</option>
                <option>Congress</option>
                <option>PMK</option>
                <option>DMDK</option>
                <option>Other</option>
                <option>No Preference</option>
              </select>
            </FormGroup>
          </FormRow>
          <FormRow cols={2}>
            <FormGroup label="Key Issues / Concerns">
              <textarea ref={r.keyIssues} className={textareaCls} rows={3}
                placeholder="Water, roads, electricity, employment..." />
            </FormGroup>
            <FormGroup label="Remarks / Additional Notes">
              <textarea ref={r.remarks} className={textareaCls} rows={3}
                placeholder="Any other observations from the voter..." />
            </FormGroup>
          </FormRow>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-[12px] rounded-lg bg-saffron text-white font-inter font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-saffron-dark active:scale-[0.99] transition-all duration-150 shadow-md"
          >
            <i className="ph ph-paper-plane-tilt text-[15px]" />
            {em.isEditing ? 'Update Survey' : 'Submit Survey'}
          </button>
          <button
            type="button"
            onClick={() => { clear(); resetToggles() }}
            className="flex-1 py-[12px] rounded-lg bg-navy text-white font-inter font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-[#163070] active:scale-[0.99] transition-all duration-150 shadow-md"
          >
            <i className="ph ph-arrow-counter-clockwise text-[15px]" />
            Clear
          </button>
        </div>
      </EntryFormPanel>
    </div>
  )
}
