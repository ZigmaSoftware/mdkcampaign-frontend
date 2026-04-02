import { useState, useEffect, useMemo, useCallback } from 'react'
import apiClient from '../../utils/api'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import { selectCls, inputCls } from '../../components/entry/FormGroup'
import { useToast } from '../../context/ToastContext'

/* ── Types ── */
interface SurveyRecord {
  id:                  number
  voter_name:          string
  phone?:              string
  booth_no?:           string
  block?:              string
  village?:            string
  support_level?:      string
  party_preference?:   string
  response_status?:    string
  aware_of_candidate?: string
  likely_to_vote?:     string
  remarks?:            string
  surveyed_by?:        string
  survey_date?:        string
}

interface Assignment {
  id:               number
  telecaller_name:  string
  telecaller_phone: string
  assigned_date:    string
  voters: { voter_name: string }[]
}

interface FeedbackDecision {
  id:              number
  survey:          number
  voter_name:      string
  telecaller_name: string
  action:          'followup_required' | 'followup_not_required'
  followup_type?:  'telephonic' | 'field_survey'
  date:            string
}

interface TimelineEvent {
  event_type: string
  timestamp?: string
  date?: string
  user?: string
  remarks?: string
}

interface TimelinePayload {
  survey: number
  voter_name: string
  final_status: string
  events: TimelineEvent[]
}

/* ── Colour helpers ── */
const supportColor = (s?: string) => {
  if (!s) return 'bg-gray-100 text-gray-500'
  if (s === 'positive') return 'bg-green-100 text-green-700'
  if (s === 'negative') return 'bg-red-100 text-red-600'
  if (s === 'neutral')  return 'bg-yellow-100 text-yellow-700'
  return 'bg-blue-100 text-blue-700'
}

const responseLabel = (s?: string) => {
  if (s === 'not_reach')     return 'Not Reach'
  if (s === 'no_answer')     return 'No Answer'
  if (s === 'need_followup') return 'Need Followup'
  return s || '—'
}

const responseColor = (s?: string) => {
  if (s === 'not_reach')     return 'bg-red-100 text-red-600'
  if (s === 'no_answer')     return 'bg-orange-100 text-orange-600'
  if (s === 'need_followup') return 'bg-purple-100 text-purple-700'
  return 'bg-gray-100 text-gray-500'
}

