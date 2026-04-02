import { useRef, useState, useEffect, useMemo } from 'react'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { FieldSurveyRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import apiClient from '../../utils/api'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import { todayISO } from '../../utils/formatters'
import { useToast } from '../../context/ToastContext'
import { usePermissions } from '../../context/PermissionContext'

type YNS = 'Yes' | 'No' | 'Not Sure' | ''

interface FeedbackDecision {
  survey: number
  action: 'followup_required' | 'followup_not_required'
  followup_type?: 'telephonic' | 'field_survey'
}

/* ── Toggle group (Yes / No / Not Sure) ── */
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
                ? opt === 'Yes'      ? 'bg-kampgreen text-white border-kampgreen shadow-sm'
                  : opt === 'No'     ? 'bg-kampr text-white border-kampr shadow-sm'
                  : 'bg-navy text-white border-navy shadow-sm'
                : 'bg-white text-muted border-border hover:border-navy hover:text-navy'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Section label ── */
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

/* ── Badge helpers ── */
const supportColor = (s?: string) => {
  if (!s) return 'bg-border text-muted'
  if (s === 'positive') return 'bg-green-100 text-green-700'
  if (s === 'negative') return 'bg-red-100 text-red-600'
  if (s === 'neutral')  return 'bg-yellow-100 text-yellow-700'
  return 'bg-blue-100 text-blue-700'
}
const responseColor = (s?: string) => {
  if (!s) return 'bg-border text-muted'
  if (s === 'not_reach')     return 'bg-red-100 text-red-600'
  if (s === 'no_answer')     return 'bg-orange-100 text-orange-600'
  if (s === 'need_followup') return 'bg-purple-100 text-purple-700'
  return 'bg-border text-muted'
}
const responseLabel = (s?: string) => {
  if (s === 'not_reach')     return 'Not Reach'
  if (s === 'no_answer')     return 'No Answer'
  if (s === 'need_followup') return 'Need Followup'
  return s || ''
}
const genderLabel = (g?: string) =>
  g === 'm' || g === 'Male'   ? 'Male'   :
  g === 'f' || g === 'Female' ? 'Female' :
  g === 'o' || g === 'Other'  ? 'Other'  : ''

/* ════════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════════ */
export default function FieldActivityEntry() {
  const { fetchFieldSurveys, updateFieldSurvey } = useEntryAPI()
  const masterApi = useMasterAPI()
  const { showToast } = useToast()
  const { canEdit } = usePermissions()

  /* ── Data ── */
  const [records,   setRecords]   = useState<FieldSurveyRecord[]>([])
  const [fieldIds,  setFieldIds]  = useState<Set<number>>(new Set())   // survey IDs tracked in field flow
  const [decisionBySurvey, setDecisionBySurvey] = useState<Map<number, FeedbackDecision>>(new Map())

  /* ── Master data ── */
  const [masterBooths,     setMasterBooths]     = useState<{ id: number; number: string; name: string; panchayat_name?: string }[]>([])
  const [masterPanchayats, setMasterPanchayats] = useState<{ id: number; name: string; union_name?: string }[]>([])
  const [masterParties,    setMasterParties]    = useState<{ id: number; name: string; abbreviation?: string }[]>([])
  const [volunteers,       setVolunteers]       = useState<{ id: number; name?: string; phone?: string; role?: string }[]>([])

  useEffect(() => {
    // Fetch all surveys
    fetchFieldSurveys().then(res => { if (res) setRecords(res) })

    // Build field-flow survey IDs + latest decision map.
    Promise.allSettled([
      apiClient.get('/activities/logs/', { params: { limit: 1000, category: 'field' } }),
      apiClient.get('/telecalling/feedbacks/', { params: { limit: 1000 } }),
    ]).then(([logsRes, decisionsRes]) => {
      const ids = new Set<number>()

      if (logsRes.status === 'fulfilled') {
        const logs: { notes?: string }[] = logsRes.value.data.results ?? []
        logs.forEach(log => {
          const match = log.notes?.match(/\[survey_id:(\d+)\]/)
          if (match) ids.add(parseInt(match[1]))
        })
      }

      if (decisionsRes.status === 'fulfilled') {
        const raw: FeedbackDecision[] = decisionsRes.value.data.results ?? []
        const latestBySurvey = new Map<number, FeedbackDecision>()

        raw.forEach(d => {
          if (!latestBySurvey.has(d.survey)) {
            latestBySurvey.set(d.survey, d)
          }
          if (d.followup_type === 'field_survey') {
            ids.add(d.survey)
          }
        })

        setDecisionBySurvey(latestBySurvey)
      }

      setFieldIds(ids)
    })

    // Master lookups
    masterApi.fetchBooths().then(d => d && setMasterBooths(d))
    masterApi.fetchPanchayats().then(d => d && setMasterPanchayats(d))
    masterApi.fetchParties().then(d => d && setMasterParties(d))
    apiClient.get('/volunteers/volunteers/', { params: { status: 'active', limit: 500 } })
      .then(res => setVolunteers(res.data.results ?? []))
      .catch(() => {})
  }, [])

  /* ── Lookup maps ── */
  const boothPanchayatMap = useMemo(() => {
    const m = new Map<string, string>()
    masterBooths.forEach(b => { if (b.panchayat_name) m.set(b.number, b.panchayat_name) })
    return m
  }, [masterBooths])

  const panchayatUnionMap = useMemo(() => {
    const m = new Map<string, string>()
    masterPanchayats.forEach(p => { if (p.union_name) m.set(p.name, p.union_name) })
    return m
  }, [masterPanchayats])

  const getPanchayat = (s: FieldSurveyRecord) => boothPanchayatMap.get(s.booth_no ?? '')
  const getUnion     = (s: FieldSurveyRecord) => {
    const pan = getPanchayat(s)
    return pan ? panchayatUnionMap.get(pan) : undefined
  }

  /* ── Only show surveys flagged as field_survey ── */
  const fieldSurveys = useMemo(
    () => records.filter(r => fieldIds.has(r.id)),
    [records, fieldIds]
  )

  /* ── Filters ── */
  const [filterStatus,    setFilterStatus]    = useState<'all' | 'pending' | 'done'>('all')
  const [filterVolunteer, setFilterVolunteer] = useState('')
  const [search,          setSearch]          = useState('')

  const filtered = useMemo(() => {
    let list = fieldSurveys
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.voter_name?.toLowerCase().includes(q) ||
        s.booth_no?.includes(q) ||
        s.block?.toLowerCase().includes(q)
      )
    }
    if (filterVolunteer) {
      list = list.filter(s => s.assigned_volunteer === filterVolunteer)
    }
    if (filterStatus === 'pending') {
      list = list.filter(s => decisionBySurvey.get(s.id)?.action !== 'followup_not_required')
    }
    if (filterStatus === 'done') {
      list = list.filter(s => decisionBySurvey.get(s.id)?.action === 'followup_not_required')
    }
    return list
  }, [fieldSurveys, search, filterVolunteer, filterStatus, decisionBySurvey])

  const pendingList = filtered.filter(s => decisionBySurvey.get(s.id)?.action !== 'followup_not_required')
  const completedList = filtered.filter(s => decisionBySurvey.get(s.id)?.action === 'followup_not_required')

  const volunteerOptions = useMemo(() => {
    const seen = new Set<string>()
    fieldSurveys.forEach(s => { if (s.assigned_volunteer) seen.add(s.assigned_volunteer) })
    return [...seen]
  }, [fieldSurveys])

  /* ── Pagination ── */
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [filterStatus, filterVolunteer, search])

  const activeList  = filterStatus === 'pending' ? pendingList : filterStatus === 'done' ? completedList : filtered
  const totalPages  = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE))
  const pagedList   = activeList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pagedPending = pagedList.filter(s => decisionBySurvey.get(s.id)?.action !== 'followup_not_required')
  const pagedCompleted = pagedList.filter(s => decisionBySurvey.get(s.id)?.action === 'followup_not_required')

  /* ── Form ── */
  const [isFormOpen,       setFormOpen]       = useState(false)
  const [editingId,        setEditingId]      = useState<number | null>(null)
  const [awareOfCandidate, setAwareOfCandidate] = useState<YNS>('')
  const [likelyToVote,     setLikelyToVote]     = useState<YNS>('')
  const pendingFill = useRef<FieldSurveyRecord | null>(null)
  const [fillKey,   setFillKey] = useState(0)

  const r = {
    surveyDate:     useRef<HTMLInputElement>(null),
    voterName:      useRef<HTMLInputElement>(null),
    booth:          useRef<HTMLInputElement>(null),
    block:          useRef<HTMLInputElement>(null),
    panchayat:      useRef<HTMLInputElement>(null),
    union:          useRef<HTMLInputElement>(null),
    age:            useRef<HTMLInputElement>(null),
    gender:         useRef<HTMLSelectElement>(null),
    phone:          useRef<HTMLInputElement>(null),
    address:        useRef<HTMLInputElement>(null),
    volunteer:      useRef<HTMLSelectElement>(null),
    supportLevel:   useRef<HTMLSelectElement>(null),
    partyPref:      useRef<HTMLSelectElement>(null),
    responseStatus: useRef<HTMLSelectElement>(null),
    remarks:        useRef<HTMLTextAreaElement>(null),
  }

  useEffect(() => {
    if (!isFormOpen || !pendingFill.current) return
    const d = pendingFill.current
    const pan = boothPanchayatMap.get(d.booth_no ?? '')
    const uni = pan ? panchayatUnionMap.get(pan) : undefined

    if (r.surveyDate.current)     r.surveyDate.current.value     = d.survey_date           ?? todayISO()
    if (r.voterName.current)      r.voterName.current.value      = d.voter_name             ?? ''
    if (r.booth.current)          r.booth.current.value          = d.booth_no               ?? ''
    if (r.block.current)          r.block.current.value          = d.block                  ?? ''
    if (r.panchayat.current)      r.panchayat.current.value      = pan                      ?? ''
    if (r.union.current)          r.union.current.value          = uni                      ?? ''
    if (r.age.current)            r.age.current.value            = d.age != null ? String(d.age) : ''
    if (r.gender.current)         r.gender.current.value         = genderLabel(d.gender)    ?? ''
    if (r.phone.current)          r.phone.current.value          = d.phone                  ?? ''
    if (r.address.current)        r.address.current.value        = d.address                ?? ''
    if (r.volunteer.current)      r.volunteer.current.value      = d.assigned_volunteer     ?? ''
    if (r.supportLevel.current)   r.supportLevel.current.value   = d.support_level          ?? ''
    if (r.partyPref.current)      r.partyPref.current.value      = d.party_preference       ?? ''
    if (r.responseStatus.current) r.responseStatus.current.value = d.response_status        ?? ''
    if (r.remarks.current)        r.remarks.current.value        = d.remarks                ?? ''
    setAwareOfCandidate((d.aware_of_candidate as YNS) ?? '')
    setLikelyToVote((d.likely_to_vote as YNS) ?? '')
    pendingFill.current = null
  }, [fillKey, isFormOpen])

  const openForm = (survey: FieldSurveyRecord) => {
    pendingFill.current = survey
    setEditingId(survey.id)
    setFormOpen(true)
    setFillKey(k => k + 1)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setAwareOfCandidate('')
    setLikelyToVote('')
  }

  const handleSave = async () => {
    if (editingId === null) return
    const str = (v?: string) => v?.trim() || undefined
    const volunteerName = volunteers.find(v => String(v.id) === r.volunteer.current?.value)?.name
      ?? r.volunteer.current?.value
      ?? undefined

    const original = records.find(rec => rec.id === editingId)
    const payload: Partial<FieldSurveyRecord> = {
      ...original,
      survey_date:        r.surveyDate.current?.value?.trim()     || todayISO(),
      support_level:      str(r.supportLevel.current?.value),
      party_preference:   str(r.partyPref.current?.value),
      response_status:    str(r.responseStatus.current?.value),
      remarks:            str(r.remarks.current?.value),
      aware_of_candidate: awareOfCandidate  || undefined,
      likely_to_vote:     likelyToVote      || undefined,
      assigned_volunteer: str(volunteerName),
    }

    const updated = await updateFieldSurvey(editingId, payload)
    if (updated) {
      setRecords(prev => prev.map(rec => rec.id === editingId ? updated : rec))
      showToast('<i class="ph ph-check-circle"></i> Field survey updated!', '#138808')
      closeForm()
    } else {
      showToast('<i class="ph ph-x-circle"></i> Failed to update survey.', '#dc2626')
    }
  }

  /* ── Survey row ── */
  const SurveyRow = ({ survey }: { survey: FieldSurveyRecord }) => {
    const pan       = getPanchayat(survey)
    const uni       = getUnion(survey)
    const completed = decisionBySurvey.get(survey.id)?.action === 'followup_not_required'

    return (
      <div className={`border-b border-border ${completed ? 'bg-green-50/30' : ''}`}>

        {/* Main row */}
        <div className="flex items-start gap-3 px-5 py-3">

          {/* Avatar */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold mt-0.5
            ${completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {completed
              ? <i className="ph ph-check-circle text-[18px]" />
              : <span>{survey.voter_name?.charAt(0)?.toUpperCase() ?? '?'}</span>
            }
          </div>

          {/* Voter info */}
          <div className="flex-1 min-w-0">
            {/* Name + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-heading">{survey.voter_name}</span>
              {survey.booth_no && (
                <span className="px-1.5 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-medium">
                  Booth {survey.booth_no}
                </span>
              )}
              {survey.support_level && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${supportColor(survey.support_level)}`}>
                  {survey.support_level}
                </span>
              )}
              {survey.party_preference && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-100">
                  <i className="ph ph-flag mr-0.5" />{survey.party_preference}
                </span>
              )}
              {survey.response_status && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${responseColor(survey.response_status)}`}>
                  {responseLabel(survey.response_status)}
                </span>
              )}
            </div>

            {/* Location hierarchy */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {survey.block && (
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  <i className="ph ph-squares-four text-[11px] text-navy/40" />
                  <span className="font-medium text-navy/70">Block:</span> {survey.block}
                </span>
              )}
              {pan && (
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  <i className="ph ph-tree-structure text-[11px] text-navy/40" />
                  <span className="font-medium text-navy/70">Panchayat:</span> {pan}
                </span>
              )}
              {uni && (
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  <i className="ph ph-buildings text-[11px] text-navy/40" />
                  <span className="font-medium text-navy/70">Union:</span> {uni}
                </span>
              )}
            </div>

            {/* Voter details */}
            <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px] text-muted">
              {genderLabel(survey.gender) && (
                <span>{genderLabel(survey.gender)}{survey.age ? `, ${survey.age}` : ''}</span>
              )}
              {survey.phone && <span><i className="ph ph-phone mr-0.5" />{survey.phone}</span>}
              {survey.survey_date && <span><i className="ph ph-calendar mr-0.5" />{survey.survey_date}</span>}
              {survey.assigned_volunteer && (
                <span className="flex items-center gap-1 text-green-700 font-medium">
                  <i className="ph ph-user-check text-[11px]" />
                  {survey.assigned_volunteer}
                </span>
              )}
            </div>
          </div>

          {/* Action button */}
          {canEdit('field-activity') && (
            <button
              onClick={() => openForm(survey)}
              disabled={completed}
              className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg border border-navy bg-navy text-white text-[11px] font-semibold hover:bg-navy/90 transition-colors flex-shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <i className="ph ph-pencil text-[12px]" />
              {completed ? 'Completed' : 'Update'}
            </button>
          )}
        </div>

        {/* Inline completed record */}
        {completed && (
          <div className="mx-5 mb-3 rounded-lg border border-green-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-b border-green-100 flex-wrap">
              <i className="ph ph-map-trifold text-[13px] text-green-600" />
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Action Taken</span>
              <span className="text-[10px] text-muted">{survey.survey_date}</span>
              {survey.assigned_volunteer && (
                <span className="text-[10px] text-muted">
                  · <i className="ph ph-user-check" /> {survey.assigned_volunteer}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 px-3 py-2">
              {survey.support_level && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${supportColor(survey.support_level)}`}>
                  <i className="ph ph-hand-pointing mr-1" />{survey.support_level}
                </span>
              )}
              {survey.response_status && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${responseColor(survey.response_status)}`}>
                  <i className="ph ph-phone mr-1" />{responseLabel(survey.response_status)}
                </span>
              )}
              {survey.aware_of_candidate && survey.aware_of_candidate !== '' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                  Aware: {survey.aware_of_candidate}
                </span>
              )}
              {survey.likely_to_vote && survey.likely_to_vote !== '' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                  Vote: {survey.likely_to_vote}
                </span>
              )}
              {survey.party_preference && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                  <i className="ph ph-flag mr-1" />{survey.party_preference}
                </span>
              )}
              {survey.remarks && (
                <span className="text-[10px] text-muted italic truncate max-w-[300px]">"{survey.remarks}"</span>
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
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <i className="ph ph-map-trifold text-[20px] text-navy" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold text-heading">Field Survey</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                {fieldSurveys.filter(s => decisionBySurvey.get(s.id)?.action !== 'followup_not_required').length} Not Yet Action Taken
              </span>
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                {fieldSurveys.filter(s => decisionBySurvey.get(s.id)?.action === 'followup_not_required').length} Action Taken
              </span>
              <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-semibold">
                {fieldSurveys.length} Total Field Surveys
              </span>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-surface-alt border-b border-border">
          {/* Status tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-semibold">
            {([
              { key: 'all',     label: 'All',             count: fieldSurveys.length },
              { key: 'pending', label: 'Not Yet Action Taken', count: fieldSurveys.filter(s => decisionBySurvey.get(s.id)?.action !== 'followup_not_required').length },
              { key: 'done',    label: 'Action Taken',         count: fieldSurveys.filter(s => decisionBySurvey.get(s.id)?.action === 'followup_not_required').length },
            ] as const).map(tab => (
              <button key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-[6px] flex items-center gap-1.5 transition-colors border-r border-border last:border-r-0
                  ${filterStatus === tab.key
                    ? tab.key === 'done'    ? 'bg-green-500 text-white'
                      : tab.key === 'pending' ? 'bg-amber-500 text-white'
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

          {/* Volunteer filter */}
          {volunteerOptions.length > 0 && (
            <select value={filterVolunteer} onChange={e => setFilterVolunteer(e.target.value)}
              className={`${selectCls} w-[180px]`}>
              <option value="">All Volunteers</option>
              {volunteerOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <i className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted pointer-events-none" />
            <input type="text" placeholder="Voter name, booth, block…"
              value={search} onChange={e => setSearch(e.target.value)}
              className={`${inputCls} pl-7 w-full`} />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                <i className="ph ph-x text-[11px]" />
              </button>
            )}
          </div>

          {(filterVolunteer || search) && (
            <button onClick={() => { setFilterVolunteer(''); setSearch('') }}
              className="flex items-center gap-1 px-3 py-[6px] rounded-lg border border-rose-200 bg-rose-50 text-rose-500 text-[11px] font-medium hover:bg-rose-100 transition-colors">
              <i className="ph ph-x text-[11px]" /> Clear
            </button>
          )}
        </div>

        {/* ── List ── */}
        {fieldSurveys.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <i className="ph ph-map-trifold text-[36px] text-border block mb-3" />
            <p className="text-[13px] font-semibold text-heading mb-1">No field surveys yet</p>
            <p className="text-[11px] text-muted">
              Go to <strong>Feedback Review</strong> and mark surveys as
              <strong> Followup Required → Field Survey</strong> to populate this list.
            </p>
          </div>
        ) : (
          <>
            {/* Pending section */}
            {filterStatus !== 'done' && pagedPending.length > 0 && (
              <>
                <SectionLabel
                  icon="ph ph-clock text-amber-500"
                  label="Not Yet Action Taken"
                  count={pendingList.length}
                  color="bg-amber-50 text-amber-700"
                />
                {pagedPending.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* Completed section */}
            {filterStatus !== 'pending' && pagedCompleted.length > 0 && (
              <>
                <SectionLabel
                  icon="ph ph-check-circle text-green-600"
                  label="Action Taken"
                  count={completedList.length}
                  color="bg-green-50 text-green-700"
                />
                {pagedCompleted.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {filtered.length === 0 && (
              <div className="px-5 py-10 text-center">
                <i className="ph ph-funnel text-[28px] text-border block mb-2" />
                <p className="text-[12px] text-muted">No records match your filter.</p>
              </div>
            )}

            {/* Pagination */}
            {activeList.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-alt">
                <span className="text-[11px] text-muted">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, activeList.length)} of {activeList.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted hover:bg-border disabled:opacity-40 transition-colors">
                    <i className="ph ph-caret-left" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                      acc.push(p); return acc
                    }, [])
                    .map((p, i) => p === '…'
                      ? <span key={`el-${i}`} className="px-1 text-[10px] text-muted">…</span>
                      : <button key={p} onClick={() => setPage(p as number)}
                          className={`min-w-[28px] px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors
                            ${page === p ? 'bg-navy text-white border-navy' : 'border-border text-muted hover:bg-border'}`}>
                          {p}
                        </button>
                    )
                  }
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted hover:bg-border disabled:opacity-40 transition-colors">
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
        id="field-survey-form"
        title="Field Survey Form"
        icon="ph ph-map-trifold"
        isOpen={isFormOpen}
        isEditing={editingId !== null}
        onClose={closeForm}
      >
        <FormRow cols={2}>
          <FormGroup label="Survey Date">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                <i className="ph ph-calendar text-[15px]" />
              </span>
              <input ref={r.surveyDate} type="date" className={inputCls + ' pl-9'} defaultValue={todayISO()} />
            </div>
          </FormGroup>
          <FormGroup label="Assign Volunteer" required>
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

        {/* ── Voter Details (read-only, pre-filled) ── */}
        <div className="flex items-center gap-2 mt-4 mb-3">
          <i className="ph ph-user text-saffron text-[14px]" />
          <span className="text-[11px] font-bold text-navy uppercase tracking-[1px]">Voter Details</span>
        </div>

        <div className="bg-[#f8fafc] border border-border rounded-[10px] px-4 py-3 mb-4">
          <FormRow cols={2}>
            <FormGroup label="Voter Name">
              <input ref={r.voterName} className={inputCls + ' bg-[#f0f4f8] text-muted cursor-not-allowed'} readOnly />
            </FormGroup>
            <FormGroup label="Booth No.">
              <input ref={r.booth} className={inputCls + ' bg-[#f0f4f8] text-muted cursor-not-allowed'} readOnly />
            </FormGroup>
          </FormRow>
          <FormRow cols={2}>
            <FormGroup label="Block">
              <input ref={r.block} className={inputCls + ' bg-[#f0f4f8] text-muted cursor-not-allowed'} readOnly />
            </FormGroup>
            <FormGroup label="Panchayat">
              <input ref={r.panchayat} className={inputCls + ' bg-[#f0f4f8] text-muted cursor-not-allowed'} readOnly />
            </FormGroup>
          </FormRow>
          <FormRow cols={2}>
            <FormGroup label="Union">
              <input ref={r.union} className={inputCls + ' bg-[#f0f4f8] text-muted cursor-not-allowed'} readOnly />
            </FormGroup>
            <FormGroup label="Gender / Age">
              <div className="flex gap-2">
                <select ref={r.gender} className={selectCls + ' flex-1'}>
                  <option value="">Gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
                <input ref={r.age} type="number" className={inputCls + ' w-20'} placeholder="Age" min="18" max="120" />
              </div>
            </FormGroup>
          </FormRow>
          <FormRow cols={2}>
            <FormGroup label="Phone">
              <input ref={r.phone} type="tel" className={inputCls} placeholder="Mobile number" />
            </FormGroup>
            <FormGroup label="Address">
              <input ref={r.address} className={inputCls} placeholder="Address" />
            </FormGroup>
          </FormRow>
        </div>

        {/* ── Survey Questions ── */}
        <div className="flex items-center gap-2 mb-3">
          <i className="ph ph-list-checks text-saffron text-[14px]" />
          <span className="text-[11px] font-bold text-navy uppercase tracking-[1px]">Field Survey Questions</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <ToggleGroup label="Aware of our candidate?" value={awareOfCandidate} onChange={setAwareOfCandidate} />
          <ToggleGroup label="Likely to vote?" value={likelyToVote} onChange={setLikelyToVote} />
        </div>

        <FormRow cols={2}>
          <FormGroup label="Support Level">
            <select ref={r.supportLevel} className={selectCls}>
              <option value="">Select support level</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
          </FormGroup>
          <FormGroup label="Response Status">
            <select ref={r.responseStatus} className={selectCls}>
              <option value="">Select status</option>
              <option value="not_reach">Not Reach</option>
              <option value="no_answer">No Answer</option>
              <option value="need_followup">Need Followup</option>
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Party Preference">
            <select ref={r.partyPref} className={selectCls}>
              <option value="">Select party</option>
              {masterParties.length > 0
                ? masterParties.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.abbreviation ? `${p.abbreviation} — ${p.name}` : p.name}
                    </option>
                  ))
                : <>
                    <option>BJP</option><option>AIADMK</option><option>DMK</option>
                    <option>Congress</option><option>PMK</option><option>DMDK</option>
                    <option>Other</option><option>No Preference</option>
                  </>
              }
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Remarks / Observations">
            <textarea ref={r.remarks} className={textareaCls} rows={3}
              placeholder="Field visit observations, voter comments…" />
          </FormGroup>
        </FormRow>

        <div className="flex gap-3 mt-5">
          <button type="button" onClick={handleSave}
            className="flex-1 py-[12px] rounded-lg bg-saffron text-white font-inter font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-saffron-dark active:scale-[0.99] transition-all duration-150 shadow-md">
            <i className="ph ph-paper-plane-tilt text-[15px]" />
            Update Field Survey
          </button>
          <button type="button" onClick={closeForm}
            className="flex-1 py-[12px] rounded-lg bg-navy text-white font-inter font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-[#163070] active:scale-[0.99] transition-all duration-150 shadow-md">
            <i className="ph ph-x text-[15px]" />
            Cancel
          </button>
        </div>
      </EntryFormPanel>
    </div>
  )
}
