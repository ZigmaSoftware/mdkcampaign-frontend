import { useState, useEffect, useRef } from 'react'
import apiClient from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { inputCls, selectCls } from '../../components/entry/FormGroup'

interface ApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/* ─── Types ──────────────────────────────────────────────── */
interface VoterRow {
  id: number
  name: string
  voter_id: string
  phone?: string
  phone2?: string
  alt_phoneno2?: string
  alt_phoneno3?: string
  address?: string
  booth: number
  booth_no?: string
  booth_name?: string
  age?: number
  gender?: string
  entity_type?: AssignmentCategory
  source_id?: number | null
  relation_label?: string
  assigned_telecaller_name?: string
  assigned_telecaller_phone?: string
}

interface Telecaller {
  id: number
  name: string
  phone?: string
}

interface BoothOption {
  id: number
  number: string
  name: string
}

interface VolunteerRoleOption {
  id: number
  name: string
}

interface SchemeOption {
  id: number
  name: string
}

type AssignmentCategory = 'voter' | 'volunteer' | 'beneficiary'

type WorkflowStatus =
  | 'assigned'
  | 'already_assigned'
  | 'already_contacted'
  | 'pending_followup'
  | 'pending_field_survey'
  | 'reassigned'
  | 'completed'

type StatusFilterValue = WorkflowStatus | 'unassigned' | ''

interface WorkflowInfo {
  status: WorkflowStatus | 'unassigned'
  label: string
  is_locked: boolean
}

/* ─── Constants ──────────────────────────────────────────── */
const genderLabel = (g?: string) => g === 'm' ? 'Male' : g === 'f' ? 'Female' : g === 'o' ? 'Other' : '—'
const normalizePhone = (value?: string) => {
  const digits = String(value || '').replace(/\D+/g, '')
  if (!digits) return ''
  return digits.length > 10 ? digits.slice(-10) : digits
}
const normalizeName = (value?: string) => String(value || '').trim().toLowerCase()
const voterPhones = (voter: Pick<VoterRow, 'phone' | 'phone2' | 'alt_phoneno2' | 'alt_phoneno3'>) =>
  Array.from(new Set([
    normalizePhone(voter.phone),
    normalizePhone(voter.phone2),
    normalizePhone(voter.alt_phoneno2),
    normalizePhone(voter.alt_phoneno3),
  ].filter(Boolean)))

const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  assigned: 'Assigned',
  already_assigned: 'Already Assigned',
  already_contacted: 'Already Contacted',
  pending_followup: 'Pending Follow-up',
  pending_field_survey: 'Pending Field Survey',
  reassigned: 'Reassigned',
  completed: 'Completed',
}

const STATUS_FILTER_OPTIONS: { value: Exclude<StatusFilterValue, ''>; label: string }[] = [
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'already_assigned', label: 'Already Assigned' },
  { value: 'already_contacted', label: 'Already Contacted' },
  { value: 'pending_followup', label: 'Pending Follow-up' },
  { value: 'pending_field_survey', label: 'Pending Field Survey' },
  { value: 'reassigned', label: 'Reassigned' },
  { value: 'completed', label: 'Completed' },
]

async function fetchAllMasterRows<T>(url: string): Promise<T[]> {
  const limit = 500
  const all: T[] = []
  let offset = 0

  while (true) {
    const { data } = await apiClient.get<ApiResponse<T>>(url, {
      params: { limit, offset },
    })
    all.push(...(data.results ?? []))
    if (!data.next || all.length >= (data.count ?? all.length)) break
    offset += limit
  }

  return all
}

