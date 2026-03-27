import { useRef, useState, useEffect, useMemo } from 'react'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { FieldSurveyRecord } from '../../hooks/useEntryAPI'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import { todayISO } from '../../utils/formatters'
import { useToast } from '../../context/ToastContext'
import { getGroups, subscribe } from '../../utils/telecallingStore'
import type { AssignmentGroup, AssignedVoter } from '../../utils/telecallingStore'

type YNS = 'Yes' | 'No' | 'Not Sure' | ''

function ToggleGroup({ label, value, onChange }: {
  label: string; value: YNS; onChange: (v: YNS) => void
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label className="text-[9.5px] font-bold text-navy tracking-[0.5px] uppercase">{label}</label>
      <div className="flex gap-2">
        {(['Yes', 'No', 'Not Sure'] as YNS[]).map(opt => (
          <button key={opt} type="button" onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-4 py-[7px] rounded-lg text-[12px] font-semibold border transition-all duration-150
              ${value === opt
                ? opt === 'Yes' ? 'bg-kampgreen text-white border-kampgreen shadow-sm'
                  : opt === 'No' ? 'bg-kampr text-white border-kampr shadow-sm'
                  : 'bg-navy text-white border-navy shadow-sm'
                : 'bg-white text-muted border-border hover:border-navy hover:text-navy'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface FlatVoter extends AssignedVoter {
  telecaller_id:    number
  telecaller_name:  string
  telecaller_phone?: string
  assigned_date:    string
}

/* ── Badge helpers ── */
const supportColor = (s?: string) => {
  if (!s) return 'bg-border text-muted'
  if (s.includes('Strong Support'))  return 'bg-green-100 text-green-700'
  if (s.includes('Leaning Support')) return 'bg-emerald-100 text-emerald-700'
  if (s.includes('Neutral'))         return 'bg-yellow-100 text-yellow-700'
  if (s.includes('Against'))         return 'bg-red-100 text-red-600'
  return 'bg-blue-100 text-blue-700'
}

const responseColor = (s?: string) => {
  if (!s) return 'bg-border text-muted'
  if (s === 'interested')      return 'bg-green-100 text-green-700'
  if (s === 'not_reach')       return 'bg-red-100 text-red-600'
  if (s === 'not_attend_call') return 'bg-orange-100 text-orange-600'
  if (s === 'need_followups')  return 'bg-purple-100 text-purple-700'
  return 'bg-border text-muted'
}

const responseLabel = (s?: string) => {
  if (s === 'interested')      return 'Interested'
  if (s === 'not_reach')       return 'Not Reach'
  if (s === 'not_attend_call') return 'Not Attend Call'
  if (s === 'need_followups')  return 'Need Followup'
  return s || ''
}

/* ── Section header ── */
function SectionLabel({ icon, label, count, color }: {
  icon: string; label: string; count: number; color: string
}) {
  return (
    <div className={`flex items-center gap-2 px-5 py-2 ${color} border-b border-border`}>
      <i className={`${icon} text-[13px]`} />
      <span className="text-[10px] font-bold uppercase tracking-[1px]">{label}</span>
      <span className="ml-auto text-[10px] font-semibold opacity-70">{count}</span>
    </div>
  )
}

export default function VoterSurveyEntry() {
  const { fetchFieldSurveys, createFieldSurvey, updateFieldSurvey, deleteFieldSurvey } = useEntryAPI()
  const { showToast } = useToast()

  /* ── Store ── */
  const [groups, setGroups] = useState<AssignmentGroup[]>(getGroups())
  useEffect(() => subscribe(() => setGroups(getGroups())), [])

  const allVoters = useMemo<FlatVoter[]>(() =>
    groups.flatMap(g => g.voters.map(v => ({
      ...v,
      telecaller_id:    g.telecaller.id,
      telecaller_name:  g.telecaller.name,
      telecaller_phone: g.telecaller.phone,
      assigned_date:    g.date,
    }))), [groups])

  const telecallerOptions = useMemo(() => {
    const seen = new Map<number, string>()
    groups.forEach(g => seen.set(g.telecaller.id, g.telecaller.name))
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [groups])

  /* ── Feedback records ── */
  const [records, setRecords]     = useState<FieldSurveyRecord[]>([])
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  /* ── Filters ── */
  const [filterTelecaller, setFilterTelecaller] = useState('')
  const [filterStatus,     setFilterStatus]     = useState<'all' | 'pending' | 'done'>('all')
  const [search, setSearch]                     = useState('')

  /* ── Toggle state ── */
  const [registered,       setRegistered]       = useState<YNS>('')
  const [awareOfCandidate, setAwareOfCandidate] = useState<YNS>('')
  const [likelyToVote,     setLikelyToVote]     = useState<YNS>('')

  const pendingFill       = useRef<FieldSurveyRecord | null>(null)
  const selectedVoterRef  = useRef<FlatVoter | null>(null)
  const [fillKey, setFillKey] = useState(0)   // increment to re-trigger form fill

  const r = {
    surveyDate:      useRef<HTMLInputElement>(null),
    booth:           useRef<HTMLInputElement>(null),
    telecaller:      useRef<HTMLInputElement>(null),
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
  }, [])

  /* Normalize gender codes → display values */
  const toGenderDisplay = (g?: string) => {
    if (g === 'm' || g === 'Male')   return 'Male'
    if (g === 'f' || g === 'Female') return 'Female'
    if (g === 'o' || g === 'Other')  return 'Other'
    return ''
  }

  /* Fill form — triggers when fillKey changes (covers re-open AND same-panel re-fill) */
  useEffect(() => {
    if (!isFormOpen) return
    if (pendingFill.current) {
      const d = pendingFill.current
      if (r.surveyDate.current)     r.surveyDate.current.value     = d.survey_date      ?? todayISO()
      if (r.booth.current)          r.booth.current.value          = d.booth_no          ?? ''
      if (r.telecaller.current)     r.telecaller.current.value     = d.surveyed_by       ?? ''
      if (r.voterName.current)      r.voterName.current.value      = d.voter_name        ?? ''
      if (r.age.current)            r.age.current.value            = d.age != null ? String(d.age) : ''
      if (r.gender.current)         r.gender.current.value         = toGenderDisplay(d.gender)
      if (r.phone.current)          r.phone.current.value          = d.phone             ?? ''
      if (r.address.current)        r.address.current.value        = d.address           ?? ''
      if (r.supportLevel.current)   r.supportLevel.current.value   = d.support_level     ?? ''
      if (r.partyPref.current)      r.partyPref.current.value      = d.party_preference  ?? ''
      if (r.responseStatus.current) r.responseStatus.current.value = d.response_status   ?? ''
      if (r.keyIssues.current)      r.keyIssues.current.value      = d.key_issues        ?? ''
      if (r.remarks.current)        r.remarks.current.value        = d.remarks           ?? ''
      setRegistered((d.is_registered as YNS) ?? '')
      setAwareOfCandidate((d.aware_of_candidate as YNS) ?? '')
      setLikelyToVote((d.likely_to_vote as YNS) ?? '')
      pendingFill.current = null
    } else if (selectedVoterRef.current) {
      const v = selectedVoterRef.current
      if (r.surveyDate.current)     r.surveyDate.current.value = v.assigned_date || todayISO()
      if (r.booth.current)          r.booth.current.value      = v.booth_name ?? String(v.booth)
      if (r.telecaller.current)     r.telecaller.current.value = v.telecaller_name
      if (r.voterName.current)      r.voterName.current.value  = v.name
      if (r.age.current)            r.age.current.value        = v.age != null ? String(v.age) : ''
      if (r.gender.current)         r.gender.current.value     = toGenderDisplay(v.gender)
      if (r.phone.current)          r.phone.current.value      = v.phone ?? ''
      if (r.address.current)        r.address.current.value    = v.address ?? ''
      if (r.supportLevel.current)   r.supportLevel.current.value   = ''
      if (r.partyPref.current)      r.partyPref.current.value      = ''
      if (r.responseStatus.current) r.responseStatus.current.value = ''
      if (r.keyIssues.current)      r.keyIssues.current.value      = ''
      if (r.remarks.current)        r.remarks.current.value        = ''
      setRegistered(''); setAwareOfCandidate(''); setLikelyToVote('')
      selectedVoterRef.current = null
    }
  }, [fillKey, isFormOpen])

  const resetToggles = () => { setRegistered(''); setAwareOfCandidate(''); setLikelyToVote('') }
  const clear = () => {
    if (r.surveyDate.current)     r.surveyDate.current.value     = todayISO()
    if (r.booth.current)          r.booth.current.value          = ''
    if (r.telecaller.current)     r.telecaller.current.value     = ''
    if (r.voterName.current)      r.voterName.current.value      = ''
    if (r.age.current)            r.age.current.value            = ''
    if (r.gender.current)         r.gender.current.value         = ''
    if (r.phone.current)          r.phone.current.value          = ''
    if (r.address.current)        r.address.current.value        = ''
    if (r.supportLevel.current)   r.supportLevel.current.value   = ''
    if (r.partyPref.current)      r.partyPref.current.value      = ''
    if (r.responseStatus.current) r.responseStatus.current.value = ''
    if (r.keyIssues.current)      r.keyIssues.current.value      = ''
    if (r.remarks.current)        r.remarks.current.value        = ''
    resetToggles()
  }

  const collect = (): Partial<FieldSurveyRecord> => {
    /* Use undefined (omitted from JSON) for empty optional fields so the
       backend never receives empty-string values it may reject.           */
    const str = (v?: string) => v?.trim() || undefined
    return {
      survey_date:        r.surveyDate.current?.value?.trim() || todayISO(),
      voter_name:         r.voterName.current?.value?.trim()  || '',
      age:                r.age.current?.value ? Number(r.age.current.value) : undefined,
      booth_no:           str(r.booth.current?.value),
      gender:             str(r.gender.current?.value),
      phone:              str(r.phone.current?.value),
      address:            str(r.address.current?.value),
      support_level:      str(r.supportLevel.current?.value),
      party_preference:   str(r.partyPref.current?.value),
      response_status:    str(r.responseStatus.current?.value),
      key_issues:         str(r.keyIssues.current?.value),
      remarks:            str(r.remarks.current?.value),
      surveyed_by:        str(r.telecaller.current?.value),
      is_registered:      registered      || undefined,
      aware_of_candidate: awareOfCandidate || undefined,
      likely_to_vote:     likelyToVote    || undefined,
    }
  }

  const closeForm = () => { setFormOpen(false); setEditingId(null); clear() }

  const handleSave = async () => {
    const d = collect()
    if (!d.voter_name) { showToast('<i class="ph ph-warning"></i> Voter name is required!', '#dc2626'); return }

    if (editingId !== null) {
      /* Merge: keep original values for any field collect() left as undefined */
      const original = records.find(rec => rec.id === editingId)
      const payload  = original
        ? { ...original, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) }
        : d
      const updated = await updateFieldSurvey(editingId, payload)
      if (updated) {
        setRecords(prev => prev.map(rec => rec.id === editingId ? updated : rec))
        showToast('<i class="ph ph-check-circle"></i> Feedback updated!', '#138808')
        closeForm()
        setFilterStatus('done')   // show Action Taken list after update
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update feedback.', '#dc2626')
      }
    } else {
      const created = await createFieldSurvey(d)
      if (created) {
        setRecords(prev => [created, ...prev])
        showToast('<i class="ph ph-check-circle"></i> Feedback saved!', '#138808')
        closeForm()
        setFilterStatus('done')   // show Action Taken list after submit
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save feedback.', '#dc2626')
      }
    }
  }

  const handleVoterClick = (voter: FlatVoter) => {
    const existing = records.find(rec =>
      rec.voter_name?.toLowerCase() === voter.name.toLowerCase() &&
      (!voter.phone || rec.phone === voter.phone)
    )
    if (existing) {
      pendingFill.current = existing
      setEditingId(existing.id)
    } else {
      selectedVoterRef.current = voter
      setEditingId(null)
    }
    setFormOpen(true)
    setFillKey(k => k + 1)
  }

  const handleEditRecord = (rec: FieldSurveyRecord) => {
    pendingFill.current = rec
    setEditingId(rec.id)
    setFormOpen(true)
    setFillKey(k => k + 1)
  }

  const handleDelete = async (id: number) => {
    const ok = await deleteFieldSurvey(id)
    if (ok) setRecords(prev => prev.filter(rec => rec.id !== id))
  }

  /* Map voter name → feedback record */
  const recordByVoterName = useMemo(() => {
    const map = new Map<string, FieldSurveyRecord>()
    records.forEach(rec => {
      if (rec.voter_name) map.set(rec.voter_name.toLowerCase(), rec)
    })
    return map
  }, [records])

  /* Filtered voter list */
  const filteredVoters = useMemo(() => {
    let list = allVoters
    if (filterTelecaller) list = list.filter(v => String(v.telecaller_id) === filterTelecaller)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        (v.voter_id ?? '').toLowerCase().includes(q) ||
        (v.phone ?? '').includes(q)
      )
    }
    return list
  }, [allVoters, filterTelecaller, search])

  const pendingVoters = filteredVoters.filter(v => !recordByVoterName.has(v.name.toLowerCase()))
  const doneVoters    = filteredVoters.filter(v =>  recordByVoterName.has(v.name.toLowerCase()))

  const displayPending = filterStatus !== 'done'
  const displayDone    = filterStatus !== 'pending'

  /* ── Pagination ── */
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [filterStatus, filterTelecaller, search])

  const activeList = filterStatus === 'pending' ? pendingVoters
                   : filterStatus === 'done'    ? doneVoters
                   : filteredVoters

  const totalPages  = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE))
  const pagedList   = activeList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pagedPending = pagedList.filter(v => !recordByVoterName.has(v.name.toLowerCase()))
  const pagedDone    = pagedList.filter(v =>  recordByVoterName.has(v.name.toLowerCase()))

  const pageNums: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const nums: (number | '...')[] = [1]
    if (page > 3) nums.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i)
    if (page < totalPages - 2) nums.push('...')
    nums.push(totalPages)
    return nums
  })()

  const genderLabel = (g?: string) =>
    g === 'm' || g === 'Male' ? 'Male' :
    g === 'f' || g === 'Female' ? 'Female' :
    g === 'o' || g === 'Other' ? 'Other' : ''

  /* ── Voter row ── */
  const VoterRow = ({ voter }: { voter: FlatVoter }) => {
    const rec  = recordByVoterName.get(voter.name.toLowerCase())
    const done = !!rec

    return (
      <div className={`border-b border-border ${done ? 'bg-green-50/30' : ''}`}>

        {/* ── Main row ── */}
        <div className="flex items-center gap-3 px-5 py-3">

          {/* Status avatar */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold
            ${done ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
            {done
              ? <i className="ph ph-check-circle text-[18px]" />
              : <span>{voter.name.charAt(0).toUpperCase()}</span>
            }
          </div>

          {/* Voter info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-heading">{voter.name}</span>
              <span className="text-[10px] text-muted font-mono">{voter.voter_id}</span>
              {voter.phone && <span className="text-[10px] text-muted">· {voter.phone}</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {voter.booth_name && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-navy/10 text-navy font-medium">
                  {voter.booth_name}
                </span>
              )}
              {genderLabel(voter.gender) && (
                <span className="text-[10px] text-muted">
                  {genderLabel(voter.gender)}{voter.age ? `, ${voter.age}` : ''}
                </span>
              )}
              <span className="text-[10px] text-muted hidden sm:inline">
                <i className="ph ph-headset mr-0.5" />{voter.telecaller_name}
              </span>
            </div>
          </div>

          {/* Update button — same for all voters */}
          <button
            onClick={() => done && rec ? handleEditRecord(rec) : handleVoterClick(voter)}
            className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg border border-navy bg-navy text-white text-[11px] font-semibold hover:bg-navy/90 transition-colors flex-shrink-0"
          >
            <i className="ph ph-arrow-clockwise text-[12px]" />
            Update
          </button>
        </div>

        {/* ── Inline feedback record (Action Taken) ── */}
        {done && rec && (
          <div className="mx-5 mb-3 rounded-lg border border-green-200 bg-white overflow-hidden">

            {/* Header bar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-b border-green-100 flex-wrap">
              <i className="ph ph-check-circle text-[13px] text-green-600" />
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Feedback Submitted</span>
              <span className="text-[10px] text-muted">{rec.survey_date}</span>
              {rec.surveyed_by && (
                <span className="text-[10px] text-muted">
                  · <i className="ph ph-headset" /> {rec.surveyed_by}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => handleEditRecord(rec)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-green-700 hover:bg-green-100 transition-colors"
                >
                  <i className="ph ph-arrow-clockwise text-[11px]" /> Update
                </button>
                <button
                  onClick={() => handleDelete(rec.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-red-400 hover:bg-red-50 transition-colors"
                >
                  <i className="ph ph-trash text-[11px]" /> Delete
                </button>
              </div>
            </div>

            {/* Feedback detail pills */}
            <div className="flex flex-wrap gap-2 px-3 py-2">
              {rec.support_level && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${supportColor(rec.support_level)}`}>
                  <i className="ph ph-hand-pointing mr-1" />{rec.support_level}
                </span>
              )}
              {rec.response_status && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${responseColor(rec.response_status)}`}>
                  <i className="ph ph-phone mr-1" />{responseLabel(rec.response_status)}
                </span>
              )}
              {rec.aware_of_candidate && rec.aware_of_candidate !== '' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                  Aware: {rec.aware_of_candidate}
                </span>
              )}
              {rec.likely_to_vote && rec.likely_to_vote !== '' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                  Vote: {rec.likely_to_vote}
                </span>
              )}
              {rec.party_preference && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                  <i className="ph ph-flag mr-1" />{rec.party_preference}
                </span>
              )}
              {rec.remarks && (
                <span className="text-[10px] text-muted italic truncate max-w-[260px]">
                  "{rec.remarks}"
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════ */
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <i className="ph ph-phone-outgoing text-[18px] text-navy" />
            <div>
              <h2 className="text-[14px] font-bold text-heading">Telecalling Feedback</h2>
              {allVoters.length > 0 ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold">
                    <i className="ph ph-clock text-[10px]" />
                    {allVoters.filter(v => !recordByVoterName.has(v.name.toLowerCase())).length} Not Yet Action Taken
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                    <i className="ph ph-check-circle text-[10px]" />
                    {allVoters.filter(v => recordByVoterName.has(v.name.toLowerCase())).length} Action Taken
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-muted">No assigned voters yet</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-surface-alt border-b border-border">
          {/* Status tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-semibold">
            {([
              { key: 'all',     label: 'All',                  count: allVoters.length },
              { key: 'pending', label: 'Not Yet Action Taken',  count: allVoters.filter(v => !recordByVoterName.has(v.name.toLowerCase())).length },
              { key: 'done',    label: 'Action Taken',          count: allVoters.filter(v =>  recordByVoterName.has(v.name.toLowerCase())).length },
            ] as const).map(tab => (
              <button key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-[6px] flex items-center gap-1.5 transition-colors border-r border-border last:border-r-0
                  ${filterStatus === tab.key
                    ? tab.key === 'done'    ? 'bg-green-500 text-white'
                      : tab.key === 'pending' ? 'bg-orange-400 text-white'
                      : 'bg-navy text-white'
                    : 'bg-surface text-muted hover:bg-border'}`}>
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold
                  ${filterStatus === tab.key ? 'bg-white/25 text-white' : 'bg-border text-muted'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Telecaller filter */}
          <select value={filterTelecaller} onChange={e => setFilterTelecaller(e.target.value)}
            className={`${selectCls} w-[180px]`}>
            <option value="">All Telecallers</option>
            {telecallerOptions.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <i className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted pointer-events-none" />
            <input type="text" placeholder="Name, voter ID, phone…"
              value={search} onChange={e => setSearch(e.target.value)}
              className={`${inputCls} pl-7 w-full`} />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                <i className="ph ph-x text-[11px]" />
              </button>
            )}
          </div>

          {(filterTelecaller || search) && (
            <button onClick={() => { setFilterTelecaller(''); setSearch('') }}
              className="flex items-center gap-1 px-3 py-[6px] rounded-lg border border-rose-200 bg-rose-50 text-rose-500 text-[11px] font-medium hover:bg-rose-100 transition-colors">
              <i className="ph ph-x text-[11px]" /> Clear
            </button>
          )}
        </div>

        {/* ── List ── */}
        {allVoters.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <i className="ph ph-phone-slash text-[36px] text-border block mb-3" />
            <p className="text-[13px] font-semibold text-heading mb-1">No assigned voters yet</p>
            <p className="text-[11px] text-muted">Go to <strong>Assign Telecalling</strong> to assign voters first.</p>
          </div>
        ) : (
          <>
            {/* Not Yet Action Taken */}
            {displayPending && pagedPending.length > 0 && (
              <>
                <SectionLabel
                  icon="ph ph-clock text-orange-500"
                  label="Not Yet Action Taken"
                  count={pendingVoters.length}
                  color="bg-orange-50 text-orange-600"
                />
                {pagedPending.map((voter, i) => (
                  <VoterRow key={`p-${voter.telecaller_id}-${voter.id}-${i}`} voter={voter} />
                ))}
              </>
            )}

            {/* Action Taken */}
            {displayDone && pagedDone.length > 0 && (
              <>
                <SectionLabel
                  icon="ph ph-check-circle text-green-600"
                  label="Action Taken"
                  count={doneVoters.length}
                  color="bg-green-50 text-green-700"
                />
                {pagedDone.map((voter, i) => (
                  <VoterRow key={`d-${voter.telecaller_id}-${voter.id}-${i}`} voter={voter} />
                ))}
              </>
            )}

            {/* No match */}
            {filteredVoters.length === 0 && (
              <div className="px-5 py-12 text-center">
                <i className="ph ph-magnifying-glass text-[30px] text-border block mb-2" />
                <p className="text-[12px] text-muted">No voters match your filter.</p>
              </div>
            )}
            {filteredVoters.length > 0 && !displayPending && pendingVoters.length === 0 && (
              <div className="px-5 py-8 text-center text-[12px] text-muted">
                No pending voters.
              </div>
            )}
            {filteredVoters.length > 0 && !displayDone && doneVoters.length === 0 && (
              <div className="px-5 py-8 text-center text-[12px] text-muted">
                No completed voters yet.
              </div>
            )}

            {/* ── Pagination controls ── */}
            {activeList.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-alt">
                <span className="text-[11px] text-muted">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, activeList.length)} of {activeList.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted
                               hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="ph ph-caret-left" />
                  </button>

                  {pageNums.map((n, i) =>
                    n === '...'
                      ? <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-muted">…</span>
                      : <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`min-w-[28px] px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors
                            ${page === n
                              ? 'bg-navy text-white border-navy'
                              : 'border-border text-muted hover:bg-border'}`}
                        >
                          {n}
                        </button>
                  )}

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted
                               hover:bg-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="ph ph-caret-right" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Form Panel ── */}
      <EntryFormPanel
        id="voter-survey-form" title="Voter Survey Form" icon="ph ph-notepad"
        isOpen={isFormOpen} isEditing={editingId !== null}
        onClose={closeForm}
      >
        <FormRow cols={2}>
          <FormGroup label="Survey Date" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                <i className="ph ph-calendar text-[15px]" />
              </span>
              <input ref={r.surveyDate} type="date" className={inputCls + ' pl-9'} defaultValue={todayISO()} />
            </div>
          </FormGroup>
          <FormGroup label="Telecaller">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                <i className="ph ph-headset text-[15px]" />
              </span>
              <input ref={r.telecaller} className={inputCls + ' pl-9'} placeholder="Telecaller name" />
            </div>
          </FormGroup>
        </FormRow>

        <div className="flex items-center gap-2 mt-4 mb-3">
          <i className="ph ph-user text-saffron text-[14px]" />
          <span className="text-[11px] font-bold text-navy uppercase tracking-[1px]">Voter Details</span>
        </div>

        <FormRow cols={2}>
          <FormGroup label="Voter Name" required>
            <input ref={r.voterName} className={inputCls} placeholder="Full name of the voter" />
          </FormGroup>
          <FormGroup label="Booth No.">
            <input ref={r.booth} className={inputCls} placeholder="Polling booth number" />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Age">
            <input ref={r.age} type="number" className={inputCls} placeholder="Age" min="18" max="120" />
          </FormGroup>
          <FormGroup label="Gender">
            <select ref={r.gender} className={selectCls}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Phone Number">
            <input ref={r.phone} type="tel" className={inputCls} placeholder="Mobile number" />
          </FormGroup>
          <FormGroup label="Address">
            <input ref={r.address} className={inputCls} placeholder="Door no., street, locality" />
          </FormGroup>
        </FormRow>

        <div className="flex items-center gap-2 mt-4 mb-3">
          <i className="ph ph-list-checks text-saffron text-[14px]" />
          <span className="text-[11px] font-bold text-navy uppercase tracking-[1px]">Survey Questions</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <FormGroup label="Response Status">
              <select ref={r.responseStatus} className={selectCls}>
                <option value="">Select status</option>
                <option value="interested">Interested</option>
                <option value="not_reach">Not Reach</option>
                <option value="not_attend_call">Not Attend Call</option>
                <option value="need_followups">Need Followup</option>
              </select>
            </FormGroup>
          </FormRow>
          <FormRow cols={2}>
            <FormGroup label="Party Preference">
              <select ref={r.partyPref} className={selectCls}>
                <option value="">Select party</option>
                <option>BJP</option><option>AIADMK</option><option>DMK</option>
                <option>Congress</option><option>PMK</option><option>DMDK</option>
                <option>Other</option><option>No Preference</option>
              </select>
            </FormGroup>
            <FormGroup label="Key Issues / Concerns">
              <textarea ref={r.keyIssues} className={textareaCls} rows={3}
                placeholder="Water, roads, electricity, employment..." />
            </FormGroup>
          </FormRow>
          <FormRow cols={1}>
            <FormGroup label="Remarks / Additional Notes">
              <textarea ref={r.remarks} className={textareaCls} rows={3}
                placeholder="Any other observations from the voter..." />
            </FormGroup>
          </FormRow>
        </div>

        <div className="flex gap-3 mt-5">
          <button type="button" onClick={handleSave}
            className="flex-1 py-[12px] rounded-lg bg-saffron text-white font-inter font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-saffron-dark active:scale-[0.99] transition-all duration-150 shadow-md">
            <i className="ph ph-paper-plane-tilt text-[15px]" />
            {editingId !== null ? 'Update Survey' : 'Submit Survey'}
          </button>
          <button type="button" onClick={clear}
            className="flex-1 py-[12px] rounded-lg bg-navy text-white font-inter font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-[#163070] active:scale-[0.99] transition-all duration-150 shadow-md">
            <i className="ph ph-arrow-counter-clockwise text-[15px]" />
            Clear
          </button>
        </div>
      </EntryFormPanel>
    </div>
  )
}
