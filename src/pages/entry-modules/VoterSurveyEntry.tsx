import { useRef, useState, useEffect } from 'react'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { FieldSurveyRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Ward } from '../../hooks/useMasterAPI'
import EntryListHeader from '../../components/entry/EntryListHeader'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import RecordList from '../../components/entry/RecordList'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import { todayISO } from '../../utils/formatters'
import { useToast } from '../../context/ToastContext'
import type { EntryRecord } from '../../types/entry.types'

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
  const { fetchFieldSurveys, createFieldSurvey, updateFieldSurvey, deleteFieldSurvey } = useEntryAPI()
  const masterApi = useMasterAPI()
  const { showToast } = useToast()

  const [records, setRecords]     = useState<FieldSurveyRecord[]>([])
  const [wards, setWards]         = useState<Ward[]>([])
  const [search, setSearch]       = useState('')
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [registered,       setRegistered]       = useState<YNS>('')
  const [awareOfCandidate, setAwareOfCandidate] = useState<YNS>('')
  const [likelyToVote,     setLikelyToVote]     = useState<YNS>('')

  const pendingFill = useRef<FieldSurveyRecord | null>(null)

  const r = {
    surveyDate:      useRef<HTMLInputElement>(null),
    block:           useRef<HTMLSelectElement>(null),
    village:         useRef<HTMLSelectElement>(null),
    booth:           useRef<HTMLInputElement>(null),
    voterName:       useRef<HTMLInputElement>(null),
    age:             useRef<HTMLInputElement>(null),
    gender:          useRef<HTMLSelectElement>(null),
    phone:           useRef<HTMLInputElement>(null),
    address:         useRef<HTMLInputElement>(null),
    supportLevel:    useRef<HTMLSelectElement>(null),
    partyPref:       useRef<HTMLSelectElement>(null),
    responseStatus:  useRef<HTMLSelectElement>(null),
    keyIssues:       useRef<HTMLTextAreaElement>(null),
    remarks:         useRef<HTMLTextAreaElement>(null),
  }

  useEffect(() => {
    fetchFieldSurveys().then(res => { if (res) setRecords(res) })
    masterApi.fetchWards().then(d => d && setWards(d))
  }, [])

  useEffect(() => {
    if (isFormOpen && pendingFill.current) {
      const d = pendingFill.current
      if (r.surveyDate.current)   r.surveyDate.current.value   = d.survey_date     ?? todayISO()
      if (r.block.current)        r.block.current.value        = d.block            ?? ''
      if (r.village.current)      r.village.current.value      = d.village          ?? ''
      if (r.booth.current)        r.booth.current.value        = d.booth_no         ?? ''
      if (r.voterName.current)    r.voterName.current.value    = d.voter_name       ?? ''
      if (r.age.current)          r.age.current.value          = d.age != null ? String(d.age) : ''
      if (r.gender.current)       r.gender.current.value       = d.gender           ?? ''
      if (r.phone.current)        r.phone.current.value        = d.phone            ?? ''
      if (r.address.current)      r.address.current.value      = d.address          ?? ''
      if (r.supportLevel.current) r.supportLevel.current.value = d.support_level    ?? ''
      if (r.partyPref.current)    r.partyPref.current.value    = d.party_preference ?? ''
      if (r.responseStatus.current) r.responseStatus.current.value = d.response_status ?? ''
      if (r.keyIssues.current)      r.keyIssues.current.value      = d.key_issues      ?? ''
      if (r.remarks.current)        r.remarks.current.value        = d.remarks         ?? ''
      setRegistered((d.is_registered as YNS) ?? '')
      setAwareOfCandidate((d.aware_of_candidate as YNS) ?? '')
      setLikelyToVote((d.likely_to_vote as YNS) ?? '')
      pendingFill.current = null
    }
  }, [isFormOpen])

  const resetToggles = () => { setRegistered(''); setAwareOfCandidate(''); setLikelyToVote('') }

  const clear = () => {
    if (r.surveyDate.current)   r.surveyDate.current.value   = todayISO()
    if (r.block.current)        r.block.current.value        = ''
    if (r.village.current)      r.village.current.value      = ''
    if (r.booth.current)        r.booth.current.value        = ''
    if (r.voterName.current)    r.voterName.current.value    = ''
    if (r.age.current)          r.age.current.value          = ''
    if (r.gender.current)       r.gender.current.value       = ''
    if (r.phone.current)        r.phone.current.value        = ''
    if (r.address.current)      r.address.current.value      = ''
    if (r.supportLevel.current) r.supportLevel.current.value = ''
    if (r.partyPref.current)    r.partyPref.current.value    = ''
    if (r.responseStatus.current) r.responseStatus.current.value = ''
    if (r.keyIssues.current)      r.keyIssues.current.value      = ''
    if (r.remarks.current)        r.remarks.current.value        = ''
    resetToggles()
  }

  const collect = (): Partial<FieldSurveyRecord> => ({
    survey_date:       r.surveyDate.current?.value   ?? todayISO(),
    block:             r.block.current?.value        ?? '',
    village:           r.village.current?.value      ?? '',
    booth_no:          r.booth.current?.value        ?? '',
    voter_name:        r.voterName.current?.value    ?? '',
    age:               r.age.current?.value ? Number(r.age.current.value) : undefined,
    gender:            r.gender.current?.value       ?? '',
    phone:             r.phone.current?.value        ?? '',
    address:           r.address.current?.value      ?? '',
    support_level:     r.supportLevel.current?.value ?? '',
    party_preference:  r.partyPref.current?.value    ?? '',
    response_status:   r.responseStatus.current?.value  ?? '',
    key_issues:        r.keyIssues.current?.value        ?? '',
    remarks:           r.remarks.current?.value          ?? '',
    is_registered:     registered,
    aware_of_candidate: awareOfCandidate,
    likely_to_vote:    likelyToVote,
  })

  const handleSave = async () => {
    const d = collect()
    if (!d.voter_name) { showToast('<i class="ph ph-warning"></i> Voter name is required!', '#dc2626'); return }
    if (editingId !== null) {
      const updated = await updateFieldSurvey(editingId, d)
      if (updated) {
        setRecords(prev => prev.map(r => r.id === editingId ? updated : r))
        showToast('<i class="ph ph-check-circle"></i> Feedback updated!', '#138808')
        setEditingId(null)
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update feedback. Please check all required fields.', '#dc2626')
      }
    } else {
      const created = await createFieldSurvey(d)
      if (created) {
        setRecords(prev => [created, ...prev])
        showToast('<i class="ph ph-check-circle"></i> Feedback saved!', '#138808')
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save feedback. Please check all required fields.', '#dc2626')
      }
    }
  }

  const handleEdit = (id: number) => {
    const rec = records.find(r => r.id === id)
    if (!rec) return
    pendingFill.current = rec
    setEditingId(id)
    setFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const ok = await deleteFieldSurvey(id)
    if (ok) setRecords(prev => prev.filter(r => r.id !== id))
  }

  const filteredRecords = records.filter(rec => {
    const q = search.toLowerCase()
    return (
      rec.voter_name?.toLowerCase().includes(q) ||
      rec.block?.toLowerCase().includes(q) ||
      rec.village?.toLowerCase().includes(q) ||
      rec.booth_no?.toLowerCase().includes(q)
    )
  })

  const mapped = filteredRecords.map<EntryRecord>(rec => ({
    id:        String(rec.id),
    keyField:  rec.voter_name,
    sub:       [rec.block || '—', rec.booth_no ? `Booth ${rec.booth_no}` : '', rec.support_level || '', rec.response_status || ''].filter(Boolean).join(' · '),
    data: {
      support_level:   rec.support_level   || '',
      gender:          rec.gender          || '',
      response_status: rec.response_status || '',
      block:           rec.block           || '',
    },
    createdAt: rec.created_at || '',
    backendId: rec.id,
  }))

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Feedback Records" icon="ph ph-notepad"
          count={records.length}
        />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search feedback..."
            value={search} onChange={setSearch}
            onExport={() => {}} onPrint={() => {}}
          />
          <RecordList
            records={mapped}
            editingId={editingId !== null ? String(editingId) : null}
            emptyMsg='No feedback records yet. Click "New Feedback" to begin.'
            icon="ph ph-notepad"
            iconBg="#f0f4ff"
            iconColor="#0d2455"
            onEdit={id => handleEdit(Number(id))}
            onDelete={id => handleDelete(Number(id))}
            filterConfig={[
              { key: 'block', label: 'Block', options: [
                { value: 'Modakkurichi',       label: 'Modakkurichi' },
                { value: 'Sivagiri',           label: 'Sivagiri' },
                { value: 'Erode City',         label: 'Erode City' },
                { value: 'Kodumudi',           label: 'Kodumudi' },
                { value: 'Ganapathypalayam',   label: 'Ganapathypalayam' },
              ]},
              { key: 'gender', label: 'Gender', options: [
                { value: 'Male',   label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other',  label: 'Other' },
              ]},
              { key: 'support_level', label: 'Support', options: [
                { value: 'Strong Support',  label: 'Strong Support' },
                { value: 'Leaning Support', label: 'Leaning Support' },
                { value: 'Neutral',         label: 'Neutral' },
                { value: 'Leaning Against', label: 'Leaning Against' },
                { value: 'Strong Against',  label: 'Strong Against' },
                { value: 'Undecided',       label: 'Undecided' },
              ]},
              { key: 'response_status', label: 'Response', options: [
                { value: 'interested',      label: 'Interested' },
                { value: 'not_reach',       label: 'Not Reach' },
                { value: 'not_attend_call', label: 'Not Attend Call' },
                { value: 'need_followups',  label: 'Need Followups' },
              ]},
            ]}
          />
        </div>
      </div>

      <EntryFormPanel
        id="voter-survey-form" title="Voter Survey Form" icon="ph ph-notepad"
        isOpen={isFormOpen} isEditing={editingId !== null}
        onClose={() => { setFormOpen(false); setEditingId(null); clear() }}
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
          <FormGroup label="Ward">
            <select ref={r.village} className={selectCls}>
              <option value="">Select Ward</option>
              {wards.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
            </select>
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
          {/* <ToggleGroup label="Is the voter registered?" required value={registered} onChange={setRegistered} /> */}
          <ToggleGroup label="Aware of our candidate?" value={awareOfCandidate} onChange={setAwareOfCandidate} />
          <ToggleGroup label="Likely to vote?" value={likelyToVote} onChange={setLikelyToVote} />
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
            {editingId !== null ? 'Update Survey' : 'Submit Survey'}
          </button>
          <button
            type="button"
            onClick={clear}
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