/* ─── Booth multi-select ─────────────────────────────────── */
function BoothMultiSelect({
  booths, selected, onChange,
}: {
  booths: BoothOption[]
  selected: Set<number>
  onChange: (next: Set<number>) => void
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const filtered = booths.filter(b =>
    `${b.number} ${b.name}`.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }

  const firstBooth = selected.size === 1 ? booths.find(b => b.id === [...selected][0]) : null
  const label =
    selected.size === 0 ? 'All Booths' :
    firstBooth ? `${firstBooth.number} — ${firstBooth.name}` :
    `${selected.size} booths selected`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`${selectCls} w-[240px] flex items-center justify-between gap-2 text-left`}
      >
        <span className={`truncate ${selected.size === 0 ? 'text-muted' : 'text-heading'}`}>{label}</span>
        <i className={`ph ${open ? 'ph-caret-up' : 'ph-caret-down'} text-[11px] text-muted flex-shrink-0`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-[280px] bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <input autoFocus type="text" placeholder="Search booth…" value={search}
              onChange={e => setSearch(e.target.value)} className={`${inputCls} w-full`} />
          </div>
          <label className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-surface-alt cursor-pointer text-[11px] font-semibold text-muted">
            <input type="checkbox" className="w-4 h-4 rounded border-2 border-border cursor-pointer accent-navy"
              checked={selected.size === booths.length && booths.length > 0}
              onChange={() => {
                if (selected.size === booths.length) onChange(new Set())
                else onChange(new Set(booths.map(b => b.id)))
              }} />
            Select all ({booths.length})
          </label>
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.length === 0
              ? <p className="px-3 py-4 text-[11px] text-muted text-center">No booths found</p>
              : filtered.map(b => (
                <label key={b.id} className="flex items-center gap-2 px-3 py-[7px] hover:bg-surface-alt cursor-pointer text-[12px]">
                  <input type="checkbox" className="w-4 h-4 rounded border-2 border-border cursor-pointer accent-navy flex-shrink-0"
                    checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
                  <span className="text-muted font-mono text-[10px] w-8 flex-shrink-0">{b.number}</span>
                  <span className="truncate text-heading">{b.name}</span>
                </label>
              ))
            }
          </div>
          {selected.size > 0 && (
            <div className="p-2 border-t border-border">
              <button onClick={() => onChange(new Set())}
                className="text-[11px] text-accent hover:underline w-full text-center">
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════════ */
export default function AssignTelecalling() {
  const { showToast } = useToast()

  const [booths,      setBooths]      = useState<BoothOption[]>([])
  const [telecallers, setTelecallers] = useState<Telecaller[]>([])
  const [volunteerRoles, setVolunteerRoles] = useState<VolunteerRoleOption[]>([])
  const [schemes, setSchemes] = useState<SchemeOption[]>([])
  const [assignableVolunteers, setAssignableVolunteers] = useState<Telecaller[]>([])

  const [category, setCategory] = useState<AssignmentCategory>('voter')
  const [filterBooths,     setFilterBooths]     = useState<Set<number>>(new Set())
  const [filterWorkflowStatus, setFilterWorkflowStatus] = useState<StatusFilterValue>('')
  const [filterContactStatus, setFilterContactStatus] = useState('')
  const [filterTelecaller, setFilterTelecaller] = useState('')
  const [filterVolunteerRole, setFilterVolunteerRole] = useState('')
  const [filterSubjectRole, setFilterSubjectRole] = useState('')
  const [filterScheme, setFilterScheme] = useState('')
  const [filterDate,       setFilterDate]       = useState('')
  const [filterSearch,     setFilterSearch]     = useState('')
  const [debouncedSearch,  setDebouncedSearch]  = useState('')

  const [voters,   setVoters]   = useState<VoterRow[]>([])
  const rawVotersRef             = useRef<VoterRow[]>([])
  const [rawCount, setRawCount] = useState(0)
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [loading,  setLoading]  = useState(false)
  const [assigning, setAssigning] = useState(false)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [assignTo, setAssignTo] = useState('')

  /* Workflow status by voter ID (from assignments API). */
  const workflowByVoterRef = useRef<Map<number, WorkflowInfo>>(new Map())
  const [workflowByVoterId, setWorkflowByVoterId] = useState<Map<number, WorkflowInfo>>(new Map())
  const [workflowSummary, setWorkflowSummary] = useState<Partial<Record<WorkflowStatus | 'unassigned', number>>>({})

  const mapVolunteerOptions = (payload: any): Telecaller[] => {
    const rows = Array.isArray(payload) ? payload : (payload?.results ?? [])
    return rows.map((v: any) => ({
      id: v.id,
      name: v.user_name ?? v.name ?? `Vol #${v.id}`,
      phone: v.phone ?? '',
    }))
  }

  /* ── Fetch masters + already-assigned IDs ── */
  useEffect(() => {
    apiClient.get('/masters/booths/', { params: { limit: 500 } })
      .then(r => setBooths(r.data.results ?? []))
      .catch(() => {})

    apiClient.get('/volunteers/volunteers/names/', { params: { role: 'Telecalling', status: 'active' } })
      .then(r => {
        const options = mapVolunteerOptions(r.data)
        setTelecallers(options)
        setAssignableVolunteers(options)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (category !== 'volunteer' || volunteerRoles.length > 0) return
    fetchAllMasterRows<VolunteerRoleOption>('/masters/volunteer-roles/')
      .then(rows => setVolunteerRoles(rows))
      .catch(() => {})
  }, [category, volunteerRoles.length])

  useEffect(() => {
    if (category !== 'beneficiary' || schemes.length > 0) return
    fetchAllMasterRows<SchemeOption>('/masters/schemes/')
      .then(rows => setSchemes(rows))
      .catch(() => {})
  }, [category, schemes.length])

  useEffect(() => {
    const params: Record<string, string> = { status: 'active' }
    if (filterVolunteerRole) params.volunteer_role = filterVolunteerRole
    else params.role = 'Telecalling'

    apiClient.get('/volunteers/volunteers/names/', { params })
      .then(r => {
        const options = mapVolunteerOptions(r.data)
        setAssignableVolunteers(options)
        if (assignTo && !options.some(v => String(v.id) === assignTo)) {
          setAssignTo('')
        }
      })
      .catch(() => {
        setAssignableVolunteers([])
        if (assignTo) setAssignTo('')
      })
  }, [filterVolunteerRole])

  useEffect(() => {
    setSelected(new Set())
    setPage(1)
  }, [category])

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(filterSearch); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [filterSearch])

  /* ── Fetch voters ── */
  useEffect(() => {
    if (category === 'voter' && filterBooths.size === 0) {
      setVoters([])
      rawVotersRef.current = []
      setRawCount(0)
      setTotal(0)
      workflowByVoterRef.current = new Map()
      setWorkflowByVoterId(new Map())
      setWorkflowSummary({})
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setSelected(new Set())

    if (category === 'voter') {
      const params: Record<string, any> = {
        limit:  pageSize,
        offset: (page - 1) * pageSize,
        sort: 'address_asc',
        include_workflow: 1,
        include_summary: 0,
      }
      if (filterBooths.size === 1) params.booth = [...filterBooths][0]
      else if (filterBooths.size > 1) params.booth = [...filterBooths].join(',')
      if (debouncedSearch) params.search = debouncedSearch
      if (filterContactStatus) params.contact_status = filterContactStatus
      if (filterWorkflowStatus) params.workflow_status = filterWorkflowStatus
      if (filterTelecaller) params.telecaller = filterTelecaller

      apiClient.get('/voters/voters/', { params, signal: controller.signal })
        .then(r => {
          const apiCount = r.data.count ?? 0
          const results = r.data.results ?? []
          const all: VoterRow[] = results.map((v: any) => ({
            id: v.id, name: v.name, voter_id: v.voter_id,
            phone: v.phone ?? '', phone2: v.phone2 ?? '',
            alt_phoneno2: v.alt_phoneno2 ?? '', alt_phoneno3: v.alt_phoneno3 ?? '',
            address: v.address ?? '',
            booth: v.booth, booth_no: v.booth_number ?? '', booth_name: v.booth_name ?? v.booth_number ?? '',
            age: v.age, gender: v.gender, entity_type: 'voter', source_id: v.id,
            assigned_telecaller_name: v.assigned_telecaller_name ?? '',
            assigned_telecaller_phone: v.assigned_telecaller_phone ?? '',
          }))
          const nextWorkflowMap = new Map<number, WorkflowInfo>()
          results.forEach((v: any) => {
            const status = (v.workflow_status || 'unassigned') as WorkflowStatus | 'unassigned'
            nextWorkflowMap.set(v.id, {
              status,
              label: v.workflow_label || (status === 'unassigned' ? 'Unassigned' : WORKFLOW_LABELS[status as WorkflowStatus] || 'Assigned'),
              is_locked: !!v.is_locked,
            })
          })
          rawVotersRef.current = all
          workflowByVoterRef.current = nextWorkflowMap
          setWorkflowByVoterId(nextWorkflowMap)
          setWorkflowSummary(r.data.workflow_summary ?? {})
          setRawCount(r.data.raw_count ?? apiCount)
          setVoters(all)
          setTotal(apiCount)
        })
        .catch(err => {
          if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') showToast('Failed to load voters', 'error')
        })
        .finally(() => setLoading(false))
    } else {
      const params: Record<string, any> = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        category,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (filterContactStatus) params.contact_status = filterContactStatus
      if (filterWorkflowStatus) params.workflow_status = filterWorkflowStatus
      if (filterTelecaller) params.telecaller = filterTelecaller
      if (category === 'volunteer' && filterSubjectRole) params.role = filterSubjectRole
      if (category === 'beneficiary' && filterScheme) params.scheme = filterScheme

      apiClient.get('/telecalling/assignments/assignable-people/', { params, signal: controller.signal })
        .then(r => {
          const apiCount = r.data.count ?? 0
          const results = r.data.results ?? []
          const all: VoterRow[] = results.map((row: any) => ({
            id: row.id,
            name: row.name ?? '',
            voter_id: row.voter_id ?? '',
            phone: row.phone ?? '',
            phone2: row.phone2 ?? '',
            alt_phoneno2: row.alt_phoneno2 ?? '',
            alt_phoneno3: row.alt_phoneno3 ?? '',
            address: row.address ?? '',
            booth: row.booth ?? 0,
            booth_no: row.booth_no ?? '',
            booth_name: row.booth_name ?? '',
            age: row.age,
            gender: row.gender,
            entity_type: row.entity_type ?? category,
            source_id: row.source_id ?? row.id,
            relation_label: row.relation_label ?? '',
            assigned_telecaller_name: row.assigned_telecaller_name ?? '',
            assigned_telecaller_phone: row.assigned_telecaller_phone ?? '',
          }))
          const nextWorkflowMap = new Map<number, WorkflowInfo>()
          results.forEach((row: any) => {
            const status = (row.workflow_status || 'unassigned') as WorkflowStatus | 'unassigned'
            nextWorkflowMap.set(row.id, {
              status,
              label: row.workflow_label || (status === 'unassigned' ? 'Unassigned' : WORKFLOW_LABELS[status as WorkflowStatus] || 'Assigned'),
              is_locked: !!row.is_locked,
            })
          })
          rawVotersRef.current = all
          workflowByVoterRef.current = nextWorkflowMap
          setWorkflowByVoterId(nextWorkflowMap)
          setWorkflowSummary(r.data.workflow_summary ?? {})
          setRawCount(r.data.raw_count ?? apiCount)
          setVoters(all)
          setTotal(apiCount)
        })
        .catch(err => {
          if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') showToast(`Failed to load ${category}`, 'error')
        })
        .finally(() => setLoading(false))
    }

    return () => controller.abort()
  }, [category, filterBooths, debouncedSearch, filterContactStatus, filterWorkflowStatus, filterTelecaller, filterSubjectRole, filterScheme, page, pageSize, showToast])
  const visibleVoters = voters
  const selectableVoters = visibleVoters.filter(v => !(workflowByVoterId.get(v.id)?.is_locked ?? false))
  const isAllSelected  = selectableVoters.length > 0 && selectableVoters.every(v => selected.has(v.id))
  const toggleAll      = () => {
    const next = new Set(selected)
    if (isAllSelected) selectableVoters.forEach(v => next.delete(v.id))
    else               selectableVoters.forEach(v => next.add(v.id))
    setSelected(next)
  }
  const toggleOne = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  /* ── Assign ── */
  const handleAssign = async () => {
    if (!assignTo)           { showToast('Select a telecalling person', 'error'); return }
    if (selected.size === 0) { showToast(`Select at least one ${category === 'voter' ? 'voter' : category}`, 'error');   return }

    const telecaller = assignableVolunteers.find(t => String(t.id) === assignTo)
    if (!telecaller) { showToast('Telecaller not found — please re-select', 'error'); return }

    const date        = filterDate || new Date().toISOString().slice(0, 10)
    const groupVoters = visibleVoters.filter(v => {
      if (!selected.has(v.id)) return false
      return !(workflowByVoterRef.current.get(v.id)?.is_locked ?? false)
    })

    const payload = {
      telecaller_id:    telecaller.id,
      telecaller_name:  telecaller.name,
      telecaller_phone: telecaller.phone ?? '',
      assigned_date:    date,
      voters: groupVoters.map(v => ({
        voter:        v.entity_type === 'voter' ? v.id : null,
        voter_name:   v.name,
        voter_id_no:  v.voter_id,
        phone:        v.phone        ?? '',
        phone2:       v.phone2       ?? '',
        alt_phoneno2: v.alt_phoneno2 ?? '',
        alt_phoneno3: v.alt_phoneno3 ?? '',
        address:      v.address      ?? '',
        booth_no:     v.booth_no     ?? '',
        booth_name:   v.booth_name   ?? '',
        age:          v.age          ?? null,
        gender:       v.gender       ?? '',
        entity_type:  v.entity_type  ?? category,
        source_id:    v.source_id    ?? v.id,
        relation_label: v.relation_label ?? '',
      })),
    }

    setAssigning(true)
    try {
      await apiClient.post('/telecalling/assignments/', payload)

      /* Update local status so the UI reflects this assignment immediately */
      const voterIds = groupVoters.map(v => v.id)
      const previousStatuses = new Map<number, WorkflowStatus | 'unassigned'>()
      voterIds.forEach(voterId => {
        previousStatuses.set(voterId, workflowByVoterRef.current.get(voterId)?.status ?? 'unassigned')
      })
      const nextMap = new Map(workflowByVoterRef.current)
      const selectedContactKeys = new Set<string>()
      groupVoters.forEach(voter => {
        const nameKey = normalizeName(voter.name)
        if (!nameKey) return
        voterPhones(voter).forEach(phone => {
          if (phone) selectedContactKeys.add(`${nameKey}::${phone}`)
        })
      })
      const selectedPhonesByBooth = new Map<string, Set<number>>()
      if (category === 'voter') {
        groupVoters.forEach(voter => {
          voterPhones(voter).forEach(phone => {
            const boothsForPhone = selectedPhonesByBooth.get(phone) ?? new Set<number>()
            boothsForPhone.add(voter.booth)
            selectedPhonesByBooth.set(phone, boothsForPhone)
          })
        })
      }
      voterIds.forEach(voterId => {
        const prev = nextMap.get(voterId)
        const nextStatus: WorkflowStatus = prev?.status === 'pending_followup' ? 'reassigned' : 'assigned'
        nextMap.set(voterId, {
          status: nextStatus,
          label: WORKFLOW_LABELS[nextStatus],
          is_locked: true,
        })
      })
      const relatedCrossBoothIds: number[] = []
      if (category === 'voter') {
        rawVotersRef.current.forEach(voter => {
          if (voterIds.includes(voter.id)) return
          const currentWorkflow = nextMap.get(voter.id)
          if ((currentWorkflow?.status ?? 'unassigned') !== 'unassigned') return
          const matchesSelectedPhone = voterPhones(voter).some(phone => {
            const boothIds = selectedPhonesByBooth.get(phone)
            return !!boothIds && !boothIds.has(voter.booth)
          })
          if (!matchesSelectedPhone) return
          relatedCrossBoothIds.push(voter.id)
          nextMap.set(voter.id, {
            status: 'already_assigned',
            label: WORKFLOW_LABELS.already_assigned,
            is_locked: true,
          })
        })
      } else {
        rawVotersRef.current.forEach(voter => {
          if (voterIds.includes(voter.id)) return
          const currentWorkflow = nextMap.get(voter.id)
          if ((currentWorkflow?.status ?? 'unassigned') !== 'unassigned') return
          const nameKey = normalizeName(voter.name)
          if (!nameKey) return
          const matchesSelectedContact = voterPhones(voter).some(phone => selectedContactKeys.has(`${nameKey}::${phone}`))
          if (!matchesSelectedContact) return
          relatedCrossBoothIds.push(voter.id)
          nextMap.set(voter.id, {
            status: 'already_assigned',
            label: WORKFLOW_LABELS.already_assigned,
            is_locked: true,
          })
        })
      }
      workflowByVoterRef.current = nextMap
      setWorkflowByVoterId(nextMap)
      rawVotersRef.current = rawVotersRef.current.map(v =>
        voterIds.includes(v.id) || relatedCrossBoothIds.includes(v.id)
          ? {
              ...v,
              assigned_telecaller_name: telecaller.name,
              assigned_telecaller_phone: telecaller.phone ?? '',
            }
          : v
      )
      setVoters(prev =>
        prev.map(v =>
          voterIds.includes(v.id) || relatedCrossBoothIds.includes(v.id)
            ? {
                ...v,
                assigned_telecaller_name: telecaller.name,
                assigned_telecaller_phone: telecaller.phone ?? '',
              }
            : v
        )
      )
      setWorkflowSummary(prev => {
        const next = { ...prev }
        voterIds.forEach(voterId => {
          const previousStatus = previousStatuses.get(voterId) ?? 'unassigned'
          const nextStatus = nextMap.get(voterId)?.status ?? 'assigned'
          next[previousStatus] = Math.max(0, (next[previousStatus] ?? 0) - 1)
          next[nextStatus] = (next[nextStatus] ?? 0) + 1
        })
        relatedCrossBoothIds.forEach(voterId => {
          const previousStatus = previousStatuses.get(voterId) ?? 'unassigned'
          const nextStatus = nextMap.get(voterId)?.status ?? 'already_assigned'
          next[previousStatus] = Math.max(0, (next[previousStatus] ?? 0) - 1)
          next[nextStatus] = (next[nextStatus] ?? 0) + 1
        })
        return next
      })

      setSelected(new Set())
      showToast(`${groupVoters.length} ${category === 'voter' ? 'voter' : category}(s) assigned to ${telecaller.name}`, 'success')
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ??
        err?.response?.data?.voters?.[0] ??
        'Failed to save assignment — please try again'
      showToast(message, 'error')
    } finally {
      setAssigning(false)
    }
  }

  /* ── Pagination ── */
  const effectiveTotal = total
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize))
  const pageStart  = (page - 1) * pageSize + 1
  const pageEnd    = Math.min(page * pageSize, effectiveTotal)
  const goTo       = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)))

  const pageNumbers: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  })()

  const applyBooths  = (next: Set<number>) => { setFilterBooths(next); setPage(1) }
  const applyWorkflowStatus = (value: StatusFilterValue) => { setFilterWorkflowStatus(value); setPage(1) }
  const applyContactStatus = (value: string) => { setFilterContactStatus(value); setPage(1) }
  const applyTelecaller = (value: string) => { setFilterTelecaller(value); setPage(1) }
  const applyVolunteerRole = (value: string) => {
    setFilterVolunteerRole(value)
    setAssignTo('')
  }
  const applyCategory = (value: AssignmentCategory) => {
    setCategory(value)
    setFilterWorkflowStatus('')
    setFilterContactStatus('')
    setFilterSearch('')
    setDebouncedSearch('')
    setFilterBooths(new Set())
    setFilterSubjectRole('')
    setFilterScheme('')
  }
  const applySubjectRole = (value: string) => { setFilterSubjectRole(value); setPage(1) }
  const applyScheme = (value: string) => { setFilterScheme(value); setPage(1) }
  const applyDate    = (v: string)          => { setFilterDate(v) }
  const applySearch  = (v: string)          => { setFilterSearch(v) }
  useEffect(() => { setPage(1) }, [pageSize])
  const clearAll     = () => {
    setCategory('voter')
    setFilterBooths(new Set())
    setFilterWorkflowStatus('')
    setFilterContactStatus('')
    setFilterDate('')
    setFilterTelecaller('')
    setFilterVolunteerRole('')
    setFilterSubjectRole('')
    setFilterScheme('')
    setFilterSearch('')
    setDebouncedSearch('')
    setAssignTo('')
    setPage(1)
  }
  const hasFilters   = category !== 'voter' || filterBooths.size > 0 || !!filterWorkflowStatus || !!filterContactStatus || !!filterTelecaller || !!filterVolunteerRole || !!filterSubjectRole || !!filterScheme || !!filterSearch
  const assignName   = assignableVolunteers.find(t => String(t.id) === assignTo)?.name ?? ''
  const workflowCounts = workflowSummary
  const categoryLabel = category === 'voter' ? 'Voter' : category === 'volunteer' ? 'Volunteer' : 'Beneficiary'
  const categoryFieldLabel = category === 'voter' ? 'Booth' : category === 'volunteer' ? 'Role' : 'Scheme'

  /* ════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════ */
  return (
    <div className="page-enter space-y-5">

      {/* ══════════════════════════════
          Main voter table card
      ══════════════════════════════ */}
      <div className="bg-surface rounded-card shadow-card overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <i className="ph ph-phone-outgoing text-[18px] text-navy" />
            <div>
              <h2 className="text-[14px] font-bold text-heading">Assign Telecalling</h2>
              <p className="text-[11px] text-muted">
                Select {category === 'voter' ? 'voters' : category === 'volunteer' ? 'volunteers' : 'beneficiaries'} and assign to a telecalling volunteer
                {rawCount > 0 && <span className="ml-1 font-semibold text-navy">· {rawCount.toLocaleString('en-IN')} {category === 'voter' ? 'records' : category === 'volunteer' ? 'volunteers' : 'beneficiaries'}</span>}
                {(workflowCounts.pending_followup ?? 0) > 0 && (
                  <span className="ml-1 text-orange-500 font-medium">· {workflowCounts.pending_followup} pending follow-up</span>
                )}
                {(workflowCounts.reassigned ?? 0) > 0 && (
                  <span className="ml-1 text-blue-500 font-medium">· {workflowCounts.reassigned} reassigned</span>
                )}
                {(workflowCounts.completed ?? 0) > 0 && (
                  <span className="ml-1 text-green-600 font-medium">· {workflowCounts.completed} completed</span>
                )}
              </p>
            </div>
          </div>

          {/* Telecalling person — top right */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted whitespace-nowrap">Telecalling Person</span>
            <select value={filterTelecaller} onChange={e => applyTelecaller(e.target.value)}
              className={`${selectCls} w-[190px]`}>
              <option value="">All Telecallers</option>
              {telecallers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Filter + assign row */}
        <div className="flex flex-wrap items-end gap-3 px-5 py-3 bg-surface-alt border-b border-border">

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Category</label>
            <select value={category} onChange={e => applyCategory(e.target.value as AssignmentCategory)}
              className={`${selectCls} w-[160px]`}>
              <option value="voter">Voter</option>
              <option value="volunteer">Volunteer</option>
              <option value="beneficiary">Beneficiary</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Search</label>
            <div className="relative">
              <i className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted pointer-events-none" />
              <input
                type="text"
                placeholder={`Name, ${category === 'voter' ? 'Voter ID' : 'ID'} or Phone…`}
                value={filterSearch}
                onChange={e => applySearch(e.target.value)}
                className={`${inputCls} pl-7 w-[190px]`}
              />
              {filterSearch && (
                <button onClick={() => applySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                  <i className="ph ph-x text-[11px]" />
                </button>
              )}
            </div>
          </div>

          {category === 'voter' ? (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Booth</label>
              <BoothMultiSelect booths={booths} selected={filterBooths} onChange={applyBooths} />
            </div>
          ) : category === 'volunteer' ? (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Role</label>
              <select value={filterSubjectRole} onChange={e => applySubjectRole(e.target.value)}
                className={`${selectCls} w-[190px]`}>
                <option value="">All Roles</option>
                {volunteerRoles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Scheme</label>
              <select value={filterScheme} onChange={e => applyScheme(e.target.value)}
                className={`${selectCls} w-[210px]`}>
                <option value="">All Schemes</option>
                {schemes.map(scheme => (
                  <option key={scheme.id} value={scheme.name}>{scheme.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Status</label>
            <select
              value={filterWorkflowStatus}
              onChange={e => applyWorkflowStatus(e.target.value as StatusFilterValue)}
              className={`${selectCls} w-[180px]`}
            >
              <option value="">All</option>
              {STATUS_FILTER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Contact Filter</label>
            <select
              value={filterContactStatus}
              onChange={e => applyContactStatus(e.target.value)}
              className={`${selectCls} w-[160px]`}
            >
              <option value="">All</option>
              <option value="with">With Contact</option>
              <option value="without">Without Contact</option>
            </select>
          </div>

          <div className="w-px self-stretch bg-border mx-1" />

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Assignment Date</label>
            <input type="date" value={filterDate} onChange={e => applyDate(e.target.value)}
              className={`${inputCls} w-[155px]`} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Volunteer Role</label>
            <select
              value={filterVolunteerRole}
              onChange={e => applyVolunteerRole(e.target.value)}
              className={`${selectCls} w-[180px]`}
            >
              <option value="">All Telecallers</option>
              {volunteerRoles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Assign To
              {selected.size > 0 && <span className="ml-1 normal-case text-navy font-semibold">({selected.size} selected)</span>}
            </label>
            <div className="flex items-stretch rounded-lg overflow-hidden border border-border shadow-sm">
              <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                className="text-[12px] px-3 py-[7px] bg-surface text-heading outline-none min-w-[180px] cursor-pointer">
                <option value="">{filterVolunteerRole ? 'Select Volunteer…' : 'Select Telecaller…'}</option>
                {assignableVolunteers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.phone ? ` · ${t.phone}` : ''}</option>
                ))}
              </select>
              <button onClick={handleAssign} disabled={selected.size === 0 || !assignTo || assigning}
                className="px-4 py-[7px] bg-navy text-white text-[12px] font-semibold border-l border-white/20
                           disabled:opacity-40 hover:bg-navy/90 transition-colors whitespace-nowrap">
                {assigning
                  ? <><i className="ph ph-spinner-gap animate-spin mr-1" />Saving…</>
                  : <><i className="ph ph-check mr-1" />Assign</>}
              </button>
            </div>
          </div>

          {hasFilters && (
            <button onClick={clearAll}
              className="self-end flex items-center gap-1.5 px-3 py-[7px] rounded-lg
                         border border-rose-200 bg-rose-50 text-rose-500 text-[11px] font-medium
                         hover:bg-rose-100 transition-colors">
              <i className="ph ph-x text-[12px]" />
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-surface-alt border-b border-border text-left">
                <th className="w-10 px-4 py-[10px]">
                  <input type="checkbox" className="w-4 h-4 rounded border-2 border-border cursor-pointer accent-navy"
                    disabled={selectableVoters.length === 0}
                    checked={isAllSelected} onChange={toggleAll} />
                </th>
                {['#', `${categoryLabel} Name`, category === 'voter' ? 'Voter ID' : 'ID', 'Phone Numbers', 'Age / Gender', categoryFieldLabel, 'Assigned To', 'Address'].map(h => (
                  <th key={h} className="px-3 py-[10px] text-[10px] font-bold uppercase tracking-wide text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted">
                  <i className="ph ph-spinner-gap animate-spin mr-2" />Loading {category === 'voter' ? 'voters' : category === 'volunteer' ? 'volunteers' : 'beneficiaries'}…
                </td></tr>
              ) : visibleVoters.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center">
                  <i className="ph ph-users-three text-[32px] text-border block mb-2" />
                  <p className="text-[12px] text-muted">
                    {category === 'voter' && filterBooths.size === 0
                      ? 'Select a booth to view voters.'
                      : rawCount === 0
                        ? `No ${category === 'voter' ? 'voters' : category === 'volunteer' ? 'volunteers' : 'beneficiaries'} found for the selected filters.`
                        : `All ${category === 'voter' ? 'voters' : category === 'volunteer' ? 'volunteers' : 'beneficiaries'} have been assigned.`}
                  </p>
                </td></tr>
              ) : (
                visibleVoters.map((v, idx) => {
                  const workflow = workflowByVoterId.get(v.id)
                  const isLocked = workflow?.is_locked ?? false
                  const phones = [v.phone, v.phone2, v.alt_phoneno2, v.alt_phoneno3].filter(Boolean)
                  const statusClasses =
                    workflow?.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : workflow?.status === 'already_contacted'
                        ? 'bg-emerald-100 text-emerald-700'
                        : workflow?.status === 'already_assigned'
                          ? 'bg-violet-100 text-violet-700'
                      : workflow?.status === 'pending_followup'
                        ? 'bg-orange-100 text-orange-700'
                        : workflow?.status === 'reassigned'
                          ? 'bg-blue-100 text-blue-700'
                          : workflow?.status === 'pending_field_survey'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-600'
                  return (
                    <tr key={v.id}
                      onClick={() => { if (!isLocked) toggleOne(v.id) }}
                      className={`border-b border-border transition-colors
                        ${isLocked           ? 'bg-surface-alt opacity-65 cursor-not-allowed'
                        : selected.has(v.id) ? 'bg-blue-50 cursor-pointer'
                        :                      'hover:bg-surface-alt cursor-pointer'}`}>
                      <td className="px-4 py-[9px]" onClick={e => e.stopPropagation()}>
                        <input type="checkbox"
                          disabled={isLocked}
                          className="w-4 h-4 rounded border-2 border-border cursor-pointer accent-navy disabled:opacity-40"
                          checked={selected.has(v.id)} onChange={() => { if (!isLocked) toggleOne(v.id) }} />
                      </td>
                      <td className="px-3 py-[9px] text-muted text-[11px]">{pageStart + idx}</td>
                      <td className="px-3 py-[9px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-heading">{v.name}</span>
                          {workflow && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${statusClasses}`}>
                              {workflow.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-[9px] text-muted font-mono text-[11px]">{v.voter_id || '—'}</td>
                      <td className="px-3 py-[9px]">
                        {phones.length === 0 ? <span className="text-muted">—</span> : (
                          <div className="flex flex-col gap-[2px]">
                            {phones.map((p, i) => (
                              <span key={i} className="text-[11px] font-mono text-heading">{p}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-[9px] text-muted">{v.age ?? '—'} / {genderLabel(v.gender)}</td>
                      <td className="px-3 py-[9px]">
                        {category === 'voter' && v.booth_name
                          ? <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-medium">{v.booth_name}</span>
                          : category !== 'voter' && v.relation_label
                            ? <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-medium">{v.relation_label}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-[9px]">
                        {v.assigned_telecaller_name ? (
                          <div className="flex flex-col gap-[2px]">
                            <span className="font-semibold text-heading">{v.assigned_telecaller_name}</span>
                            {v.assigned_telecaller_phone && (
                              <span className="text-[10px] font-mono text-muted">{v.assigned_telecaller_phone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-[9px] text-muted truncate max-w-[180px]">{v.address || '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && effectiveTotal > 0 && (
          <div className="flex items-center justify-between px-5 py-2 border-t border-border bg-surface-alt text-[11px] text-muted flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-medium">{pageStart}–{pageEnd} <span className="font-normal">of {effectiveTotal.toLocaleString('en-IN')} {category === 'voter' ? 'records' : category === 'volunteer' ? 'volunteers' : 'beneficiaries'}</span></span>
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
            {effectiveTotal > pageSize && (
              <div className="flex items-center gap-1">
                {[{ label: '«', go: 1 }, { label: '‹', go: page - 1 }].map(({ label, go }) => (
                  <button key={label} onClick={() => goTo(go)} disabled={page === 1}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-border disabled:opacity-30">{label}</button>
                ))}
                {pageNumbers.map((p, i) =>
                  p === '...'
                    ? <span key={`e${i}`} className="w-7 text-center">…</span>
                    : <button key={p} onClick={() => goTo(p as number)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-[11px] font-semibold
                          ${page === p ? 'bg-navy text-white' : 'hover:bg-border'}`}>{p}</button>
                )}
                {[{ label: '›', go: page + 1 }, { label: '»', go: totalPages }].map(({ label, go }) => (
                  <button key={label} onClick={() => goTo(go)} disabled={page === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-border disabled:opacity-30">{label}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating confirm bar */}
      {selected.size > 0 && assignName && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-navy text-white
                        px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10">
          <i className="ph ph-users text-saffron text-[15px]" />
          <span className="text-[12px]">
            <strong className="text-saffron">{selected.size}</strong> {category === 'voter' ? 'voter' : category}(s) → <strong>{assignName}</strong>
          </span>
          <button onClick={handleAssign} disabled={assigning}
            className="bg-saffron text-navy px-4 py-1.5 rounded-lg text-[12px] font-bold
                       hover:bg-saffron/90 transition-colors disabled:opacity-50">
            {assigning ? <i className="ph ph-spinner-gap animate-spin" /> : <><i className="ph ph-check mr-1" />Confirm</>}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-white/50 hover:text-white">
            <i className="ph ph-x text-[14px]" />
          </button>
        </div>
      )}
    </div>
  )
}