/* ── Section label ── */
function SectionLabel({ icon, label, count, color }: {
  icon: string; label: string; count: number; color: string
}) {
  return (
    <div className={`flex items-center gap-2 px-5 py-2 border-b border-border ${color}`}>
      <i className={icon} />
      <span className="text-[10px] font-bold uppercase tracking-[1px]">{label}</span>
      <span className="ml-auto text-[10px] font-semibold opacity-70">{count}</span>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════════ */
export default function FeedbackReview() {
  const { showToast } = useToast()
  const masterApi = useMasterAPI()

  /* ── Core data ── */
  const [surveys,     setSurveys]     = useState<SurveyRecord[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [decisions,   setDecisions]   = useState<FeedbackDecision[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState<number | null>(null)
  const [expandedFollowup, setExpandedFollowup] = useState<number | null>(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineData, setTimelineData] = useState<TimelinePayload | null>(null)

  /* ── Master data for filters ── */
  const [masterBooths,     setMasterBooths]     = useState<{ id: number; number: string; name: string; panchayat_name?: string }[]>([])
  const [masterBlocks,     setMasterBlocks]     = useState<{ id: number; name: string }[]>([])
  const [masterUnions,     setMasterUnions]     = useState<{ id: number; name: string }[]>([])
  const [masterPanchayats, setMasterPanchayats] = useState<{ id: number; name: string; union_name?: string }[]>([])
  const [masterParties,    setMasterParties]    = useState<{ id: number; name: string; abbreviation?: string }[]>([])

  const fetchAll = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      apiClient.get('/activities/surveys/',      { params: { limit: 1000 } }),
      apiClient.get('/telecalling/assignments/', { params: { limit: 1000 } }),
      apiClient.get('/telecalling/feedbacks/',   { params: { limit: 1000 } }),
      apiClient.get('/activities/logs/',         { params: { limit: 1000, category: 'field' } }),
    ]).then(([s, a, f, l]) => {
      if (s.status === 'fulfilled') setSurveys(s.value.data.results ?? [])
      if (a.status === 'fulfilled') setAssignments(a.value.data.results ?? [])

      // Build survey_id → followup_type map from activity log notes
      // (used to enrich decisions when backend doesn't persist followup_type)
      const logFollowupMap = new Map<number, 'field_survey'>()
      if (l.status === 'fulfilled') {
        const logs: { notes?: string }[] = l.value.data.results ?? []
        logs.forEach(log => {
          const match = log.notes?.match(/\[survey_id:(\d+)\]/)
          if (match) logFollowupMap.set(parseInt(match[1]), 'field_survey')
        })
      }

      if (f.status === 'fulfilled') {
        const raw: FeedbackDecision[] = f.value.data.results ?? []
        // Merge: use backend's followup_type if present, otherwise infer from activity logs
        setDecisions(raw.map(d => ({
          ...d,
          followup_type: d.followup_type ?? logFollowupMap.get(d.survey),
        })))
      }
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchAll()
    masterApi.fetchBooths().then(d => d && setMasterBooths(d))
    masterApi.fetchAreas().then(d => d && setMasterBlocks(d))
    masterApi.fetchUnions().then(d => d && setMasterUnions(d))
    masterApi.fetchPanchayats().then(d => d && setMasterPanchayats(d))
    masterApi.fetchParties().then(d => d && setMasterParties(d))
  }, [fetchAll])

  /* ── Derived maps ── */
  const telecallerByVoterName = useMemo(() => {
    const map = new Map<string, { name: string; phone: string }>()
    assignments.forEach(a =>
      a.voters.forEach(v =>
        map.set(v.voter_name.toLowerCase(), { name: a.telecaller_name, phone: a.telecaller_phone })
      )
    )
    return map
  }, [assignments])

  const decisionMap = useMemo(() => {
    const m = new Map<number, FeedbackDecision>()
    decisions.forEach(d => {
      if (!m.has(d.survey)) {
        m.set(d.survey, d)
      }
    })
    return m
  }, [decisions])

  // booth_no → panchayat_name
  const boothPanchayatMap = useMemo(() => {
    const m = new Map<string, string>()
    masterBooths.forEach(b => { if (b.panchayat_name) m.set(b.number, b.panchayat_name) })
    return m
  }, [masterBooths])

  // panchayat_name → union_name
  const panchayatUnionMap = useMemo(() => {
    const m = new Map<string, string>()
    masterPanchayats.forEach(p => { if (p.union_name) m.set(p.name, p.union_name) })
    return m
  }, [masterPanchayats])

  /* ── Filter states ── */
  const [filterTab,          setFilterTab]          = useState<'all' | 'pending' | 'followup_required' | 'field_survey' | 'telephonic' | 'followup_not_required'>('all')
  const [filterTelecaller,   setFilterTelecaller]   = useState('')
  const [search,             setSearch]             = useState('')
  const [filterSupportLevel, setFilterSupportLevel] = useState('')
  const [filterParty,        setFilterParty]        = useState('')
  const [filterBlock,        setFilterBlock]        = useState('')
  const [filterUnion,        setFilterUnion]        = useState('')
  const [filterPanchayat,    setFilterPanchayat]    = useState('')
  const [filterBooth,        setFilterBooth]        = useState('')
  const [filterDateFrom,     setFilterDateFrom]     = useState('')
  const [filterDateTo,       setFilterDateTo]       = useState('')

  const clearAdvancedFilters = () => {
    setFilterSupportLevel('')
    setFilterParty('')
    setFilterBlock('')
    setFilterUnion('')
    setFilterPanchayat('')
    setFilterBooth('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterTelecaller('')
    setSearch('')
  }

  const hasAdvancedFilters = !!(
    filterSupportLevel || filterParty || filterBlock || filterUnion ||
    filterPanchayat || filterBooth || filterDateFrom || filterDateTo ||
    filterTelecaller || search
  )

  const telecallerOptions = useMemo(() => {
    const seen = new Set<string>()
    assignments.forEach(a => seen.add(a.telecaller_name))
    return [...seen]
  }, [assignments])

  /* ── Derived option lists from actual survey data ── */
  const blockOptions = useMemo(() => {
    // Prefer master blocks, but fall back to unique values from surveys
    if (masterBlocks.length > 0) return masterBlocks.map(b => b.name)
    const seen = new Set<string>()
    surveys.forEach(s => { if (s.block) seen.add(s.block) })
    return [...seen].sort()
  }, [masterBlocks, surveys])

  const partyOptions = useMemo(() => {
    if (masterParties.length > 0) return masterParties.map(p => ({ name: p.name, abbr: p.abbreviation }))
    const seen = new Set<string>()
    surveys.forEach(s => { if (s.party_preference) seen.add(s.party_preference) })
    return [...seen].sort().map(n => ({ name: n, abbr: undefined }))
  }, [masterParties, surveys])

  /* ── Filtered surveys ── */
  const filteredSurveys = useMemo(() => {
    let list = surveys

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.voter_name?.toLowerCase().includes(q) ||
        s.surveyed_by?.toLowerCase().includes(q) ||
        s.booth_no?.includes(q)
      )
    }

    if (filterTelecaller) {
      list = list.filter(s => {
        const tc = telecallerByVoterName.get(s.voter_name?.toLowerCase() ?? '')
        return tc?.name === filterTelecaller
      })
    }

    if (filterSupportLevel) {
      list = list.filter(s => s.support_level === filterSupportLevel)
    }

    if (filterParty) {
      list = list.filter(s => s.party_preference === filterParty)
    }

    if (filterBlock) {
      list = list.filter(s => s.block === filterBlock)
    }

    if (filterBooth) {
      list = list.filter(s => s.booth_no === filterBooth)
    }

    if (filterPanchayat) {
      list = list.filter(s => {
        const pan = boothPanchayatMap.get(s.booth_no ?? '')
        return pan === filterPanchayat
      })
    }

    if (filterUnion) {
      list = list.filter(s => {
        const pan  = boothPanchayatMap.get(s.booth_no ?? '')
        const union = pan ? panchayatUnionMap.get(pan) : undefined
        return union === filterUnion
      })
    }

    if (filterDateFrom) {
      list = list.filter(s => (s.survey_date ?? '') >= filterDateFrom)
    }

    if (filterDateTo) {
      list = list.filter(s => (s.survey_date ?? '') <= filterDateTo)
    }

    if (filterTab !== 'all') {
      list = list.filter(s => {
        const dec = decisionMap.get(s.id)
        if (filterTab === 'pending')               return !dec
        if (filterTab === 'followup_required')     return dec?.action === 'followup_required'
        if (filterTab === 'field_survey')          return dec?.action === 'followup_required' && dec?.followup_type === 'field_survey'
        if (filterTab === 'telephonic')            return dec?.action === 'followup_required' && dec?.followup_type === 'telephonic'
        if (filterTab === 'followup_not_required') return dec?.action === 'followup_not_required'
        return true
      })
    }

    return list
  }, [
    surveys, search, filterTelecaller, filterTab, filterSupportLevel, filterParty,
    filterBlock, filterBooth, filterPanchayat, filterUnion, filterDateFrom, filterDateTo,
    decisionMap, telecallerByVoterName, boothPanchayatMap, panchayatUnionMap,
  ])

  const counts = useMemo(() => ({
    all:                   surveys.length,
    pending:               surveys.filter(s => !decisionMap.has(s.id)).length,
    followup_required:     surveys.filter(s => decisionMap.get(s.id)?.action === 'followup_required').length,
    field_survey:          surveys.filter(s => decisionMap.get(s.id)?.action === 'followup_required' && decisionMap.get(s.id)?.followup_type === 'field_survey').length,
    telephonic:            surveys.filter(s => decisionMap.get(s.id)?.action === 'followup_required' && decisionMap.get(s.id)?.followup_type === 'telephonic').length,
    followup_not_required: surveys.filter(s => decisionMap.get(s.id)?.action === 'followup_not_required').length,
  }), [surveys, decisionMap])

  /* ── Action handler ── */
  const handleAction = async (
    survey: SurveyRecord,
    action: 'followup_required' | 'followup_not_required',
    followupType?: 'telephonic' | 'field_survey',
  ) => {
    const tc       = telecallerByVoterName.get(survey.voter_name?.toLowerCase() ?? '')
    const existing = decisionMap.get(survey.id)
    const today    = new Date().toISOString().slice(0, 10)
    const resolvedFollowupType = action === 'followup_not_required'
      ? (existing?.followup_type ?? followupType)
      : followupType

    setSaving(survey.id)
    setExpandedFollowup(null)
    try {
      if (existing) {
        const res = await apiClient.patch(`/telecalling/feedbacks/${existing.id}/`, {
          action,
          followup_type: resolvedFollowupType,
          date: today,
        })
        setDecisions(prev => prev.map(d => d.id === existing.id
          ? { ...res.data, followup_type: res.data.followup_type ?? resolvedFollowupType }
          : d
        ))
      } else {
        const res = await apiClient.post('/telecalling/feedbacks/', {
          survey:          survey.id,
          voter_name:      survey.voter_name,
          telecaller_name: tc?.name ?? survey.surveyed_by ?? '—',
          action,
          followup_type:   resolvedFollowupType,
          date:            today,
        })
        setDecisions(prev => [{ ...res.data, followup_type: res.data.followup_type ?? resolvedFollowupType }, ...prev])
      }

      if (action === 'followup_required' && followupType === 'field_survey') {
        try {
          await apiClient.post('/activities/logs/', {
            category:      'field',
            activity_type: 'Voter Survey',
            date:          today,
            booth_no:      survey.booth_no ?? '',
            notes:         `Followup field survey for: ${survey.voter_name}${survey.remarks ? ' | ' + survey.remarks : ''} [survey_id:${survey.id}]`,
          })
        } catch {
          // Non-fatal
        }
      }

      const typeLabel = resolvedFollowupType === 'telephonic'
        ? 'Telephonic'
        : resolvedFollowupType === 'field_survey'
          ? 'Field Survey'
          : ''
      showToast(
        `${action === 'followup_required' ? `Followup Required${typeLabel ? ' — ' + typeLabel : ''}` : 'No Followup'} marked for ${survey.voter_name}`,
        action === 'followup_required' ? 'warning' : 'success'
      )
    } catch {
      showToast('Failed to save decision — please try again', 'error')
    } finally {
      setSaving(null)
    }
  }

  const openTimeline = async (survey: SurveyRecord) => {
    setTimelineOpen(true)
    setTimelineLoading(true)
    setTimelineData(null)
    try {
      const res = await apiClient.get('/telecalling/feedbacks/timeline/', {
        params: { survey: survey.id },
      })
      setTimelineData(res.data)
    } catch {
      setTimelineData(null)
      showToast('Failed to load full timeline', 'error')
    } finally {
      setTimelineLoading(false)
    }
  }

  /* ── Survey row ── */
  const SurveyRow = ({ survey }: { survey: SurveyRecord }) => {
    const dec     = decisionMap.get(survey.id)
    const tc      = telecallerByVoterName.get(survey.voter_name?.toLowerCase() ?? '')
    const busy    = saving === survey.id
    const showSub = expandedFollowup === survey.id

    const followupTypeLabel = (type?: string) => {
      if (type === 'telephonic')   return 'Telephonic'
      if (type === 'field_survey') return 'Field Survey'
      return ''
    }

    return (
      <div className={`border-b border-border transition-colors
        ${dec?.action === 'followup_required'     ? 'bg-orange-50/40' :
          dec?.action === 'followup_not_required' ? 'bg-green-50/30'  : ''}`}>

        <div className="flex items-start gap-3 px-5 py-3">

          {/* Status dot */}
          <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0
            ${dec?.action === 'followup_required'     ? 'bg-orange-400' :
              dec?.action === 'followup_not_required' ? 'bg-green-500'  : 'bg-border'}`}
          />

          {/* Voter + feedback info */}
          <div className="flex-1 min-w-0">
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

            <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px] text-muted">
              <span>
                <i className="ph ph-headset mr-0.5" />
                {tc?.name ?? survey.surveyed_by ?? '—'}
                {tc?.phone && <span className="ml-1">{tc.phone}</span>}
              </span>
              {survey.block && <span><i className="ph ph-squares-four mr-0.5" />{survey.block}</span>}
              {survey.survey_date && <span><i className="ph ph-calendar mr-0.5" />{survey.survey_date}</span>}
              {survey.aware_of_candidate && survey.aware_of_candidate !== '' && (
                <span>Aware: <strong>{survey.aware_of_candidate}</strong></span>
              )}
              {survey.likely_to_vote && survey.likely_to_vote !== '' && (
                <span>Vote: <strong>{survey.likely_to_vote}</strong></span>
              )}
              {survey.remarks && (
                <span className="italic truncate max-w-[200px]">"{survey.remarks}"</span>
              )}
            </div>

            {dec && (
              <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold
                ${dec.action === 'followup_required'
                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                  : 'bg-green-100 text-green-700 border border-green-200'}`}>
                <i className={`${dec.action === 'followup_required'
                  ? (dec.followup_type === 'field_survey' ? 'ph ph-map-trifold' : 'ph ph-phone')
                  : 'ph ph-check-circle'} text-[11px]`} />
                {dec.action === 'followup_required'
                  ? `Followup Required${followupTypeLabel(dec.followup_type) ? ' — ' + followupTypeLabel(dec.followup_type) : ''}`
                  : 'Followup Not Required'}
                <span className="opacity-60 font-normal ml-1">· {dec.date}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={() => openTimeline(survey)}
              className="flex items-center gap-1.5 px-3 py-[5px] rounded-lg text-[11px] font-semibold border bg-white text-navy border-navy/30 hover:bg-navy/5 transition-colors"
              title="View full timeline"
            >
              <i className="ph ph-eye text-[12px]" />
              View
            </button>

            <div className="flex flex-col gap-1">
              <button
                disabled={busy}
                onClick={() => setExpandedFollowup(showSub ? null : survey.id)}
                className={`flex items-center gap-1.5 px-3 py-[5px] rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50
                  ${dec?.action === 'followup_required'
                    ? 'bg-orange-400 text-white border-orange-400'
                    : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'}`}
              >
                {busy ? <i className="ph ph-spinner-gap animate-spin text-[12px]" /> : <i className="ph ph-arrow-clockwise text-[12px]" />}
                Followup Required
                <i className={`ph ${showSub ? 'ph-caret-up' : 'ph-caret-down'} text-[10px] ml-auto`} />
              </button>

              {showSub && (
                <div className="flex flex-col gap-1 pl-2 border-l-2 border-orange-200">
                  <button
                    disabled={busy}
                    onClick={() => handleAction(survey, 'followup_required', 'telephonic')}
                    className="flex items-center gap-1.5 px-3 py-[5px] rounded-lg text-[11px] font-semibold border bg-white text-blue-600 border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <i className="ph ph-phone text-[12px]" />
                    Telephonic
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => handleAction(survey, 'followup_required', 'field_survey')}
                    className="flex items-center gap-1.5 px-3 py-[5px] rounded-lg text-[11px] font-semibold border bg-white text-amber-700 border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    <i className="ph ph-map-trifold text-[12px]" />
                    Field Survey
                  </button>
                </div>
              )}
            </div>

            <button
              disabled={busy}
              onClick={() => handleAction(survey, 'followup_not_required')}
              className={`flex items-center gap-1.5 px-3 py-[5px] rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50
                ${dec?.action === 'followup_not_required'
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
            >
              {busy ? <i className="ph ph-spinner-gap animate-spin text-[12px]" /> : <i className="ph ph-check-circle text-[12px]" />}
              Followup Not Required
            </button>
          </div>
        </div>
      </div>
    )
  }

  const pending           = filteredSurveys.filter(s => !decisionMap.has(s.id))
  const fieldSurveyReq   = filteredSurveys.filter(s => { const d = decisionMap.get(s.id); return d?.action === 'followup_required' && d?.followup_type === 'field_survey' })
  const telephonicReq    = filteredSurveys.filter(s => { const d = decisionMap.get(s.id); return d?.action === 'followup_required' && d?.followup_type === 'telephonic'    })
  const followupReqOther = filteredSurveys.filter(s => { const d = decisionMap.get(s.id); return d?.action === 'followup_required' && !d?.followup_type                   })
  const followupNotReq   = filteredSurveys.filter(s => decisionMap.get(s.id)?.action === 'followup_not_required')
  const timelineEventLabel = (eventType: string) => {
    if (eventType === 'telephonic_assignment') return 'Telephonic Assignment'
    if (eventType === 'telephonic_entry') return 'Telephonic Entry'
    if (eventType === 'field_survey_entry') return 'Field Survey Entry'
    if (eventType === 'followup_event') return 'Follow-up Event'
    return 'Event'
  }
  const timelineEventIcon = (eventType: string) => {
    if (eventType === 'telephonic_assignment') return 'ph ph-phone-outgoing'
    if (eventType === 'telephonic_entry') return 'ph ph-headset'
    if (eventType === 'field_survey_entry') return 'ph ph-map-trifold'
    if (eventType === 'followup_event') return 'ph ph-arrow-clockwise'
    return 'ph ph-dot-outline'
  }

  /* ════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════ */
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <i className="ph ph-git-branch text-[20px] text-navy" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold text-heading">Feedback Review</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-border text-muted text-[10px] font-semibold">
                {counts.pending} Pending
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                <i className="ph ph-map-trifold mr-0.5" />{counts.field_survey} Field Survey
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                <i className="ph ph-phone mr-0.5" />{counts.telephonic} Telephonic
              </span>
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                {counts.followup_not_required} No Followup
              </span>
              {hasAdvancedFilters && (
                <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-semibold">
                  {filteredSurveys.length} shown (filtered)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Status tabs ── */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-surface-alt border-b border-border">
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-semibold flex-wrap">
            {([
              { key: 'all',                   label: 'All',                   icon: '',                    count: counts.all,                   active: 'bg-navy text-white'          },
              { key: 'pending',               label: 'Pending',               icon: 'ph ph-clock',         count: counts.pending,               active: 'bg-gray-500 text-white'      },
              { key: 'followup_required',     label: 'Followup Required',     icon: 'ph ph-arrow-clockwise', count: counts.followup_required,   active: 'bg-orange-400 text-white'    },
              { key: 'field_survey',          label: 'Field Survey',          icon: 'ph ph-map-trifold',   count: counts.field_survey,          active: 'bg-amber-500 text-white'     },
              { key: 'telephonic',            label: 'Telephonic',            icon: 'ph ph-phone',         count: counts.telephonic,            active: 'bg-blue-500 text-white'      },
              { key: 'followup_not_required', label: 'No Followup',           icon: 'ph ph-check-circle',  count: counts.followup_not_required, active: 'bg-green-500 text-white'     },
            ] as const).map(tab => (
              <button key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-3 py-[6px] flex items-center gap-1.5 transition-colors border-r border-border last:border-r-0
                  ${filterTab === tab.key ? tab.active : 'bg-surface text-muted hover:bg-border'}`}>
                {tab.icon && <i className={`${tab.icon} text-[11px]`} />}
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold
                  ${filterTab === tab.key ? 'bg-white/25 text-white' : 'bg-border text-muted'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <i className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted pointer-events-none" />
            <input type="text" placeholder="Voter name, booth…"
              value={search} onChange={e => setSearch(e.target.value)}
              className={`${inputCls} pl-7 w-full`} />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                <i className="ph ph-x text-[11px]" />
              </button>
            )}
          </div>

          {hasAdvancedFilters && (
            <button onClick={clearAdvancedFilters}
              className="flex items-center gap-1 px-3 py-[6px] rounded-lg border border-rose-200 bg-rose-50 text-rose-500 text-[11px] font-medium hover:bg-rose-100 transition-colors ml-auto">
              <i className="ph ph-x-circle text-[12px]" /> Clear All
            </button>
          )}
        </div>

        {/* ── Advanced filters ── */}
        <div className="px-5 py-3 border-b border-border bg-[#fafafa]">
          <div className="flex items-center gap-1.5 mb-2">
            <i className="ph ph-funnel text-[12px] text-navy" />
            <span className="text-[10px] font-bold text-navy uppercase tracking-[0.8px]">Filters</span>
          </div>

          {/* Row 1: Support Level · Party Reference · Block · Booth */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            {/* Support Level */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Support Level</label>
              <select value={filterSupportLevel} onChange={e => setFilterSupportLevel(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterSupportLevel ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            {/* Party Reference */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Party Reference</label>
              <select value={filterParty} onChange={e => setFilterParty(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterParty ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Parties</option>
                {partyOptions.map(p => (
                  <option key={p.name} value={p.name}>{p.abbr ? `${p.abbr} — ${p.name}` : p.name}</option>
                ))}
              </select>
            </div>

            {/* Block */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Block</label>
              <select value={filterBlock} onChange={e => setFilterBlock(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterBlock ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Blocks</option>
                {blockOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Booth */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Booth</label>
              <select value={filterBooth} onChange={e => setFilterBooth(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterBooth ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Booths</option>
                {masterBooths.map(b => (
                  <option key={b.id} value={b.number}>{b.number} — {b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Union · Panchayat · Telecaller · Date From · Date To */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {/* Union */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Union</label>
              <select value={filterUnion} onChange={e => setFilterUnion(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterUnion ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Unions</option>
                {masterUnions.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>

            {/* Panchayat */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Panchayat</label>
              <select value={filterPanchayat} onChange={e => setFilterPanchayat(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterPanchayat ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Panchayats</option>
                {masterPanchayats.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            {/* Telecaller */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Telecaller</label>
              <select value={filterTelecaller} onChange={e => setFilterTelecaller(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterTelecaller ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Telecallers</option>
                {telecallerOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Date From</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className={`${inputCls} w-full text-[11px] ${filterDateFrom ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`} />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Date To</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className={`${inputCls} w-full text-[11px] ${filterDateTo ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`} />
            </div>
          </div>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="px-5 py-14 text-center text-muted">
            <i className="ph ph-spinner-gap animate-spin text-[28px] block mb-2" />
            Loading feedback records…
          </div>
        ) : surveys.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <i className="ph ph-notepad text-[36px] text-border block mb-3" />
            <p className="text-[13px] font-semibold text-heading mb-1">No submitted feedback yet</p>
            <p className="text-[11px] text-muted">
              Submit feedback from the <strong>Feedback</strong> tab first.
            </p>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <i className="ph ph-funnel text-[28px] text-border block mb-2" />
            <p className="text-[12px] text-muted">No records match your filter.</p>
          </div>
        ) : (
          <>
            {/* ── Pending Review ── */}
            {(filterTab === 'all' || filterTab === 'pending') && pending.length > 0 && (
              <>
                <SectionLabel icon="ph ph-clock text-[13px] text-gray-500" label="Pending Review" count={pending.length} color="bg-gray-50 text-gray-600" />
                {pending.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* ── Field Survey Required ── */}
            {(filterTab === 'all' || filterTab === 'followup_required' || filterTab === 'field_survey') && fieldSurveyReq.length > 0 && (
              <>
                <SectionLabel icon="ph ph-map-trifold text-[13px] text-amber-600" label="Field Survey Required" count={fieldSurveyReq.length} color="bg-amber-50 text-amber-700" />
                {fieldSurveyReq.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* ── Telephonic Required ── */}
            {(filterTab === 'all' || filterTab === 'followup_required' || filterTab === 'telephonic') && telephonicReq.length > 0 && (
              <>
                <SectionLabel icon="ph ph-phone text-[13px] text-blue-600" label="Telephonic Required" count={telephonicReq.length} color="bg-blue-50 text-blue-700" />
                {telephonicReq.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* ── Followup Required (no type — legacy records) ── */}
            {(filterTab === 'all' || filterTab === 'followup_required') && followupReqOther.length > 0 && (
              <>
                <SectionLabel icon="ph ph-arrow-clockwise text-[13px] text-orange-500" label="Followup Required" count={followupReqOther.length} color="bg-orange-50 text-orange-600" />
                {followupReqOther.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* ── Followup Not Required ── */}
            {(filterTab === 'all' || filterTab === 'followup_not_required') && followupNotReq.length > 0 && (
              <>
                <SectionLabel icon="ph ph-check-circle text-[13px] text-green-600" label="Followup Not Required" count={followupNotReq.length} color="bg-green-50 text-green-700" />
                {followupNotReq.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}
          </>
        )}
      </div>

      {timelineOpen && (
        <div className="fixed inset-0 z-[120] bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-[720px] max-h-[85vh] bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-surface-alt flex items-center gap-2">
              <i className="ph ph-clock-counter-clockwise text-[16px] text-navy" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-heading truncate">Full Timeline</p>
                {timelineData?.voter_name && (
                  <p className="text-[11px] text-muted truncate">{timelineData.voter_name}</p>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                timelineData?.final_status === 'Completed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {timelineData?.final_status ?? 'Pending'}
              </span>
              <button
                onClick={() => setTimelineOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-border text-muted hover:text-heading transition-colors"
              >
                <i className="ph ph-x text-[14px]" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              {timelineLoading ? (
                <div className="py-12 text-center text-muted">
                  <i className="ph ph-spinner-gap animate-spin text-[24px] block mb-2" />
                  Loading timeline…
                </div>
              ) : !timelineData || timelineData.events.length === 0 ? (
                <div className="py-12 text-center text-muted">
                  <i className="ph ph-clock text-[24px] block mb-2" />
                  No timeline events found.
                </div>
              ) : (
                <div className="space-y-2">
                  {timelineData.events.map((event, index) => (
                    <div key={`${event.timestamp}-${index}`} className="rounded-lg border border-border bg-surface px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <i className={`${timelineEventIcon(event.event_type)} text-[12px] text-navy`} />
                        <span className="text-[11px] font-semibold text-heading">{timelineEventLabel(event.event_type)}</span>
                        {event.date && (
                          <span className="text-[10px] text-muted">
                            <i className="ph ph-calendar mr-1" />
                            {event.date}
                          </span>
                        )}
                        {event.user && (
                          <span className="text-[10px] text-muted">
                            <i className="ph ph-user mr-1" />
                            {event.user}
                          </span>
                        )}
                      </div>
                      {event.remarks && (
                        <p className="text-[11px] text-muted mt-1 break-words">{event.remarks}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
