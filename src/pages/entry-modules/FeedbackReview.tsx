import { useState, useEffect, useMemo, useCallback } from 'react'
import apiClient from '../../utils/api'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import { selectCls, inputCls } from '../../components/entry/FormGroup'
import { useToast } from '../../context/ToastContext'
import { exportToCsv } from '../../utils/exportCsv'

interface ApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/* ── Types ── */
interface SurveyRecord {
  id:                  number
  voter_name:          string
  voter_id_no?:        string
  phone?:              string
  phone2?:             string
  alt_phoneno2?:       string
  alt_phoneno3?:       string
  booth_no?:           string
  booth_name?:         string
  block?:              string
  village?:            string
  age?:                number | null
  gender?:             string
  address?:            string
  support_level?:      string
  party_preference?:   string
  response_status?:    string
  aware_of_candidate?: string
  likely_to_vote?:     string
  remarks?:            string
  surveyed_by?:        string
  survey_date?:        string
  telecaller_name?:    string
  telecaller_phone?:   string
  decision?:           FeedbackDecision | null
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

interface ReviewCounts {
  all: number
  pending: number
  followup_required: number
  field_survey: number
  telephonic: number
  followup_required_other?: number
  followup_not_required: number
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

type ReviewTab = 'all' | 'pending' | 'followup_required' | 'field_survey' | 'telephonic' | 'followup_not_required'
const DEFAULT_SUPPORT_LEVEL = 'negative'

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
  if (s === 'wrong_number')  return 'Wrong Number'
  return s || '—'
}

const responseColor = (s?: string) => {
  if (s === 'not_reach')     return 'bg-red-100 text-red-600'
  if (s === 'no_answer')     return 'bg-orange-100 text-orange-600'
  if (s === 'need_followup') return 'bg-purple-100 text-purple-700'
  if (s === 'wrong_number')  return 'bg-rose-100 text-rose-700'
  return 'bg-gray-100 text-gray-500'
}

const genderLabel = (g?: string) =>
  g === 'm' || g === 'Male' ? 'Male' :
  g === 'f' || g === 'Female' ? 'Female' :
  g === 'o' || g === 'Other' ? 'Other' : ''

function getSurveyPhones(survey: Pick<SurveyRecord, 'phone' | 'phone2' | 'alt_phoneno2' | 'alt_phoneno3'>) {
  const seen = new Set<string>()
  return [survey.phone, survey.phone2, survey.alt_phoneno2, survey.alt_phoneno3]
    .map(value => (value || '').trim())
    .filter(value => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
}

function dedupeTelecallerNames(names: string[]) {
  const seen = new Set<string>()
  return names.filter(name => {
    const normalized = String(name || '').trim().toLowerCase()
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function esc(value: string | number | undefined | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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

function getDecisionCounters(decision?: FeedbackDecision | null) {
  const counters = {
    pending: 0,
    followup_required: 0,
    field_survey: 0,
    telephonic: 0,
    followup_required_other: 0,
    followup_not_required: 0,
  }

  if (!decision) {
    counters.pending = 1
    return counters
  }

  if (decision.action === 'followup_required') {
    counters.followup_required = 1
    if (decision.followup_type === 'field_survey') counters.field_survey = 1
    else if (decision.followup_type === 'telephonic') counters.telephonic = 1
    else counters.followup_required_other = 1
    return counters
  }

  if (decision.action === 'followup_not_required') {
    counters.followup_not_required = 1
  }

  return counters
}

function applyDecisionToCounts(
  source: ReviewCounts,
  previousDecision?: FeedbackDecision | null,
  nextDecision?: FeedbackDecision | null,
): ReviewCounts {
  const previous = getDecisionCounters(previousDecision)
  const next = getDecisionCounters(nextDecision)

  return {
    ...source,
    all: source.all ?? 0,
    pending: Math.max(0, (source.pending ?? 0) - previous.pending + next.pending),
    followup_required: Math.max(0, (source.followup_required ?? 0) - previous.followup_required + next.followup_required),
    field_survey: Math.max(0, (source.field_survey ?? 0) - previous.field_survey + next.field_survey),
    telephonic: Math.max(0, (source.telephonic ?? 0) - previous.telephonic + next.telephonic),
    followup_required_other: Math.max(
      0,
      (source.followup_required_other ?? 0) - previous.followup_required_other + next.followup_required_other,
    ),
    followup_not_required: Math.max(
      0,
      (source.followup_not_required ?? 0) - previous.followup_not_required + next.followup_not_required,
    ),
  }
}

function matchesReviewTab(tab: ReviewTab, decision?: FeedbackDecision | null) {
  if (tab === 'all') return true
  if (tab === 'pending') return !decision
  if (tab === 'followup_required') return decision?.action === 'followup_required'
  if (tab === 'field_survey') return decision?.action === 'followup_required' && decision?.followup_type === 'field_survey'
  if (tab === 'telephonic') return decision?.action === 'followup_required' && decision?.followup_type === 'telephonic'
  if (tab === 'followup_not_required') return decision?.action === 'followup_not_required'
  return true
}

const API_BATCH_SIZE = 500

async function fetchAllPages<T>(
  url: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const { data: firstPage } = await apiClient.get<ApiResponse<T>>(url, {
    params: { ...params, limit: API_BATCH_SIZE, offset: 0 },
  })

  const firstResults = firstPage.results ?? []
  const totalCount = firstPage.count ?? firstResults.length

  if (!firstPage.next || firstResults.length >= totalCount) {
    return firstResults
  }

  const offsets: number[] = []
  for (let offset = API_BATCH_SIZE; offset < totalCount; offset += API_BATCH_SIZE) {
    offsets.push(offset)
  }

  const remainingPages = await Promise.all(offsets.map(async offset => {
    const { data } = await apiClient.get<ApiResponse<T>>(url, {
      params: { ...params, limit: API_BATCH_SIZE, offset },
    })
    return data.results ?? []
  }))

  return firstResults.concat(...remainingPages)
}

function openFeedbackReviewPrintWindow({
  rows,
  filters,
}: {
  rows: SurveyRecord[]
  filters: Record<string, string>
}) {
  const activeFilters = [
    filters.tab && `Tab: ${filters.tab}`,
    filters.search && `Search: ${filters.search}`,
    filters.telecaller && `Telecaller: ${filters.telecaller}`,
    filters.support_level && `Support: ${filters.support_level}`,
    filters.response_status && `Response: ${filters.response_status}`,
    filters.aware_of_candidate && `Aware: ${filters.aware_of_candidate}`,
    filters.likely_to_vote && `Likely Vote: ${filters.likely_to_vote}`,
    filters.remarks && `Remarks: ${filters.remarks}`,
    filters.party && `Party: ${filters.party}`,
    filters.block && `Block: ${filters.block}`,
    filters.union && `Union: ${filters.union}`,
    filters.panchayat && `Panchayat: ${filters.panchayat}`,
    filters.booth && `Booth: ${filters.booth}`,
    filters.date_from && `Date From: ${filters.date_from}`,
    filters.date_to && `Date To: ${filters.date_to}`,
  ].filter(Boolean)

  const bodyRows = rows.map((survey, index) => {
    const phones = getSurveyPhones(survey)
    const decisionText = survey.decision?.action === 'followup_required'
      ? `Followup Required${survey.decision?.followup_type ? ` - ${survey.decision.followup_type === 'field_survey' ? 'Field Survey' : 'Telephonic'}` : ''}`
      : survey.decision?.action === 'followup_not_required'
        ? 'Followup Not Required'
        : 'Pending'
    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="primary-text">${esc(survey.voter_name)}</div>
          <div class="secondary-text">${esc(survey.voter_id_no || '')}</div>
        </td>
        <td>${phones.length ? phones.map(phone => `<div>${esc(phone)}</div>`).join('') : '—'}</td>
        <td>${esc(survey.booth_no || '') || '—'}</td>
        <td>${esc(survey.booth_name || '') || '—'}</td>
        <td>${esc(survey.telecaller_name || survey.surveyed_by || '') || '—'}</td>
        <td>${esc(survey.support_level || '') || '—'}</td>
        <td>${esc(survey.party_preference || '') || '—'}</td>
        <td>${esc(survey.response_status ? responseLabel(survey.response_status) : '') || '—'}</td>
        <td>${esc(survey.address || '') || '—'}</td>
        <td>${esc(decisionText)}</td>
      </tr>
    `
  }).join('')

  const win = window.open('', '_blank')
  if (!win) return

  win.document.write(`<!DOCTYPE html><html><head>
    <title>Feedback Review Print</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#1e293b}
      h2{color:#0d2455;border-bottom:2px solid #FF9933;padding-bottom:6px;margin-bottom:4px}
      .meta{font-size:11px;color:#64748b;margin-bottom:8px}
      .filters{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 16px}
      .filter-chip{padding:4px 8px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:600;border:1px solid #bfdbfe}
      table{width:100%;border-collapse:collapse}
      th{background:#0d2455;color:#fff;padding:7px 8px;text-align:left;font-size:11px}
      td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;vertical-align:top}
      tr:nth-child(even) td{background:#f8faff}
      .primary-text{font-weight:700;color:#0f172a}
      .secondary-text{margin-top:4px;font-size:10px;color:#64748b}
      @media print{body{padding:16px}}
    </style>
  </head><body>
    <h2>Feedback Review</h2>
    <p class="meta">${rows.length} records &middot; Printed: ${new Date().toLocaleString('en-IN')}</p>
    ${activeFilters.length ? `<div class="filters">${activeFilters.map(filter => `<span class="filter-chip">${esc(filter)}</span>`).join('')}</div>` : ''}
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Voter</th>
          <th>Phone Numbers</th>
          <th>Booth No</th>
          <th>Booth Name</th>
          <th>Telecaller</th>
          <th>Support</th>
          <th>Party</th>
          <th>Response</th>
          <th>Address</th>
          <th>Decision</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body></html>`)
  win.document.close()
  win.print()
}

/* ════════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════════ */
export default function FeedbackReview() {
  const { showToast } = useToast()
  const masterApi = useMasterAPI()

  /* ── Core data ── */
  const [surveys,     setSurveys]     = useState<SurveyRecord[]>([])
  const [loading,     setLoading]     = useState(true)
  const [bulkFetchMode, setBulkFetchMode] = useState<'export' | 'print' | null>(null)
  const [saving,      setSaving]      = useState<number | null>(null)
  const [expandedFollowup, setExpandedFollowup] = useState<number | null>(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineData, setTimelineData] = useState<TimelinePayload | null>(null)
  const [counts, setCounts] = useState<ReviewCounts>({
    all: 0,
    pending: 0,
    followup_required: 0,
    field_survey: 0,
    telephonic: 0,
    followup_not_required: 0,
  })
  const [filteredCounts, setFilteredCounts] = useState<ReviewCounts>({
    all: 0,
    pending: 0,
    followup_required: 0,
    field_survey: 0,
    telephonic: 0,
    followup_required_other: 0,
    followup_not_required: 0,
  })
  const [telecallerOptions, setTelecallerOptions] = useState<string[]>([])
  const [totalRows, setTotalRows] = useState(0)

  /* ── Master data for filters ── */
  const [masterBooths,     setMasterBooths]     = useState<{ id: number; number: string; name: string; panchayat_name?: string }[]>([])
  const [masterBlocks,     setMasterBlocks]     = useState<{ id: number; name: string }[]>([])
  const [masterUnions,     setMasterUnions]     = useState<{ id: number; name: string }[]>([])
  const [masterPanchayats, setMasterPanchayats] = useState<{ id: number; name: string; union_name?: string }[]>([])
  const [masterParties,    setMasterParties]    = useState<{ id: number; name: string; abbreviation?: string }[]>([])

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
  const [filterTab,          setFilterTab]          = useState<ReviewTab>('all')
  const [filterTelecaller,   setFilterTelecaller]   = useState('')
  const [search,             setSearch]             = useState('')
  const [filterSupportLevel, setFilterSupportLevel] = useState(DEFAULT_SUPPORT_LEVEL)
  const [filterResponseStatus, setFilterResponseStatus] = useState('')
  const [filterAwareOfCandidate, setFilterAwareOfCandidate] = useState('')
  const [filterLikelyToVote, setFilterLikelyToVote] = useState('')
  const [filterRemarks,      setFilterRemarks]      = useState('')
  const [filterParty,        setFilterParty]        = useState('')
  const [filterBlock,        setFilterBlock]        = useState('')
  const [filterUnion,        setFilterUnion]        = useState('')
  const [filterPanchayat,    setFilterPanchayat]    = useState('')
  const [filterBooth,        setFilterBooth]        = useState('')
  const [filterDateFrom,     setFilterDateFrom]     = useState('')
  const [filterDateTo,       setFilterDateTo]       = useState('')
  const [page,               setPage]               = useState(1)
  const [pageSize,           setPageSize]           = useState(10)

  useEffect(() => {
    masterApi.fetchBooths().then(d => d && setMasterBooths(d))
    masterApi.fetchAreas().then(d => d && setMasterBlocks(d))
    masterApi.fetchUnions().then(d => d && setMasterUnions(d))
    masterApi.fetchPanchayats().then(d => d && setMasterPanchayats(d))
    masterApi.fetchParties().then(d => d && setMasterParties(d))
  }, [])

  const clearAdvancedFilters = () => {
    setFilterSupportLevel(DEFAULT_SUPPORT_LEVEL)
    setFilterResponseStatus('')
    setFilterAwareOfCandidate('')
    setFilterLikelyToVote('')
    setFilterRemarks('')
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
    filterSupportLevel || filterResponseStatus || filterAwareOfCandidate ||
    filterLikelyToVote || filterParty || filterBlock || filterUnion ||
    filterPanchayat || filterBooth || filterDateFrom || filterDateTo ||
    filterRemarks ||
    filterTelecaller || search
  )

  const reloadRows = useCallback((signal?: AbortSignal) => {
    setLoading(true)
    const params: Record<string, string | number> = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      tab: filterTab,
    }
    if (search.trim()) params.search = search.trim()
    if (filterTelecaller) params.telecaller = filterTelecaller
    if (filterSupportLevel) params.support_level = filterSupportLevel
    if (filterResponseStatus) params.response_status = filterResponseStatus
    if (filterAwareOfCandidate) params.aware_of_candidate = filterAwareOfCandidate
    if (filterLikelyToVote) params.likely_to_vote = filterLikelyToVote
    if (filterRemarks) params.remarks = filterRemarks
    if (filterParty) params.party = filterParty
    if (filterBlock) params.block = filterBlock
    if (filterUnion) params.union = filterUnion
    if (filterPanchayat) params.panchayat = filterPanchayat
    if (filterBooth) params.booth = filterBooth
    if (filterDateFrom) params.date_from = filterDateFrom
    if (filterDateTo) params.date_to = filterDateTo

    apiClient.get('/telecalling/feedbacks/review-list/', { params, signal })
      .then(response => {
        const data = response.data as ApiResponse<SurveyRecord> & {
          counts?: ReviewCounts
          filtered_counts?: ReviewCounts
          telecallers?: string[]
        }
        setSurveys(data.results ?? [])
        setCounts(data.counts ?? {
          all: 0,
          pending: 0,
          followup_required: 0,
          field_survey: 0,
          telephonic: 0,
          followup_not_required: 0,
        })
        setFilteredCounts(data.filtered_counts ?? {
          all: 0,
          pending: 0,
          followup_required: 0,
          field_survey: 0,
          telephonic: 0,
          followup_required_other: 0,
          followup_not_required: 0,
        })
        setTelecallerOptions(dedupeTelecallerNames(data.telecallers ?? []))
        setTotalRows(data.count ?? 0)
      })
      .catch(err => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
        setSurveys([])
        setCounts({
          all: 0,
          pending: 0,
          followup_required: 0,
          field_survey: 0,
          telephonic: 0,
          followup_not_required: 0,
        })
        setFilteredCounts({
          all: 0,
          pending: 0,
          followup_required: 0,
          field_survey: 0,
          telephonic: 0,
          followup_required_other: 0,
          followup_not_required: 0,
        })
        setTelecallerOptions([])
        setTotalRows(0)
        showToast('Failed to load feedback review list', 'error')
      })
      .finally(() => setLoading(false))
  }, [
    page, pageSize, filterTab, search, filterTelecaller, filterSupportLevel,
    filterResponseStatus, filterAwareOfCandidate, filterLikelyToVote, filterRemarks, filterParty,
    filterBlock, filterUnion, filterPanchayat, filterBooth, filterDateFrom,
    filterDateTo, showToast,
  ])

  useEffect(() => {
    const controller = new AbortController()
    reloadRows(controller.signal)
    return () => controller.abort()
  }, [reloadRows])

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

  useEffect(() => {
    setPage(1)
  }, [
    filterTab, filterTelecaller, search, filterSupportLevel, filterResponseStatus,
    filterAwareOfCandidate, filterLikelyToVote, filterRemarks, filterParty, filterBlock,
    filterUnion, filterPanchayat, filterBooth, filterDateFrom, filterDateTo,
  ])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalRows / pageSize))
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [page, totalRows, pageSize])

  /* ── Action handler ── */
  const handleAction = async (
    survey: SurveyRecord,
    action: 'followup_required' | 'followup_not_required',
    followupType?: 'telephonic' | 'field_survey',
  ) => {
    const existing = survey.decision ?? null
    const today    = new Date().toISOString().slice(0, 10)
    const resolvedFollowupType = action === 'followup_not_required'
      ? (existing?.followup_type ?? followupType)
      : followupType

    setSaving(survey.id)
    setExpandedFollowup(null)
    try {
      let savedDecisionId = existing?.id ?? 0
      let savedDecisionDate = today
      if (existing) {
        const { data } = await apiClient.patch<FeedbackDecision>(`/telecalling/feedbacks/${existing.id}/`, {
          action,
          followup_type: resolvedFollowupType,
          date: today,
        })
        savedDecisionId = data?.id ?? existing.id
        savedDecisionDate = data?.date ?? today
      } else {
        const { data } = await apiClient.post<FeedbackDecision>('/telecalling/feedbacks/', {
          survey:          survey.id,
          voter_name:      survey.voter_name,
          telecaller_name: survey.telecaller_name ?? survey.surveyed_by ?? '—',
          action,
          followup_type:   resolvedFollowupType,
          date:            today,
        })
        savedDecisionId = data?.id ?? 0
        savedDecisionDate = data?.date ?? today
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

      const nextDecision: FeedbackDecision = {
        id: savedDecisionId,
        survey: survey.id,
        voter_name: survey.voter_name,
        telecaller_name: survey.telecaller_name ?? survey.surveyed_by ?? '—',
        action,
        followup_type: resolvedFollowupType,
        date: savedDecisionDate,
      }

      const previousDecision = survey.decision ?? null
      const matchedBefore = matchesReviewTab(filterTab, previousDecision)
      const matchedAfter = matchesReviewTab(filterTab, nextDecision)

      setCounts(prev => applyDecisionToCounts(prev, previousDecision, nextDecision))
      setFilteredCounts(prev => applyDecisionToCounts(prev, previousDecision, nextDecision))
      setTotalRows(prev => Math.max(0, prev - (matchedBefore ? 1 : 0) + (matchedAfter ? 1 : 0)))
      setSurveys(prev => {
        const nextRows = prev
          .map(row => row.id === survey.id ? { ...row, decision: nextDecision } : row)
          .filter(row => matchesReviewTab(filterTab, row.decision ?? null))
        return nextRows
      })
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
    const dec     = survey.decision ?? null
    const busy    = saving === survey.id
    const showSub = expandedFollowup === survey.id
    const phones  = getSurveyPhones(survey)

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
              {survey.voter_id_no && (
                <span className="text-[10px] text-muted font-mono">{survey.voter_id_no}</span>
              )}
              {phones.length > 0 && <span className="text-[10px] text-muted">· {phones.join(' / ')}</span>}
              {survey.booth_no && (
                <span className="px-1.5 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-medium">
                  Booth {survey.booth_no}
                </span>
              )}
              {survey.booth_name && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-alt text-heading font-medium border border-border">
                  {survey.booth_name}
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
              {responseLabel(survey.response_status) && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${responseColor(survey.response_status)}`}>
                  {responseLabel(survey.response_status)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px] text-muted">
              {(genderLabel(survey.gender) || survey.age != null) && (
                <span>
                  <i className="ph ph-user mr-0.5" />
                  {genderLabel(survey.gender) || '—'}{survey.age != null ? `, ${survey.age}` : ''}
                </span>
              )}
              <span>
                <i className="ph ph-headset mr-0.5" />
                {survey.telecaller_name ?? survey.surveyed_by ?? '—'}
                {survey.telecaller_phone && <span className="ml-1">{survey.telecaller_phone}</span>}
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

            {survey.address && (
              <div className="mt-1 text-[10px] text-muted truncate">
                <i className="ph ph-map-pin mr-1" />
                {survey.address}
              </div>
            )}

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

  const pagedSurveys = surveys
  const pagedPending = pagedSurveys.filter(s => !s.decision)
  const pagedFieldSurveyReq = pagedSurveys.filter(s => s.decision?.action === 'followup_required' && s.decision?.followup_type === 'field_survey')
  const pagedTelephonicReq = pagedSurveys.filter(s => s.decision?.action === 'followup_required' && s.decision?.followup_type === 'telephonic')
  const pagedFollowupReqOther = pagedSurveys.filter(s => s.decision?.action === 'followup_required' && !s.decision?.followup_type)
  const pagedFollowupNotReq = pagedSurveys.filter(s => s.decision?.action === 'followup_not_required')
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const pageNums: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const nums: (number | '...')[] = [1]
    if (page > 3) nums.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i)
    if (page < totalPages - 2) nums.push('...')
    nums.push(totalPages)
    return nums
  })()
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

  const handleExport = async () => {
    setBulkFetchMode('export')
    try {
      const reviewRows = await fetchAllPages<SurveyRecord>('/telecalling/feedbacks/review-list/', {
        ...(filterTab ? { tab: filterTab } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(filterTelecaller ? { telecaller: filterTelecaller } : {}),
        ...(filterSupportLevel ? { support_level: filterSupportLevel } : {}),
        ...(filterResponseStatus ? { response_status: filterResponseStatus } : {}),
        ...(filterAwareOfCandidate ? { aware_of_candidate: filterAwareOfCandidate } : {}),
        ...(filterLikelyToVote ? { likely_to_vote: filterLikelyToVote } : {}),
        ...(filterRemarks ? { remarks: filterRemarks } : {}),
        ...(filterParty ? { party: filterParty } : {}),
        ...(filterBlock ? { block: filterBlock } : {}),
        ...(filterUnion ? { union: filterUnion } : {}),
        ...(filterPanchayat ? { panchayat: filterPanchayat } : {}),
        ...(filterBooth ? { booth: filterBooth } : {}),
        ...(filterDateFrom ? { date_from: filterDateFrom } : {}),
        ...(filterDateTo ? { date_to: filterDateTo } : {}),
      })
      if (!reviewRows.length) return
      const headers = [
        'Survey Date', 'Voter Name', 'Voter ID', 'Phone', 'Phone 2', 'Alt Phone 2', 'Alt Phone 3', 'Age', 'Gender',
        'Booth No', 'Booth Name', 'Address', 'Block', 'Village',
        'Support Level', 'Party Preference', 'Response Status',
        'Aware of Candidate', 'Likely to Vote', 'Remarks', 'Surveyed By',
        'Telecaller Name', 'Telecaller Phone',
        'Followup Action', 'Followup Type', 'Decision Date',
      ]
      const rows = reviewRows.map(s => {
        const dec = s.decision
        const followupAction = dec?.action === 'followup_required'
          ? 'Followup Required'
          : dec?.action === 'followup_not_required'
            ? 'Followup Not Required'
            : ''
        const followupType = dec?.followup_type === 'field_survey'
          ? 'Field Survey'
          : dec?.followup_type === 'telephonic'
            ? 'Telephonic'
            : ''
        return [
          s.survey_date, s.voter_name, s.voter_id_no ?? '', s.phone ?? '', s.phone2 ?? '', s.alt_phoneno2 ?? '', s.alt_phoneno3 ?? '', s.age ?? '', genderLabel(s.gender),
          s.booth_no ?? '', s.booth_name ?? '', s.address ?? '', s.block ?? '', s.village ?? '',
          s.support_level ?? '', s.party_preference ?? '',
          s.response_status ? responseLabel(s.response_status) : '',
          s.aware_of_candidate ?? '', s.likely_to_vote ?? '',
          s.remarks ?? '', s.surveyed_by ?? '',
          s.telecaller_name ?? '', s.telecaller_phone ?? '',
          followupAction, followupType, dec?.date ?? '',
        ]
      })
      exportToCsv(headers, rows, `BJP_FeedbackReview_${new Date().toISOString().slice(0, 10)}.csv`)
    } catch {
      showToast('Failed to export feedback review list', 'error')
    } finally {
      setBulkFetchMode(null)
    }
  }

  const handlePrint = async () => {
    setBulkFetchMode('print')
    try {
      const reviewRows = await fetchAllPages<SurveyRecord>('/telecalling/feedbacks/review-list/', {
        ...(filterTab ? { tab: filterTab } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(filterTelecaller ? { telecaller: filterTelecaller } : {}),
        ...(filterSupportLevel ? { support_level: filterSupportLevel } : {}),
        ...(filterResponseStatus ? { response_status: filterResponseStatus } : {}),
        ...(filterAwareOfCandidate ? { aware_of_candidate: filterAwareOfCandidate } : {}),
        ...(filterLikelyToVote ? { likely_to_vote: filterLikelyToVote } : {}),
        ...(filterRemarks ? { remarks: filterRemarks } : {}),
        ...(filterParty ? { party: filterParty } : {}),
        ...(filterBlock ? { block: filterBlock } : {}),
        ...(filterUnion ? { union: filterUnion } : {}),
        ...(filterPanchayat ? { panchayat: filterPanchayat } : {}),
        ...(filterBooth ? { booth: filterBooth } : {}),
        ...(filterDateFrom ? { date_from: filterDateFrom } : {}),
        ...(filterDateTo ? { date_to: filterDateTo } : {}),
      })
      if (!reviewRows.length) return

      const tabLabel = filterTab === 'pending'
        ? 'Pending'
        : filterTab === 'followup_required'
          ? 'Followup Required'
          : filterTab === 'field_survey'
            ? 'Field Survey'
            : filterTab === 'telephonic'
              ? 'Telephonic'
              : filterTab === 'followup_not_required'
                ? 'No Followup'
                : 'All'

      openFeedbackReviewPrintWindow({
        rows: reviewRows,
        filters: {
          tab: tabLabel,
          search: search.trim(),
          telecaller: filterTelecaller,
          support_level: filterSupportLevel,
          response_status: filterResponseStatus,
          aware_of_candidate: filterAwareOfCandidate,
          likely_to_vote: filterLikelyToVote,
          remarks: filterRemarks === 'commented' ? 'Commented' : filterRemarks === 'uncommented' ? 'Uncommented' : '',
          party: filterParty,
          block: filterBlock,
          union: filterUnion,
          panchayat: filterPanchayat,
          booth: filterBooth,
          date_from: filterDateFrom,
          date_to: filterDateTo,
        },
      })
    } catch {
      showToast('Failed to prepare print view for feedback review', 'error')
    } finally {
      setBulkFetchMode(null)
    }
  }

  const isFetchingRecords = loading || bulkFetchMode !== null
  const fetchingMessage = bulkFetchMode === 'export'
    ? 'Preparing records for CSV export...'
    : bulkFetchMode === 'print'
      ? 'Preparing records for print...'
      : 'Fetching feedback survey records...'

  /* ════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════ */
  return (
    <div className="page-enter relative">
      <div className={`bg-surface rounded-card shadow-card overflow-hidden mb-[22px] transition-[filter] duration-150 ${isFetchingRecords ? 'blur-[1px]' : ''}`}>

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
                  {totalRows} shown (filtered)
                </span>
              )}
            </div>
          </div>
          {counts.all > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={isFetchingRecords}
                className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg border border-navy bg-navy text-white text-[11px] font-semibold hover:bg-navy/90 transition-colors flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                title="Print the current filtered feedback review list"
              >
                <i className="ph ph-printer text-[13px]" />
                Print
              </button>
              <button
                onClick={handleExport}
                disabled={isFetchingRecords}
                className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg border border-kampgreen bg-kampgreen/10 text-kampgreen text-[11px] font-semibold hover:bg-kampgreen hover:text-white transition-colors flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                title="Download all survey records as CSV"
              >
                <i className="ph ph-file-csv text-[13px]" />
                Export CSV
              </button>
            </div>
          )}
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

          {/* Row 1: Support Level · Response Status · Aware · Likely */}
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

            {/* Response Status */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Response Status</label>
              <select value={filterResponseStatus} onChange={e => setFilterResponseStatus(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterResponseStatus ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Statuses</option>
                <option value="not_reach">Not Reach</option>
                <option value="no_answer">No Answer</option>
                <option value="need_followup">Need Followup</option>
                <option value="wrong_number">Wrong Number</option>
              </select>
            </div>

            {/* Aware of our candidate */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Aware of Our Candidate?</label>
              <select value={filterAwareOfCandidate} onChange={e => setFilterAwareOfCandidate(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterAwareOfCandidate ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Not Sure">Not Sure</option>
              </select>
            </div>

            {/* Likely to vote */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Likely to Vote?</label>
              <select value={filterLikelyToVote} onChange={e => setFilterLikelyToVote(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterLikelyToVote ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Not Sure">Not Sure</option>
              </select>
            </div>
          </div>

          {/* Row 2: Party · Block · Booth · Union · Panchayat */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
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

          </div>

          {/* Row 3: Telecaller · Remarks · Date From · Date To */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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

            {/* Remarks */}
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Remarks</label>
              <select value={filterRemarks} onChange={e => setFilterRemarks(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterRemarks ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All</option>
                <option value="commented">Commented</option>
                <option value="uncommented">Uncommented</option>
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

            <div />
          </div>
        </div>

        {/* ── List ── */}
        {counts.all === 0 ? (
          <div className="px-5 py-14 text-center">
            <i className="ph ph-notepad text-[36px] text-border block mb-3" />
            <p className="text-[13px] font-semibold text-heading mb-1">No submitted feedback yet</p>
            <p className="text-[11px] text-muted">
              Submit feedback from the <strong>Feedback</strong> tab first.
            </p>
          </div>
        ) : totalRows === 0 ? (
          <div className="px-5 py-10 text-center">
            <i className="ph ph-funnel text-[28px] text-border block mb-2" />
            <p className="text-[12px] text-muted">No records match your filter.</p>
          </div>
        ) : (
          <>
            {/* ── Pending Review ── */}
            {(filterTab === 'all' || filterTab === 'pending') && pagedPending.length > 0 && (
              <>
                <SectionLabel icon="ph ph-clock text-[13px] text-gray-500" label="Pending Review" count={filteredCounts.pending} color="bg-gray-50 text-gray-600" />
                {pagedPending.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* ── Field Survey Required ── */}
            {(filterTab === 'all' || filterTab === 'followup_required' || filterTab === 'field_survey') && pagedFieldSurveyReq.length > 0 && (
              <>
                <SectionLabel icon="ph ph-map-trifold text-[13px] text-amber-600" label="Field Survey Required" count={filteredCounts.field_survey} color="bg-amber-50 text-amber-700" />
                {pagedFieldSurveyReq.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* ── Telephonic Required ── */}
            {(filterTab === 'all' || filterTab === 'followup_required' || filterTab === 'telephonic') && pagedTelephonicReq.length > 0 && (
              <>
                <SectionLabel icon="ph ph-phone text-[13px] text-blue-600" label="Telephonic Required" count={filteredCounts.telephonic} color="bg-blue-50 text-blue-700" />
                {pagedTelephonicReq.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* ── Followup Required (no type — legacy records) ── */}
            {(filterTab === 'all' || filterTab === 'followup_required') && pagedFollowupReqOther.length > 0 && (
              <>
                <SectionLabel icon="ph ph-arrow-clockwise text-[13px] text-orange-500" label="Followup Required" count={filteredCounts.followup_required_other ?? 0} color="bg-orange-50 text-orange-600" />
                {pagedFollowupReqOther.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* ── Followup Not Required ── */}
            {(filterTab === 'all' || filterTab === 'followup_not_required') && pagedFollowupNotReq.length > 0 && (
              <>
                <SectionLabel icon="ph ph-check-circle text-[13px] text-green-600" label="Followup Not Required" count={filteredCounts.followup_not_required} color="bg-green-50 text-green-700" />
                {pagedFollowupNotReq.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {totalRows > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-alt">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted">
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRows)} of {totalRows}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">Rows</span>
                    <select
                      value={pageSize}
                      onChange={e => setPageSize(Number(e.target.value))}
                      className={`${selectCls} w-[84px] py-[6px] text-[11px]`}
                    >
                      {[10, 20, 30, 50, 75, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {totalRows > pageSize && (
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
                )}
              </div>
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
                  Loading timeline...
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

      {isFetchingRecords && (
        <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-[3px] flex items-center justify-center p-4">
          <div className="w-full max-w-[460px] rounded-xl border border-amber-200 bg-white/95 shadow-2xl px-5 py-4 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-amber-100 text-amber-700 mb-3">
              <i className="ph ph-warning-circle text-[22px]" />
            </div>
            <p className="text-[14px] font-bold text-heading">{fetchingMessage}</p>
            <p className="text-[12px] text-muted mt-1">
              Please do not reload or close this page until loading is complete.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy/10 text-navy text-[11px] font-semibold">
              <i className="ph ph-spinner-gap animate-spin text-[12px]" />
              Loading...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
