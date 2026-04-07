import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { FieldSurveyRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import { todayISO } from '../../utils/formatters'
import { useToast } from '../../context/ToastContext'
import apiClient from '../../utils/api'
import { exportToCsv } from '../../utils/exportCsv'

interface ApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface SurveyCountSet {
  all: number
  pending: number
  done: number
}

interface SurveyAssignmentTimeOption {
  value: string
  label: string
  count: number
}

interface NamedOption {
  id: number
  name: string
}

interface BoothMasterOption {
  id: number
  number: string
  name: string
}

type YNS = 'Yes' | 'No' | 'Not Sure' | ''
type SupportLevel = 'positive' | 'negative' | 'neutral' | ''
type ResponseStatus = 'not_reach' | 'no_answer' | 'need_followup' | 'answered' | 'wrong_number' | ''

const API_BATCH_SIZE = 500

const PARTY_PREFERENCE_OPTIONS = [
  'BJP', 'AIADMK', 'DMK', 'Congress', 'PMK', 'DMDK', 'TVK', 'Other', 'No Preference',
] as const

const RESPONSE_STATUS_BUTTON_OPTIONS = [
  { value: 'not_reach', label: 'Not Reach', activeClass: 'bg-kampr text-white border-kampr' },
  { value: 'no_answer', label: 'No Ans', activeClass: 'bg-saffron-dark text-white border-saffron-dark' },
  { value: 'need_followup', label: 'Followup', activeClass: 'bg-navy text-white border-navy' },
  { value: 'wrong_number', label: 'Wrong Num', activeClass: 'bg-rose-600 text-white border-rose-600' },
] as const

interface InlineSurveyDraft {
  support_level: SupportLevel
  response_status: ResponseStatus
  aware_of_candidate: YNS
  likely_to_vote: YNS
  party_preference: string
  remarks: string
}

const EMPTY_INLINE_DRAFT: InlineSurveyDraft = {
  support_level: '',
  response_status: '',
  aware_of_candidate: '',
  likely_to_vote: '',
  party_preference: '',
  remarks: '',
}

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

function ChoiceToggleGroup<T extends string>({ value, onChange, options }: {
  value: T | ''
  onChange: (v: T | '') => void
  options: { value: T; label: string; activeClass: string }[]
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? '' : opt.value)}
            className={`px-4 py-[7px] rounded-lg text-[12px] font-semibold border transition-all duration-150
              ${value === opt.value
                ? `${opt.activeClass} shadow-sm`
                : 'bg-white text-muted border-border hover:border-navy hover:text-navy'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function CompactChoiceToggleGroup<T extends string>({ value, onChange, options, disabled = false }: {
  value: T | ''
  onChange: (v: T | '') => void
  options: { value: T; label: string; activeClass: string }[]
  disabled?: boolean
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          className={`px-2.5 py-[5px] rounded-md text-[10px] font-semibold border transition-all duration-150
            ${value === opt.value
              ? `${opt.activeClass} shadow-sm`
              : 'bg-white text-muted border-border hover:border-navy hover:text-navy'}
            ${disabled ? 'opacity-60 cursor-not-allowed hover:border-border hover:text-muted' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

interface FlatVoter {
  assignment_id:    number
  id:               number   // assignment voter row id
  voter:            number | null
  voter_name:       string
  voter_id_no:      string
  phone:            string
  address:          string
  booth_name:       string
  booth_no:         string
  age:              number | null
  gender:           string
  telecaller_id:    number
  telecaller_name:  string
  telecaller_phone: string
  assigned_date:    string
  assignment_time:  string
}

interface SurveyAssignmentRow extends FlatVoter {
  survey_record?: FieldSurveyRecord | null
}

interface TelecallingAssignmentVoter {
  id:          number
  voter:       number | null
  voter_name:  string
  voter_id_no: string
  phone:       string
  address:     string
  booth_name:  string
  booth_no:    string
  age:         number | null
  gender:      string
}

interface TelecallingAssignment {
  id:               number
  telecaller_id:    number | null
  telecaller_name:  string
  telecaller_phone: string
  assigned_date:    string
  assignment_time?: string
  created_at:       string
  voters:           TelecallingAssignmentVoter[]
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
  if (s === 'wrong_number')  return 'bg-rose-100 text-rose-700'
  return 'bg-border text-muted'
}

const responseLabel = (s?: string) => {
  if (s === 'not_reach')     return 'Not Reach'
  if (s === 'no_answer')     return 'No Answer'
  if (s === 'need_followup') return 'Need Followup'
  if (s === 'wrong_number')  return 'Wrong Number'
  return s || ''
}

const genderLabel = (g?: string) =>
  g === 'm' || g === 'Male' ? 'Male' :
  g === 'f' || g === 'Female' ? 'Female' :
  g === 'o' || g === 'Other' ? 'Other' : ''

const sortText = (value?: string) => (value ?? '').trim().toLowerCase()
const normalizeFilterName = (value?: string) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const assignmentTimeFromValue = (assignment: Pick<TelecallingAssignment, 'assignment_time' | 'created_at'>) =>
  assignment.assignment_time || assignment.created_at.match(/(\d{2}:\d{2}:\d{2})/)?.[1] || ''

const flattenAssignments = (assignments: TelecallingAssignment[]): FlatVoter[] =>
  assignments.flatMap(a =>
    (a.voters ?? []).map(v => ({
      assignment_id:    a.id,
      id:               v.id,
      voter:            v.voter,
      voter_name:       v.voter_name,
      voter_id_no:      v.voter_id_no ?? '',
      phone:            v.phone ?? '',
      address:          v.address ?? '',
      booth_name:       v.booth_name ?? '',
      booth_no:         v.booth_no ?? '',
      age:              v.age ?? null,
      gender:           v.gender ?? '',
      telecaller_id:    a.telecaller_id ?? 0,
      telecaller_name:  a.telecaller_name,
      telecaller_phone: a.telecaller_phone ?? '',
      assigned_date:    a.assigned_date,
      assignment_time:  assignmentTimeFromValue(a),
    }))
  )

async function fetchAllAssignments(params: Record<string, string | number> = {}) {
  const { data: firstPage } = await apiClient.get<ApiResponse<TelecallingAssignment>>('/telecalling/assignments/', {
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
    const { data } = await apiClient.get<ApiResponse<TelecallingAssignment>>('/telecalling/assignments/', {
      params: { ...params, limit: API_BATCH_SIZE, offset },
    })
    return data.results ?? []
  }))

  return firstResults.concat(...remainingPages)
}

async function fetchAllSurveyVoterRows(
  params: Record<string, string | number> = {},
): Promise<SurveyAssignmentRow[]> {
  const { data: firstPage } = await apiClient.get<
    ApiResponse<SurveyAssignmentRow>
  >('/telecalling/assignments/survey-voters/', {
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
    const { data } = await apiClient.get<ApiResponse<SurveyAssignmentRow>>('/telecalling/assignments/survey-voters/', {
      params: { ...params, limit: API_BATCH_SIZE, offset },
    })
    return data.results ?? []
  }))

  return firstResults.concat(...remainingPages)
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
  const masterApi = useMasterAPI()
  const { showToast } = useToast()

  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)

  /* ── Paginated assignment-voter rows ── */
  const [rows, setRows] = useState<SurveyAssignmentRow[]>([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [totalRows, setTotalRows] = useState(0)
  const [scopeCounts, setScopeCounts] = useState<SurveyCountSet>({ all: 0, pending: 0, done: 0 })
  const [filteredCounts, setFilteredCounts] = useState<SurveyCountSet>({ all: 0, pending: 0, done: 0 })
  const [assignmentTimeOptions, setAssignmentTimeOptions] = useState<SurveyAssignmentTimeOption[]>([])
  const [telecallerOptions, setTelecallerOptions] = useState<{ id: number; name: string }[]>([])
  const [masterBooths, setMasterBooths] = useState<BoothMasterOption[]>([])
  const [masterBlocks, setMasterBlocks] = useState<NamedOption[]>([])
  const [masterUnions, setMasterUnions] = useState<NamedOption[]>([])
  const [masterPanchayats, setMasterPanchayats] = useState<{ id: number; name: string; union_name?: string }[]>([])
  const [masterParties, setMasterParties] = useState<{ id: number; name: string; abbreviation?: string }[]>([])

  useEffect(() => {
    apiClient.get('/telecalling/assignments/filters/')
      .then(response => {
        const seen = new Set<string>()
        const options = (response.data.telecallers ?? []).reduce((acc: { id: number; name: string }[], row: { id: number; name: string }) => {
          const name = (row.name ?? '').trim()
          if (!name) return acc

          const key = row.id != null
            ? `id:${row.id}`
            : `name:${normalizeFilterName(name)}`

          if (seen.has(key)) return acc
          seen.add(key)
          acc.push({
            id: row.id,
            name,
          })
          return acc
        }, [])
        setTelecallerOptions(options)
      })
      .catch(() => setTelecallerOptions([]))
  }, [])

  useEffect(() => {
    masterApi.fetchBooths().then(data => data && setMasterBooths(data))
    masterApi.fetchAreas().then(data => data && setMasterBlocks(data))
    masterApi.fetchUnions().then(data => data && setMasterUnions(data))
    masterApi.fetchPanchayats().then(data => data && setMasterPanchayats(data))
    masterApi.fetchParties().then(data => data && setMasterParties(data))
  }, [])

  /* ── Feedback records ── */
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  /* ── Filters ── */
  const [filterDate,       setFilterDate]       = useState('')
  const [filterTelecaller, setFilterTelecaller] = useState('')
  const [filterAssignedList, setFilterAssignedList] = useState('')
  const [filterStatus,     setFilterStatus]     = useState<'all' | 'pending' | 'done'>('all')
  const [search, setSearch]                     = useState('')
  const [filterSupportLevel, setFilterSupportLevel] = useState('')
  const [filterResponseStatus, setFilterResponseStatus] = useState('')
  const [filterAwareOfCandidate, setFilterAwareOfCandidate] = useState('')
  const [filterLikelyToVote, setFilterLikelyToVote] = useState('')
  const [filterParty, setFilterParty] = useState('')
  const [filterBlock, setFilterBlock] = useState('')
  const [filterUnion, setFilterUnion] = useState('')
  const [filterPanchayat, setFilterPanchayat] = useState('')
  const [filterBooth, setFilterBooth] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [inlineDrafts, setInlineDrafts]         = useState<Record<string, InlineSurveyDraft>>({})
  const [savingRows, setSavingRows]             = useState<Record<string, boolean>>({})

  /* ── Toggle state ── */
  const [registered,       setRegistered]       = useState<YNS>('')
  const [awareOfCandidate, setAwareOfCandidate] = useState<YNS>('')
  const [likelyToVote,     setLikelyToVote]     = useState<YNS>('')
  const [supportLevel,     setSupportLevel]     = useState<SupportLevel>('')
  const [responseStatus,   setResponseStatus]   = useState<ResponseStatus>('')

  const pendingFill       = useRef<FieldSurveyRecord | null>(null)
  const selectedVoterRef  = useRef<FlatVoter | null>(null)
  const currentVoterIdRef = useRef<number | null>(null)   // voter FK for the active form session
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
    partyPref:       useRef<HTMLSelectElement>(null),
    remarks:         useRef<HTMLTextAreaElement>(null),
  }

  useEffect(() => {
    setFilterAssignedList('')
  }, [filterDate, filterTelecaller])

  useEffect(() => {
    if (!filterAssignedList || assignmentTimeOptions.some(option => option.value === filterAssignedList)) return
    setFilterAssignedList('')
  }, [assignmentTimeOptions, filterAssignedList])

  const reloadRows = useCallback((signal?: AbortSignal) => {
    setLoadingRows(true)
    const params: Record<string, string | number> = {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      status: filterStatus,
    }
    if (filterDate) params.date = filterDate
    if (filterTelecaller) params.telecaller = filterTelecaller
    if (filterAssignedList) params.assignment_time = filterAssignedList
    if (search.trim()) params.search = search.trim()
    if (filterSupportLevel) params.support_level = filterSupportLevel
    if (filterResponseStatus) params.response_status = filterResponseStatus
    if (filterAwareOfCandidate) params.aware_of_candidate = filterAwareOfCandidate
    if (filterLikelyToVote) params.likely_to_vote = filterLikelyToVote
    if (filterParty) params.party = filterParty
    if (filterBlock) params.block = filterBlock
    if (filterUnion) params.union = filterUnion
    if (filterPanchayat) params.panchayat = filterPanchayat
    if (filterBooth) params.booth = filterBooth
    if (filterDateFrom) params.date_from = filterDateFrom
    if (filterDateTo) params.date_to = filterDateTo

    apiClient.get('/telecalling/assignments/survey-voters/', { params, signal })
      .then(response => {
        const data = response.data as ApiResponse<SurveyAssignmentRow> & {
          counts?: SurveyCountSet
          filtered_counts?: SurveyCountSet
          assignment_times?: SurveyAssignmentTimeOption[]
        }
        setRows(data.results ?? [])
        setTotalRows(data.count ?? 0)
        setScopeCounts(data.counts ?? { all: 0, pending: 0, done: 0 })
        setFilteredCounts(data.filtered_counts ?? data.counts ?? { all: 0, pending: 0, done: 0 })
        setAssignmentTimeOptions(data.assignment_times ?? [])
      })
      .catch(err => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
        setRows([])
        setTotalRows(0)
        setScopeCounts({ all: 0, pending: 0, done: 0 })
        setFilteredCounts({ all: 0, pending: 0, done: 0 })
        setAssignmentTimeOptions([])
        showToast('Failed to load telecalling feedback list', 'error')
      })
      .finally(() => setLoadingRows(false))
  }, [
    PAGE_SIZE, page, filterStatus, filterDate, filterTelecaller, filterAssignedList,
    search, filterSupportLevel, filterResponseStatus, filterAwareOfCandidate,
    filterLikelyToVote, filterParty, filterBlock, filterUnion, filterPanchayat,
    filterBooth, filterDateFrom, filterDateTo, showToast,
  ])

  useEffect(() => {
    const controller = new AbortController()
    reloadRows(controller.signal)
    return () => controller.abort()
  }, [reloadRows])

  const records = useMemo(
    () => rows.map(row => row.survey_record).filter(Boolean) as FieldSurveyRecord[],
    [rows],
  )

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
      currentVoterIdRef.current = d.voter ?? null
      if (r.surveyDate.current)     r.surveyDate.current.value     = d.survey_date      ?? todayISO()
      if (r.booth.current)          r.booth.current.value          = d.booth_no          ?? ''
      if (r.telecaller.current)     r.telecaller.current.value     = d.surveyed_by       ?? ''
      if (r.voterName.current)      r.voterName.current.value      = d.voter_name        ?? ''
      if (r.age.current)            r.age.current.value            = d.age != null ? String(d.age) : ''
      if (r.gender.current)         r.gender.current.value         = toGenderDisplay(d.gender)
      if (r.phone.current)          r.phone.current.value          = d.phone             ?? ''
      if (r.address.current)        r.address.current.value        = d.address           ?? ''
      if (r.partyPref.current)      r.partyPref.current.value      = d.party_preference  ?? ''
      if (r.remarks.current)        r.remarks.current.value        = d.remarks           ?? ''
      setRegistered((d.is_registered as YNS) ?? '')
      setAwareOfCandidate((d.aware_of_candidate as YNS) ?? '')
      setLikelyToVote((d.likely_to_vote as YNS) ?? '')
      setSupportLevel((d.support_level as SupportLevel) ?? '')
      setResponseStatus((d.response_status as ResponseStatus) ?? '')
      pendingFill.current = null
    } else if (selectedVoterRef.current) {
      const v = selectedVoterRef.current
      currentVoterIdRef.current = v.voter ?? null
      if (r.surveyDate.current)     r.surveyDate.current.value = v.assigned_date || todayISO()
      if (r.booth.current)          r.booth.current.value      = v.booth_no || ''
      if (r.telecaller.current)     r.telecaller.current.value = v.telecaller_name
      if (r.voterName.current)      r.voterName.current.value  = v.voter_name
      if (r.age.current)            r.age.current.value        = v.age != null ? String(v.age) : ''
      if (r.gender.current)         r.gender.current.value     = toGenderDisplay(v.gender)
      if (r.phone.current)          r.phone.current.value      = v.phone ?? ''
      if (r.address.current)        r.address.current.value    = v.address ?? ''
      if (r.partyPref.current)      r.partyPref.current.value      = ''
      if (r.remarks.current)        r.remarks.current.value        = ''
      setRegistered(''); setAwareOfCandidate(''); setLikelyToVote('')
      setSupportLevel(''); setResponseStatus('')
      selectedVoterRef.current = null
    }
  }, [fillKey, isFormOpen])

  const resetToggles = () => {
    setRegistered('')
    setAwareOfCandidate('')
    setLikelyToVote('')
    setSupportLevel('')
    setResponseStatus('')
  }
  const clear = () => {
    if (r.surveyDate.current)     r.surveyDate.current.value     = todayISO()
    if (r.booth.current)          r.booth.current.value          = ''
    if (r.telecaller.current)     r.telecaller.current.value     = ''
    if (r.voterName.current)      r.voterName.current.value      = ''
    if (r.age.current)            r.age.current.value            = ''
    if (r.gender.current)         r.gender.current.value         = ''
    if (r.phone.current)          r.phone.current.value          = ''
    if (r.address.current)        r.address.current.value        = ''
    if (r.partyPref.current)      r.partyPref.current.value      = ''
    if (r.remarks.current)        r.remarks.current.value        = ''
    resetToggles()
  }

  const collect = (): Partial<FieldSurveyRecord> => {
    /* Use undefined (omitted from JSON) for empty optional fields so the
       backend never receives empty-string values it may reject.           */
    const str = (v?: string) => v?.trim() || undefined
    return {
      ...(currentVoterIdRef.current != null ? { voter: currentVoterIdRef.current } : {}),
      survey_date:        r.surveyDate.current?.value?.trim() || todayISO(),
      voter_name:         r.voterName.current?.value?.trim()  || '',
      age:                r.age.current?.value ? Number(r.age.current.value) : undefined,
      booth_no:           str(r.booth.current?.value),
      gender:             str(r.gender.current?.value),
      phone:              str(r.phone.current?.value),
      address:            str(r.address.current?.value),
      support_level:      supportLevel || undefined,
      party_preference:   str(r.partyPref.current?.value),
      response_status:    responseStatus || undefined,
      remarks:            str(r.remarks.current?.value),
      surveyed_by:        str(r.telecaller.current?.value),
      is_registered:      registered      || undefined,
      aware_of_candidate: awareOfCandidate || undefined,
      likely_to_vote:     likelyToVote    || undefined,
    }
  }

  const closeForm = () => { setFormOpen(false); setEditingId(null); currentVoterIdRef.current = null; clear() }

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
        reloadRows()
        showToast('<i class="ph ph-check-circle"></i> Feedback updated!', '#138808')
        closeForm()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update feedback.', '#dc2626')
      }
    } else {
      const created = await createFieldSurvey(d)
      if (created) {
        reloadRows()
        showToast('<i class="ph ph-check-circle"></i> Feedback saved!', '#138808')
        closeForm()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save feedback.', '#dc2626')
      }
    }
  }

  const findRecordForVoter = (voter: FlatVoter) => {
    if (voter.voter != null) {
      return records.find(rec => rec.voter === voter.voter)
    }

    const normalizedName = voter.voter_name.toLowerCase()
    if (voter.phone) {
      const byNameAndPhone = records.find(rec =>
        rec.voter == null &&
        rec.voter_name?.toLowerCase() === normalizedName &&
        rec.phone === voter.phone
      )
      if (byNameAndPhone) return byNameAndPhone
    }

    return records.find(rec =>
      rec.voter == null &&
      rec.voter_name?.toLowerCase() === normalizedName
    )
  }

  const handleVoterClick = (voter: FlatVoter) => {
    const existing = findRecordForVoter(voter)
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
    if (ok) reloadRows()
  }

  const recordByVoterId = useMemo(() => {
    const map = new Map<number, FieldSurveyRecord>()
    records.forEach(rec => {
      if (rec.voter != null) map.set(rec.voter, rec)
    })
    return map
  }, [records])

  const recordByLooseKey = useMemo(() => {
    const map = new Map<string, FieldSurveyRecord>()
    records.forEach(rec => {
      if (rec.voter != null || !rec.voter_name) return

      const normalizedName = rec.voter_name.toLowerCase()
      if (rec.phone) {
        map.set(`${normalizedName}::${rec.phone}`, rec)
      }
      if (!map.has(normalizedName)) {
        map.set(normalizedName, rec)
      }
    })
    return map
  }, [records])

  const getRecordForVoter = (voter: FlatVoter) => {
    if (voter.voter != null) {
      return recordByVoterId.get(voter.voter)
    }

    const normalizedName = voter.voter_name.toLowerCase()
    if (voter.phone) {
      const byNameAndPhone = recordByLooseKey.get(`${normalizedName}::${voter.phone}`)
      if (byNameAndPhone) return byNameAndPhone
    }

    return recordByLooseKey.get(normalizedName)
  }

  const getVoterRowKey = (voter: FlatVoter) => `${voter.assignment_id}:${voter.id}`

  const getInlineDraftForVoter = (voter: FlatVoter): InlineSurveyDraft => ({
    ...EMPTY_INLINE_DRAFT,
    ...(inlineDrafts[getVoterRowKey(voter)] ?? {}),
  })

  const updateInlineDraft = (voter: FlatVoter, patch: Partial<InlineSurveyDraft>) => {
    const rowKey = getVoterRowKey(voter)
    setInlineDrafts(prev => ({
      ...prev,
      [rowKey]: {
        ...EMPTY_INLINE_DRAFT,
        ...(prev[rowKey] ?? {}),
        ...patch,
      },
    }))
  }

  const clearInlineDraft = (voter: FlatVoter) => {
    const rowKey = getVoterRowKey(voter)
    setInlineDrafts(prev => {
      if (!prev[rowKey]) return prev
      const next = { ...prev }
      delete next[rowKey]
      return next
    })
  }

  const normalizeInlinePhone = (value?: string) => {
    const raw = (value ?? '').trim()
    const digits = raw.replace(/\D/g, '')
    return digits.length >= 10 ? raw : undefined
  }

  const normalizeInlineAge = (value?: number | null) =>
    value != null && value >= 18 && value <= 120 ? value : undefined

  const buildInlinePayload = (voter: FlatVoter, draft: InlineSurveyDraft): Partial<FieldSurveyRecord> => ({
    ...(voter.voter != null ? { voter: voter.voter } : {}),
    survey_date: voter.assigned_date || todayISO(),
    booth_no: voter.booth_no || undefined,
    voter_name: voter.voter_name,
    age: normalizeInlineAge(voter.age),
    gender: toGenderDisplay(voter.gender) || undefined,
    phone: normalizeInlinePhone(voter.phone),
    address: voter.address?.trim() || undefined,
    support_level: draft.support_level || undefined,
    party_preference: draft.party_preference.trim() || undefined,
    response_status: draft.response_status || undefined,
    remarks: draft.remarks.trim() || undefined,
    surveyed_by: voter.telecaller_name || undefined,
    aware_of_candidate: draft.aware_of_candidate || undefined,
    likely_to_vote: draft.likely_to_vote || undefined,
  })

  const handleInlineSave = async (voter: FlatVoter) => {
    if (getRecordForVoter(voter)) {
      showToast('<i class="ph ph-lock-key"></i> This survey is already saved and locked.', '#0d2455')
      return
    }

    const draft = getInlineDraftForVoter(voter)
    const hasSelections = Object.values(draft).some(value => String(value ?? '').trim() !== '')
    if (!hasSelections) {
      showToast('<i class="ph ph-warning"></i> Select at least one survey option before updating.', '#dc2626')
      return
    }

    const rowKey = getVoterRowKey(voter)
    setSavingRows(prev => ({ ...prev, [rowKey]: true }))

    const created = await createFieldSurvey(buildInlinePayload(voter, draft))
    if (created) {
      reloadRows()
      clearInlineDraft(voter)
      showToast('<i class="ph ph-check-circle"></i> Survey saved and locked.', '#138808')
    } else {
      showToast('<i class="ph ph-x-circle"></i> Failed to save survey.', '#dc2626')
    }

    setSavingRows(prev => {
      const next = { ...prev }
      delete next[rowKey]
      return next
    })
  }

  const filteredVoters = rows
  const pendingVotersCount = filteredCounts.pending
  const doneVotersCount = filteredCounts.done

  const displayPending = filterStatus !== 'done'
  const displayDone    = filterStatus !== 'pending'
  const hasScopeFilters = !!filterDate || !!filterTelecaller || !!filterAssignedList

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [
    filterStatus, filterDate, filterTelecaller, filterAssignedList, search,
    filterSupportLevel, filterResponseStatus, filterAwareOfCandidate,
    filterLikelyToVote, filterParty, filterBlock, filterUnion, filterPanchayat,
    filterBooth, filterDateFrom, filterDateTo,
  ])

  const partyOptions = useMemo(() => {
    if (masterParties.length > 0) return masterParties.map(p => ({ name: p.name, abbr: p.abbreviation }))
    return PARTY_PREFERENCE_OPTIONS.map(name => ({ name, abbr: undefined }))
  }, [masterParties])

  const blockOptions = useMemo(
    () => masterBlocks.map(block => block.name).sort((a, b) => a.localeCompare(b)),
    [masterBlocks],
  )

  const unionOptions = useMemo(
    () => masterUnions.map(union => union.name).sort((a, b) => a.localeCompare(b)),
    [masterUnions],
  )

  const panchayatOptions = useMemo(
    () => masterPanchayats.map(panchayat => panchayat.name).sort((a, b) => a.localeCompare(b)),
    [masterPanchayats],
  )

  const boothOptions = useMemo(
    () => [...masterBooths].sort((left, right) => left.number.localeCompare(right.number, undefined, { numeric: true, sensitivity: 'base' })),
    [masterBooths],
  )

  const hasAdvancedFilters = !!(
    filterSupportLevel || filterResponseStatus || filterAwareOfCandidate ||
    filterLikelyToVote || filterParty || filterBlock || filterUnion ||
    filterPanchayat || filterBooth || filterDateFrom || filterDateTo
  )

  const clearAdvancedFilters = () => {
    setFilterSupportLevel('')
    setFilterResponseStatus('')
    setFilterAwareOfCandidate('')
    setFilterLikelyToVote('')
    setFilterParty('')
    setFilterBlock('')
    setFilterUnion('')
    setFilterPanchayat('')
    setFilterBooth('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const activeList = filteredVoters
  const totalPages  = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const pagedList   = filteredVoters

  useEffect(() => {
    setPage(prev => Math.min(prev, totalPages))
  }, [totalPages])

  const pagedPending = pagedList.filter(v => !getRecordForVoter(v))
  const pagedDone    = pagedList.filter(v =>  getRecordForVoter(v))

  const pageNums: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const nums: (number | '...')[] = [1]
    if (page > 3) nums.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i)
    if (page < totalPages - 2) nums.push('...')
    nums.push(totalPages)
    return nums
  })()

  /* ── Voter row ── */
  const renderVoterRow = (voter: FlatVoter) => {
    const rec  = getRecordForVoter(voter)
    const done = !!rec
    const rowKey = getVoterRowKey(voter)
    const inlineDraft = getInlineDraftForVoter(voter)
    const isSaving = !!savingRows[rowKey]
    const hasInlineSelections = Object.values(inlineDraft).some(value => String(value ?? '').trim() !== '')

    return (
      <div key={rowKey} className={`border-b border-border ${done ? 'bg-green-50/30' : ''}`}>

        {/* ── Main row ── */}
        <div className="flex items-center gap-3 px-5 py-3">

          {/* Status avatar */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold
            ${done ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
            {done
              ? <i className="ph ph-check-circle text-[18px]" />
              : <span>{voter.voter_name.charAt(0).toUpperCase()}</span>
            }
          </div>

          {/* Voter info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-heading">{voter.voter_name}</span>
              <span className="text-[10px] text-muted font-mono">{voter.voter_id_no}</span>
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
            {voter.address && (
              <div className="mt-1 text-[10px] text-muted truncate">
                <i className="ph ph-map-pin mr-1" />
                {voter.address}
              </div>
            )}
          </div>

          {done ? (
            <span className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg border border-green-200 bg-green-100 text-green-700 text-[11px] font-semibold flex-shrink-0">
              <i className="ph ph-lock-key text-[12px]" />
              Locked
            </span>
          ) : (
            <button
              onClick={() => handleInlineSave(voter)}
              disabled={isSaving || !hasInlineSelections}
              className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg border border-navy bg-navy text-white text-[11px] font-semibold hover:bg-navy/90 transition-colors flex-shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <i className={`text-[12px] ${isSaving ? 'ph ph-spinner-gap animate-spin' : 'ph ph-arrow-clockwise'}`} />
              {isSaving ? 'Saving...' : 'Update'}
            </button>
          )}
        </div>

        {!done && (
          <div className="px-5 pb-3">
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-navy uppercase tracking-[0.6px]">Voter Support Level</label>
                  <CompactChoiceToggleGroup
                    value={inlineDraft.support_level}
                    onChange={(value) => updateInlineDraft(voter, { support_level: value as SupportLevel })}
                    disabled={isSaving}
                    options={[
                      { value: 'positive', label: 'Positive', activeClass: 'bg-kampgreen text-white border-kampgreen' },
                      { value: 'negative', label: 'Negative', activeClass: 'bg-kampr text-white border-kampr' },
                      { value: 'neutral', label: 'Neutral', activeClass: 'bg-navy text-white border-navy' },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-navy uppercase tracking-[0.6px]">Response Status</label>
                  <CompactChoiceToggleGroup
                    value={inlineDraft.response_status}
                    disabled={isSaving}
                    onChange={(value) => updateInlineDraft(voter, { response_status: value as ResponseStatus })}
                    options={[...RESPONSE_STATUS_BUTTON_OPTIONS]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-navy uppercase tracking-[0.6px]">Aware of our candidate?</label>
                  <CompactChoiceToggleGroup
                    value={inlineDraft.aware_of_candidate}
                    onChange={(value) => updateInlineDraft(voter, { aware_of_candidate: value as YNS })}
                    disabled={isSaving}
                    options={[
                      { value: 'Yes', label: 'Yes', activeClass: 'bg-kampgreen text-white border-kampgreen' },
                      { value: 'No', label: 'No', activeClass: 'bg-kampr text-white border-kampr' },
                      { value: 'Not Sure', label: 'Not Sure', activeClass: 'bg-navy text-white border-navy' },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-navy uppercase tracking-[0.6px]">Likely to vote?</label>
                  <CompactChoiceToggleGroup
                    value={inlineDraft.likely_to_vote}
                    onChange={(value) => updateInlineDraft(voter, { likely_to_vote: value as YNS })}
                    disabled={isSaving}
                    options={[
                      { value: 'Yes', label: 'Yes', activeClass: 'bg-kampgreen text-white border-kampgreen' },
                      { value: 'No', label: 'No', activeClass: 'bg-kampr text-white border-kampr' },
                      { value: 'Not Sure', label: 'Not Sure', activeClass: 'bg-navy text-white border-navy' },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-navy uppercase tracking-[0.6px]">Party Preference</label>
                  <select
                    value={inlineDraft.party_preference}
                    disabled={isSaving}
                    onChange={e => updateInlineDraft(voter, { party_preference: e.target.value })}
                    className={`${selectCls} text-[11px] py-[7px] ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select party</option>
                    {PARTY_PREFERENCE_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-navy uppercase tracking-[0.6px]">Remarks / Observations</label>
                <textarea
                  value={inlineDraft.remarks}
                  disabled={isSaving}
                  onChange={e => updateInlineDraft(voter, { remarks: e.target.value })}
                  className={`${textareaCls} text-[11px] min-h-[70px] ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  placeholder="Type any remarks or observations..."
                />
              </div>

              <div className="mt-2 text-[10px] text-orange-700/80 flex items-center gap-1.5">
                <i className="ph ph-info text-[11px]" />
                Select the quick survey options and press <strong>Update</strong> to save this voter as locked.
              </div>
            </div>
          </div>
        )}

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
              <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-green-700">
                <i className="ph ph-lock-key text-[11px]" />
                Locked after save
              </span>
            </div>

            {/* Feedback detail pills */}
            <div className="flex flex-wrap gap-2 px-3 py-2">
              {rec.support_level && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${supportColor(rec.support_level)}`}>
                  <i className="ph ph-hand-pointing mr-1" />{rec.support_level}
                </span>
              )}
              {responseLabel(rec.response_status) && (
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

  const handleExport = async () => {
    const [surveyRecords, assignmentRows] = await Promise.all([
      fetchFieldSurveys(),
      fetchAllSurveyVoterRows({ status: 'done' }),
    ])

    if (!surveyRecords?.length) return

    const voterMap = new Map(
      assignmentRows.map(v => [(v.voter_name ?? '').toLowerCase(), v] as const),
    )
    const headers = [
      'Survey Date', 'Voter Name', 'Voter ID No', 'Phone', 'Address', 'Booth',
      'Age', 'Gender', 'Telecaller Name', 'Telecaller Phone',
      'Support Level', 'Party Preference', 'Response Status',
      'Is Registered', 'Aware of Candidate', 'Likely to Vote', 'Remarks',
    ]
    const exportRows = surveyRecords.map(record => {
      const voter = voterMap.get((record.voter_name ?? '').toLowerCase())
      return [
        record.survey_date,
        record.voter_name,
        voter?.voter_id_no ?? '',
        record.phone,
        record.address,
        record.booth_no,
        record.age,
        toGenderDisplay(record.gender),
        record.surveyed_by ?? voter?.telecaller_name ?? '',
        voter?.telecaller_phone ?? '',
        record.support_level,
        record.party_preference,
        record.response_status ? responseLabel(record.response_status) : '',
        record.is_registered,
        record.aware_of_candidate,
        record.likely_to_vote,
        record.remarks,
      ]
    })
    exportToCsv(headers, exportRows, `BJP_VoterSurvey_${new Date().toISOString().slice(0, 10)}.csv`)
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
              {scopeCounts.all > 0 ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold">
                    <i className="ph ph-clock text-[10px]" />
                    {scopeCounts.pending} Not Yet Action Taken
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                    <i className="ph ph-check-circle text-[10px]" />
                    {scopeCounts.done} Action Taken
                  </span>
                </div>
              ) : totalRows > 0 ? (
                <p className="text-[11px] text-muted">No voters match the selected assignment filters</p>
              ) : (
                <p className="text-[11px] text-muted">No assigned voters yet</p>
              )}
            </div>
          </div>
          {scopeCounts.done > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-[6px] rounded-lg border border-kampgreen bg-kampgreen/10 text-kampgreen text-[11px] font-semibold hover:bg-kampgreen hover:text-white transition-colors flex-shrink-0"
              title="Download all survey records as CSV"
            >
              <i className="ph ph-file-csv text-[13px]" />
              Export CSV
            </button>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-surface-alt border-b border-border">
          {/* Status tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-semibold">
            {([
              { key: 'all',     label: 'All',                  count: scopeCounts.all },
              { key: 'pending', label: 'Not Yet Action Taken', count: scopeCounts.pending },
              { key: 'done',    label: 'Action Taken',         count: scopeCounts.done },
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

          {/* Date filter */}
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className={`${inputCls} w-[160px]`}
          />

          {/* Telecaller filter */}
          <select value={filterTelecaller} onChange={e => setFilterTelecaller(e.target.value)}
            className={`${selectCls} w-[180px]`}>
            <option value="">All Telecallers</option>
            {telecallerOptions.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Assigned List filter */}
          <select
            value={filterAssignedList}
            onChange={e => setFilterAssignedList(e.target.value)}
            disabled={!filterDate || !filterTelecaller}
            className={`${selectCls} w-[180px] disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed`}
          >
            <option value="">
              {!filterDate || !filterTelecaller ? 'Select date + telecaller' : 'All Assigned Lists'}
            </option>
            {assignmentTimeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <i className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted pointer-events-none" />
            <input type="text" placeholder="Name, voter ID, phone, address…"
              value={search} onChange={e => setSearch(e.target.value)}
              className={`${inputCls} pl-7 w-full`} />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                <i className="ph ph-x text-[11px]" />
              </button>
            )}
          </div>

          {search && (
            <button onClick={() => setSearch('')}
              className="flex items-center gap-1 px-3 py-[6px] rounded-lg border border-rose-200 bg-rose-50 text-rose-500 text-[11px] font-medium hover:bg-rose-100 transition-colors">
              <i className="ph ph-x text-[11px]" /> Clear
            </button>
          )}
        </div>

        <div className="px-5 py-3 border-b border-border bg-[#fafafa]">
          <div className="flex items-center gap-1.5 mb-2">
            <i className="ph ph-funnel text-[12px] text-navy" />
            <span className="text-[10px] font-bold text-navy uppercase tracking-[0.8px]">Additional Filters</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Party Reference</label>
              <select value={filterParty} onChange={e => setFilterParty(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterParty ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Parties</option>
                {partyOptions.map(party => (
                  <option key={party.name} value={party.name}>{party.abbr ? `${party.abbr} — ${party.name}` : party.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Block</label>
              <select value={filterBlock} onChange={e => setFilterBlock(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterBlock ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Blocks</option>
                {blockOptions.map(block => <option key={block} value={block}>{block}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Booth</label>
              <select value={filterBooth} onChange={e => setFilterBooth(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterBooth ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Booths</option>
                {boothOptions.map(booth => (
                  <option key={booth.id} value={booth.number}>{booth.number} — {booth.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Union</label>
              <select value={filterUnion} onChange={e => setFilterUnion(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterUnion ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Unions</option>
                {unionOptions.map(union => <option key={union} value={union}>{union}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Panchayat</label>
              <select value={filterPanchayat} onChange={e => setFilterPanchayat(e.target.value)}
                className={`${selectCls} w-full text-[11px] ${filterPanchayat ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}>
                <option value="">All Panchayats</option>
                {panchayatOptions.map(panchayat => <option key={panchayat} value={panchayat}>{panchayat}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Survey Date From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className={`${inputCls} w-full text-[11px] ${filterDateFrom ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.6px] mb-1">Survey Date To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className={`${inputCls} w-full text-[11px] ${filterDateTo ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
              />
            </div>

            {hasAdvancedFilters && (
              <div className="md:col-span-2 flex items-end justify-end">
                <button onClick={clearAdvancedFilters}
                  className="flex items-center gap-1 px-3 py-[6px] rounded-lg border border-rose-200 bg-rose-50 text-rose-500 text-[11px] font-medium hover:bg-rose-100 transition-colors">
                  <i className="ph ph-x-circle text-[12px]" /> Clear Additional Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── List ── */}
        {loadingRows ? (
          <div className="px-5 py-14 text-center text-muted">
            <i className="ph ph-spinner-gap animate-spin text-[28px] block mb-2" />
            Loading assigned voters…
          </div>
        ) : scopeCounts.all === 0 ? (
          <div className="px-5 py-14 text-center">
            <i className="ph ph-phone-slash text-[36px] text-border block mb-3" />
            {hasScopeFilters ? (
              <>
                <p className="text-[13px] font-semibold text-heading mb-1">No voters match the selected assignment filters</p>
                <p className="text-[11px] text-muted">Change the selected date or telecaller filters to see assigned voters.</p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-heading mb-1">No assigned voters yet</p>
                <p className="text-[11px] text-muted">Go to <strong>Assign Telecalling</strong> to assign voters first.</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Not Yet Action Taken */}
            {displayPending && pagedPending.length > 0 && (
              <>
                <SectionLabel
                  icon="ph ph-clock text-orange-500"
                  label="Not Yet Action Taken"
                  count={filteredCounts.pending}
                  color="bg-orange-50 text-orange-600"
                />
                {pagedPending.map(voter => renderVoterRow(voter))}
              </>
            )}

            {/* Action Taken */}
            {displayDone && pagedDone.length > 0 && (
              <>
                <SectionLabel
                  icon="ph ph-check-circle text-green-600"
                  label="Action Taken"
                  count={filteredCounts.done}
                  color="bg-green-50 text-green-700"
                />
                {pagedDone.map(voter => renderVoterRow(voter))}
              </>
            )}

            {/* No match */}
            {filteredCounts.all === 0 && (
              <div className="px-5 py-12 text-center">
                <i className="ph ph-magnifying-glass text-[30px] text-border block mb-2" />
                <p className="text-[12px] text-muted">No voters match your filter.</p>
              </div>
            )}
            {filteredCounts.all > 0 && !displayPending && filteredCounts.pending === 0 && (
              <div className="px-5 py-8 text-center text-[12px] text-muted">
                No pending voters.
              </div>
            )}
            {filteredCounts.all > 0 && !displayDone && filteredCounts.done === 0 && (
              <div className="px-5 py-8 text-center text-[12px] text-muted">
                No completed voters yet.
              </div>
            )}

            {/* ── Pagination controls ── */}
            {totalRows > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-alt">
                <span className="text-[11px] text-muted">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalRows)} of {totalRows}
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

        <div className="mt-4">
          <FormRow cols={2}>
            <FormGroup label="Voter Support Level">
              <ChoiceToggleGroup
                value={supportLevel}
                onChange={setSupportLevel}
                options={[
                  { value: 'positive', label: 'Positive', activeClass: 'bg-kampgreen text-white border-kampgreen' },
                  { value: 'negative', label: 'Negative', activeClass: 'bg-kampr text-white border-kampr' },
                  { value: 'neutral', label: 'Neutral', activeClass: 'bg-navy text-white border-navy' },
                ]}
              />
            </FormGroup>
            <FormGroup label="Response Status">
              <ChoiceToggleGroup
                value={responseStatus}
                onChange={setResponseStatus}
                options={[...RESPONSE_STATUS_BUTTON_OPTIONS]}
              />
            </FormGroup>
          </FormRow>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <ToggleGroup label="Aware of our candidate?" value={awareOfCandidate} onChange={setAwareOfCandidate} />
            <ToggleGroup label="Likely to vote?" value={likelyToVote} onChange={setLikelyToVote} />
          </div>
          <FormRow cols={1}>
            <FormGroup label="Party Preference">
              <select ref={r.partyPref} className={selectCls}>
                <option value="">Select party</option>
                <option>BJP</option><option>AIADMK</option><option>DMK</option>
                <option>Congress</option><option>PMK</option><option>DMDK</option>
                <option>Other</option><option>No Preference</option>
              </select>
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
