import React, { useCallback, useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import Badge from '../components/ui/Badge'
import { useAnalyticsAPI } from '../hooks/useAnalyticsAPI'
import type { WardStat, BoothStat, VolunteerInfo, VoterBasicInfo } from '../hooks/useAnalyticsAPI'
import { useToast } from '../context/ToastContext'
import SummaryCards from '../modules/dashboard/components/SummaryCards'
import { getBoothRanking, getSummary, type BoothRankingRow, type DashboardKpis } from '../modules/dashboard/services/dashboardApi'

const PAGE_SIZE = 10

const EMPTY_ACTIVITY_KPIS: DashboardKpis = {
  total_voters: 0,
  surveyed_voters: 0,
  total_surveyed: 0,
  assigned_voters: 0,
  coverage_pct: 0,
  positive_pct: 0,
  positive_percent: 0,
  negative_risk_pct: 0,
  not_reachable_pct: 0,
  followup_pct: 0,
  followup_not_required_pct: 0,
  telecaller_count: 0,
}

function mapDashboardBoothToReportBooth(row: BoothRankingRow): BoothStat {
  const surveyed = row.surveyed_voters || 0
  const neutralPct = surveyed > 0 ? Math.round(((row.neutral || 0) * 1000) / surveyed) / 10 : 0

  return {
    id: row.id,
    name: row.booth_name || '',
    number: row.booth_number || '',
    address: '',
    constituency_name: null,
    panchayat_name: row.panchayat || '',
    union_name: row.union || '',
    block_name: row.block || '',
    total_voters: row.total_voters || 0,
    voters_contacted: surveyed,
    coverage_percentage: row.coverage_pct || 0,
    volunteer_count: 0,
    positive_pct: row.positive_pct || 0,
    neutral_pct: neutralPct,
    negative_pct: row.negative_pct || 0,
    survey_count: surveyed,
    survey_positive: row.positive || 0,
    survey_neutral: row.neutral || 0,
    survey_negative: row.negative || 0,
    survey_coverage_pct: row.coverage_pct || 0,
  }
}

/* ── helpers ─────────────────────────────────────────────────────── */
function pctColor(pct: number) {
  if (pct >= 70) return 'text-kampgreen font-bold'
  if (pct >= 40) return 'text-saffron-dark font-bold'
  return 'text-kampr font-bold'
}

function PctBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? '#138808' : pct >= 40 ? '#FF9933' : '#dc2626'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#e5e7eb] rounded h-[6px] overflow-hidden min-w-[60px]">
        <div className="h-full rounded transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className={`text-[10px] w-[34px] text-right ${pctColor(pct)}`}>{pct}%</span>
    </div>
  )
}

function downloadCsv(csv: string, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

/* ── sort icon ───────────────────────────────────────────────────── */
function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <i className="ph ph-arrows-down-up ml-[3px] text-[9px] opacity-40" />
  return dir === 'asc'
    ? <i className="ph ph-arrow-up ml-[3px] text-[9px] text-saffron" />
    : <i className="ph ph-arrow-down ml-[3px] text-[9px] text-saffron" />
}

/* ── sortable th ─────────────────────────────────────────────────── */
function Th({
  label, colKey, sortKey, sortDir, onSort, className = '',
}: {
  label: string
  colKey: string
  sortKey: string | null
  sortDir: 'asc' | 'desc'
  onSort: (k: string) => void
  className?: string
}) {
  return (
    <th
      className={`cursor-pointer select-none whitespace-nowrap ${className}`}
      onClick={() => onSort(colKey)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon active={sortKey === colKey} dir={sortDir} />
      </span>
    </th>
  )
}

/* ── shared pagination bar ───────────────────────────────────────── */
function Pagination({
  page, total, onChange,
}: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (pages <= 1) return null
  const from = (page - 1) * PAGE_SIZE + 1
  const to   = Math.min(page * PAGE_SIZE, total)

  const pageNums = Array.from({ length: pages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1)
    .reduce<(number | '…')[]>((acc, p, i, arr) => {
      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])

  const btn = (label: React.ReactNode, target: number, disabled: boolean) => (
    <button
      onClick={() => onChange(target)}
      disabled={disabled}
      className="px-2 py-[3px] text-[10px] font-bold rounded border border-border text-muted
                 disabled:opacity-30 hover:border-saffron hover:text-navy transition-all"
    >
      {label}
    </button>
  )

  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
      <span className="text-muted text-[10px]">{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        {btn(<i className="ph ph-caret-double-left" />, 1,     page === 1)}
        {btn(<i className="ph ph-caret-left" />,        page - 1, page === 1)}
        {pageNums.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-[10px] text-muted">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`px-2 py-[3px] text-[10px] font-bold rounded border transition-all ${
                page === p
                  ? 'bg-navy border-navy text-white'
                  : 'border-border text-muted hover:border-saffron hover:text-navy'
              }`}
            >
              {p}
            </button>
          )
        )}
        {btn(<i className="ph ph-caret-right" />,        page + 1, page === pages)}
        {btn(<i className="ph ph-caret-double-right" />, pages,    page === pages)}
      </div>
    </div>
  )
}

/* ── Volunteer popup ─────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  active: 'Active', inactive: 'Inactive', on_leave: 'On Leave',
}
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-kampgreen-light text-kampgreen-dark',
  inactive: 'bg-kampr-light text-kampr',
  on_leave: 'bg-saffron-light text-saffron-dark',
}

function VolunteerPopup({
  title,
  volunteers,
  loading,
  onClose,
}: {
  title: string
  volunteers: VolunteerInfo[]
  loading: boolean
  onClose: () => void
}) {
  // Group volunteers by role
  const grouped = useMemo(() => {
    const g: Record<string, VolunteerInfo[]> = {}
    for (const v of volunteers) {
      const key = v.role || 'General Volunteer'
      if (!g[key]) g[key] = []
      g[key].push(v)
    }
    return g
  }, [volunteers])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,29,69,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-card shadow-2xl w-full max-w-[480px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-navy px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-white text-[12px] font-bold tracking-[0.6px]">
              <i className="ph ph-users-three mr-2 text-saffron" />
              Volunteers — {title}
            </div>
            <div className="text-white/50 text-[9px] mt-[2px]">
              {loading ? 'Loading…' : `${volunteers.length} volunteer${volunteers.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <i className="ph ph-x text-[14px]" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {loading ? (
            <p className="text-muted text-[11px] text-center py-8 italic">Loading volunteers…</p>
          ) : volunteers.length === 0 ? (
            <p className="text-muted text-[11px] text-center py-8 italic">No volunteers assigned to this booth/ward.</p>
          ) : (
            Object.entries(grouped).map(([role, list]) => (
              <div key={role} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold tracking-[0.8px] uppercase text-muted">{role}</span>
                  <span className="bg-navy/10 text-navy text-[9px] font-bold px-[6px] py-[1px] rounded-full">
                    {list.length}
                  </span>
                </div>
                <div className="flex flex-col gap-[6px]">
                  {list.map(v => (
                    <div key={v.id} className="flex items-start gap-3 bg-[#f7f9fc] rounded-lg px-3 py-[8px] border border-border">
                      <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 mt-[1px]">
                        <i className="ph ph-user text-navy text-[13px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-textMain truncate">
                          {v.name || 'Unnamed Volunteer'}
                        </div>
                        <div className="flex flex-col gap-[2px] mt-[3px]">
                          <div className="flex flex-wrap gap-x-3 gap-y-[2px]">
                            {v.phone && (
                              <span className="text-[9.5px] text-muted flex items-center gap-1">
                                <i className="ph ph-phone text-[9px]" />
                                <span className="text-[8.5px] font-semibold text-navy/50 uppercase tracking-wide">Ph:</span>
                                {v.phone}
                              </span>
                            )}
                            {v.phone2 && (
                              <span className="text-[9.5px] text-muted flex items-center gap-1">
                                <i className="ph ph-phone text-[9px]" />
                                <span className="text-[8.5px] font-semibold text-navy/50 uppercase tracking-wide">Alt:</span>
                                {v.phone2}
                              </span>
                            )}
                          </div>
                          {v.skills && (
                            <span className="text-[9.5px] text-muted flex items-center gap-1">
                              <i className="ph ph-briefcase text-[9px]" />
                              <span className="text-[8.5px] font-semibold text-navy/50 uppercase tracking-wide">Designation:</span>
                              {v.skills}
                            </span>
                          )}
                        </div>
                      </div>
                      {v.status && (
                        <span className={`text-[8px] font-bold px-[6px] py-[2px] rounded-full flex-shrink-0 mt-[1px] ${STATUS_COLOR[v.status] ?? 'bg-border text-muted'}`}>
                          {STATUS_LABEL[v.status] ?? v.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Voter popup ─────────────────────────────────────────────────── */
const GENDER_LABEL: Record<string, string> = { m: 'Male', f: 'Female', o: 'Other' }
const SENTIMENT_COLOR: Record<string, string> = {
  positive:  'bg-kampgreen-light text-kampgreen-dark',
  negative:  'bg-kampr-light text-kampr',
  neutral:   'bg-saffron-light text-saffron-dark',
  undecided: 'bg-border text-muted',
}
const POPUP_PAGE = 20

/* ── Mini sentiment bar (contacted voters) ──────────────────────── */
function SentimentBar({
  pos,
  neu,
  neg,
  posCount = 0,
  neuCount = 0,
  negCount = 0,
}: {
  pos: number
  neu: number
  neg: number
  posCount?: number
  neuCount?: number
  negCount?: number
}) {
  if (posCount === 0 && neuCount === 0 && negCount === 0) return <span className="text-muted text-[10px]">—</span>
  return (
    <div className="flex flex-col gap-[3px] min-w-[118px]">
      <div className="flex flex-wrap gap-[6px] text-[8.5px] font-bold">
        <span className="text-kampgreen">P {posCount}</span>
        <span className="text-saffron-dark">Neu {neuCount}</span>
        <span className="text-kampr">Neg {negCount}</span>
      </div>
      <div className="flex h-[5px] rounded overflow-hidden gap-[1px]">
        {pos > 0 && <div style={{ flex: pos }} className="bg-kampgreen rounded-l" />}
        {neu > 0 && <div style={{ flex: neu }} className="bg-saffron" />}
        {neg > 0 && <div style={{ flex: neg }} className="bg-kampr rounded-r" />}
      </div>
      <div className="flex gap-[5px] text-[9px]">
        {pos > 0 && <span className="text-kampgreen font-semibold">{pos}%</span>}
        {neu > 0 && <span className="text-saffron-dark font-semibold">{neu}%</span>}
        {neg > 0 && <span className="text-kampr font-semibold">{neg}%</span>}
      </div>
    </div>
  )
}

function VoterPopup({
  title,
  voters,
  loading,
  onClose,
  contactedOnly = false,
}: {
  title: string
  voters: VoterBasicInfo[]
  loading: boolean
  onClose: () => void
  contactedOnly?: boolean
}) {
  const [search,       setSearch]       = useState('')
  const [activeWard,   setActiveWard]   = useState<string | null>(null)
  const [activeType,   setActiveType]   = useState<'all' | 'volunteer' | 'beneficiary' | 'both' | 'unassigned'>('all')
  const [activeVolunteerType, setActiveVolunteerType] = useState<string>('all')

  const matchType = useCallback(
    (v: VoterBasicInfo, t: 'all' | 'volunteer' | 'beneficiary' | 'both' | 'unassigned') => {
      const isVol = !!v.is_volunteer_type
      const isBen = !!v.is_beneficiary_type
      if (t === 'all') return true
      if (t === 'volunteer') return isVol && !isBen
      if (t === 'beneficiary') return isBen && !isVol
      if (t === 'both') return isVol && isBen
      return !isVol && !isBen
    },
    []
  )

  // When contactedOnly mode: restrict the base list to is_contacted voters only
  const baseVoters = useMemo(
    () => contactedOnly ? voters.filter(v => v.is_contacted) : voters,
    [voters, contactedOnly]
  )

  const typeCounts = useMemo(() => ({
    volunteer: baseVoters.filter(v => matchType(v, 'volunteer')).length,
    beneficiary: baseVoters.filter(v => matchType(v, 'beneficiary')).length,
    both: baseVoters.filter(v => matchType(v, 'both')).length,
    unassigned: baseVoters.filter(v => matchType(v, 'unassigned')).length,
  }), [baseVoters, matchType])

  const [ageGroupFilter, setAgeGroupFilter] = useState('')

  const typedVoters = useMemo(
    () => baseVoters.filter(v => matchType(v, activeType)),
    [baseVoters, activeType, matchType]
  )

  const volunteerTypeCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of typedVoters) {
      if (!v.is_volunteer_type) continue
      const vt = (v.volunteer_type || '').trim() || 'Unspecified'
      map.set(vt, (map.get(vt) || 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [typedVoters])
  const volunteerTypeTabs = useMemo(() => volunteerTypeCounts.slice(0, 2), [volunteerTypeCounts])

  const volunteerTypedVoters = useMemo(() => {
    if (!(activeType === 'volunteer' || activeType === 'both')) return typedVoters
    if (activeVolunteerType === 'all') return typedVoters
    return typedVoters.filter(v => ((v.volunteer_type || '').trim() || 'Unspecified') === activeVolunteerType)
  }, [typedVoters, activeType, activeVolunteerType])

  // Build ward list preserving order of first appearance
  const wards = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const v of volunteerTypedVoters) {
      const w = v.ward_name || 'Unassigned'
      if (!seen.has(w)) { seen.add(w); list.push(w) }
    }
    return list.sort((a, b) => a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b))
  }, [volunteerTypedVoters])

  // Set first ward as default once data loads
  useEffect(() => {
    if (!loading && wards.length > 0 && activeWard === null) setActiveWard(wards[0])
  }, [loading, wards, activeWard])

  useEffect(() => {
    setActiveWard(null)
    setSearch('')
  }, [activeType, activeVolunteerType])

  const wardVoters = useMemo(() =>
    volunteerTypedVoters.filter(v => (v.ward_name || 'Unassigned') === activeWard),
    [volunteerTypedVoters, activeWard]
  )

  const ageFilteredVoters = useMemo(() => {
    if (!ageGroupFilter) return wardVoters
    return wardVoters.filter(v => {
      const a = v.age
      if (a == null) return false
      if (ageGroupFilter === 'Below 18') return a < 18
      if (ageGroupFilter === '18-25')    return a >= 18 && a <= 25
      if (ageGroupFilter === '26-35')    return a >= 26 && a <= 35
      if (ageGroupFilter === '36-45')    return a >= 36 && a <= 45
      if (ageGroupFilter === '46-60')    return a >= 46 && a <= 60
      if (ageGroupFilter === '60+')      return a > 60
      return true
    })
  }, [wardVoters, ageGroupFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ageFilteredVoters
    return ageFilteredVoters.filter(v =>
      (v.name || '').toLowerCase().includes(q) ||
      (v.voter_type || '').toLowerCase().includes(q) ||
      (v.voter_id || '').toLowerCase().includes(q) ||
      (v.phone || '').includes(q)
    )
  }, [ageFilteredVoters, search])

  const handleSearch = (v: string) => setSearch(v)
  const handleWardChange = (w: string) => { setActiveWard(w); setSearch('') }
  const handleTypeChange = (t: 'all' | 'volunteer' | 'beneficiary' | 'both' | 'unassigned') => {
    setActiveType(t)
    setActiveVolunteerType('all')
  }

  const wardCount = (w: string) => volunteerTypedVoters.filter(v => (v.ward_name || 'Unassigned') === w).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,29,69,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-card shadow-2xl w-full max-w-[680px] max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-navy px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-white text-[12px] font-bold tracking-[0.6px] flex items-center gap-2">
              <i className="ph ph-users mr-1 text-saffron" />
              {contactedOnly ? 'Contacted Voters' : 'Voters'} — {title}
              {contactedOnly && (
                <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-kampgreen/30 text-kampgreen border border-kampgreen/40">
                  Contacted only
                </span>
              )}
            </div>
            <div className="text-white/50 text-[9px] mt-[2px]">
              {loading ? 'Loading…' : `${baseVoters.length} voter${baseVoters.length !== 1 ? 's' : ''} across ${wards.length} ward${wards.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <i className="ph ph-x text-[14px]" />
          </button>
        </div>

        {/* Type tabs */}
        {!loading && baseVoters.length > 0 && (
          <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0 flex-wrap border-b border-border bg-[#f7f9fc]">
            {([
              { key: 'all', label: 'All', count: baseVoters.length },
              { key: 'volunteer', label: 'Volunteer', count: typeCounts.volunteer },
              { key: 'beneficiary', label: 'Beneficiary', count: typeCounts.beneficiary },
              { key: 'both', label: 'Both', count: typeCounts.both },
              { key: 'unassigned', label: 'Unassigned', count: typeCounts.unassigned },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => handleTypeChange(t.key)}
                className={`
                  px-3 py-[5px] text-[10px] font-bold rounded-t-md border-b-2 transition-all whitespace-nowrap
                  ${activeType === t.key
                    ? 'border-saffron text-navy bg-white'
                    : 'border-transparent text-muted hover:text-navy hover:border-border'
                  }
                `}
              >
                {t.label}
                <span className={`ml-1 text-[9px] px-[5px] py-[1px] rounded-full font-bold
                  ${activeType === t.key ? 'bg-saffron/20 text-saffron-dark' : 'bg-border/60 text-muted'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Volunteer type tabs */}
        {!loading && (activeType === 'volunteer' || activeType === 'both') && volunteerTypeTabs.length > 0 && (
          <div className="flex gap-1 px-4 pt-2 pb-0 flex-shrink-0 flex-wrap border-b border-border bg-[#f7f9fc]">
            {volunteerTypeTabs.map(([vt, cnt]) => (
              <button
                key={vt}
                onClick={() => setActiveVolunteerType(prev => (prev === vt ? 'all' : vt))}
                className={`
                  px-3 py-[5px] text-[10px] font-bold rounded-t-md border-b-2 transition-all whitespace-nowrap
                  ${activeVolunteerType === vt
                    ? 'border-[#0e6aad] text-[#0e6aad] bg-white'
                    : 'border-transparent text-muted hover:text-[#0e6aad] hover:border-border'
                  }
                `}
              >
                {vt}
                <span className={`ml-1 text-[9px] px-[5px] py-[1px] rounded-full font-bold
                  ${activeVolunteerType === vt ? 'bg-[#e8f4fd] text-[#0e6aad]' : 'bg-border/60 text-muted'}`}>
                  {cnt}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Ward tabs */}
        {!loading && wards.length > 1 && (
          <div className="flex gap-1 px-4 pt-2 pb-0 flex-shrink-0 flex-wrap border-b border-border bg-[#f7f9fc]">
            {wards.map(w => (
              <button
                key={w}
                onClick={() => handleWardChange(w)}
                className={`
                  px-3 py-[5px] text-[10px] font-bold rounded-t-md border-b-2 transition-all whitespace-nowrap
                  ${activeWard === w
                    ? 'border-saffron text-navy bg-white'
                    : 'border-transparent text-muted hover:text-navy hover:border-border'
                  }
                `}
              >
                {w}
                <span className={`ml-1 text-[9px] px-[5px] py-[1px] rounded-full font-bold
                  ${activeWard === w ? 'bg-saffron/20 text-saffron-dark' : 'bg-border/60 text-muted'}`}>
                  {wardCount(w)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Search + Age Group filter */}
        {!loading && baseVoters.length > 0 && (
          <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b border-border flex items-center gap-2">
            <div className="relative flex-1">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[12px] pointer-events-none" />
              <input
                type="text" value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name, voter type, voter ID or phone…"
                className="form-input pl-8 py-[5px] text-[11px] w-full"
              />
              {search && (
                <button onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[11px] hover:text-kampr">
                  <i className="ph ph-x" />
                </button>
              )}
            </div>
            <select
              value={ageGroupFilter}
              onChange={e => setAgeGroupFilter(e.target.value)}
              className={`form-input text-[11px] py-[5px] pr-7 min-w-[110px] flex-shrink-0 ${ageGroupFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Ages</option>
              <option value="Below 18">Below 18</option>
              <option value="18-25">18–25</option>
              <option value="26-35">26–35</option>
              <option value="36-45">36–45</option>
              <option value="46-60">46–60</option>
              <option value="60+">60+</option>
            </select>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-muted text-[11px] text-center py-10 italic">Loading voters…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted text-[11px] text-center py-10 italic">
              {search ? 'No voters match your search.' : 'No voters in this selection.'}
            </p>
          ) : (
            <table className="data-table w-full text-[11px]">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  <th>Voter ID</th>
                  <th>Name</th>
                  <th>Voter Type</th>
                  <th className="text-center">Age</th>
                  <th className="text-center">Gender</th>
                  <th>Sentiment</th>
                  <th className="text-center">Contacted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="font-mono text-[10px] text-muted">{v.voter_id || '—'}</td>
                    <td className="font-semibold text-textMain">{v.name || '—'}</td>
                    <td className="text-muted">
                      {v.is_volunteer_type && v.is_beneficiary_type
                        ? 'Volunteer + Beneficiary'
                        : v.voter_type || '—'}
                    </td>
                    <td className="text-center">{v.age ?? '—'}</td>
                    <td className="text-center text-muted">{GENDER_LABEL[v.gender || ''] || v.gender || '—'}</td>
                    <td>
                      {v.sentiment ? (
                        <span className={`text-[8px] font-bold px-[5px] py-[2px] rounded-full capitalize ${SENTIMENT_COLOR[v.sentiment] ?? 'bg-border text-muted'}`}>
                          {v.sentiment}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="text-center">
                      {v.is_contacted
                        ? <i className="ph ph-check-circle text-kampgreen text-[13px]" />
                        : <i className="ph ph-x-circle text-muted text-[13px]" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer summary */}
        {!loading && activeWard && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border flex-shrink-0 bg-[#f7f9fc] text-[10px] text-muted">
            <span>
              Showing <strong className="text-navy">{filtered.length}</strong> voter{filtered.length !== 1 ? 's' : ''}
              {search ? ' matching search' : ` in ${activeWard}`}
            </span>
            <span>
              Contacted: <strong className="text-kampgreen">{filtered.filter(v => v.is_contacted).length}</strong>
              {' / '}
              <strong>{filtered.length}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── main component ──────────────────────────────────────────────── */
export default function ReportsPage() {
  const api = useAnalyticsAPI()
  const { showToast } = useToast()

  const [villageData, setVillages]   = useState<WardStat[]>([])
  const [boothData,   setBooths]     = useState<BoothStat[]>([])
  const [surveyCount, setSurveyCount] = useState<number | null>(null)
  const [search,      setSearch]     = useState('')
  const [boothSearch, setBoothSearch] = useState('')
  const [loading,     setLoad]       = useState(true)
  const [boothLoading, setBoothLoad] = useState(true)
  const [fixing,      setFixing]     = useState(false)

  const [panchayatFilter, setPanchayatFilter] = useState('')
  const [unionFilter,     setUnionFilter]     = useState('')
  const [blockFilter,     setBlockFilter]     = useState('')
  const [boothFilter,     setBoothFilter]     = useState('')
  const [activityKpis, setActivityKpis] = useState<DashboardKpis>(EMPTY_ACTIVITY_KPIS)
  const [showActivityHighlights, setShowActivityHighlights] = useState(false)

  const clearReportFilters = useCallback(() => {
    setBlockFilter('')
    setUnionFilter('')
    setPanchayatFilter('')
    setBoothFilter('')
    setBoothSearch('')
  }, [])

  const reload = () => {
    setLoad(true)
    setBoothLoad(true)
    api.fetchWardStats()
      .then(w => setVillages(w))
      .finally(() => setLoad(false))
    api.fetchBoothStats()
      .then(async b => {
        if (Array.isArray(b) && b.length > 0) {
          setBooths(b)
          return
        }

        try {
          const fallback = await getBoothRanking({ limit: 500 })
          setBooths((fallback?.rows ?? []).map(mapDashboardBoothToReportBooth))
        } catch {
          setBooths([])
        }
      })
      .finally(() => setBoothLoad(false))
    api.fetchDashboardStats()
      .then(s => { if (s) setSurveyCount(s.surveys_conducted ?? null) })
  }

  useEffect(() => { reload() }, [])

  useEffect(() => {
    let ignore = false

    getSummary({
      block: blockFilter,
      union: unionFilter,
      panchayat: panchayatFilter,
      booth: boothFilter,
    })
      .then(summary => {
        if (ignore) return
        setActivityKpis(summary?.kpis || EMPTY_ACTIVITY_KPIS)
        setShowActivityHighlights(true)
      })
      .catch(() => {
        if (ignore) return
        setActivityKpis(EMPTY_ACTIVITY_KPIS)
        setShowActivityHighlights(false)
      })

    return () => { ignore = true }
  }, [blockFilter, unionFilter, panchayatFilter, boothFilter])

  const handleFixLinks = async () => {
    setFixing(true)
    const result = await api.fixDataLinks()
    setFixing(false)
    if (result) {
      showToast(
        `<i class="ph ph-link"></i> Fixed ${result.fixed_booths} booths · ${result.fixed_voters} voters`,
        '#138808'
      )
      reload()
    }
  }

  // Show "Fix Links" button when village data exists but shows 0 totals
  const villageTotalVoters = villageData.reduce((s, w) => s + (w.total_voters || 0), 0)
  const showFixButton = !loading && villageData.length > 0 && villageTotalVoters === 0

  /* ── filtered sets ──────────────────────────────────────────────── */
  const filteredVillages = villageData.filter(w =>
    !search.trim() ||
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.constituency_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredBooths = boothData.filter(b => {
    if (panchayatFilter && b.panchayat_name !== panchayatFilter) return false
    if (unionFilter     && b.union_name     !== unionFilter)     return false
    if (blockFilter     && b.block_name     !== blockFilter)     return false
    if (boothFilter     && String(b.id)     !== boothFilter)     return false
    if (!boothSearch.trim()) return true
    const q = boothSearch.toLowerCase()
    return (
      (b.name || '').toLowerCase().includes(q) ||
      (b.number || '').toLowerCase().includes(q) ||
      (b.constituency_name || '').toLowerCase().includes(q) ||
      (b.panchayat_name || '').toLowerCase().includes(q) ||
      (b.union_name || '').toLowerCase().includes(q) ||
      (b.block_name || '').toLowerCase().includes(q)
    )
  })

  // ── Cascading filter options: Block → Union → Panchayat → Booth ──
  // Each level shows all values when no parent is selected (independent),
  // or narrows to matching values when a parent IS selected.

  const uniqueBlocks = useMemo(
    () => [...new Set(boothData.map(b => b.block_name).filter(Boolean))].sort(),
    [boothData]
  )

  // Unions: narrowed by block if set, else all
  const uniqueUnions = useMemo(() => {
    const pool = blockFilter
      ? boothData.filter(b => b.block_name === blockFilter)
      : boothData
    return [...new Set(pool.map(b => b.union_name).filter(Boolean))].sort()
  }, [boothData, blockFilter])

  // Panchayats: narrowed by union if set, else by block if set, else all
  const uniquePanchayats = useMemo(() => {
    const pool = unionFilter
      ? boothData.filter(b => b.union_name === unionFilter)
      : blockFilter
        ? boothData.filter(b => b.block_name === blockFilter)
        : boothData
    return [...new Set(pool.map(b => b.panchayat_name).filter(Boolean))].sort()
  }, [boothData, blockFilter, unionFilter])

  // Booths: narrowed by panchayat if set, else union, else block, else all
  const availableBooths = useMemo(() => {
    const pool = panchayatFilter
      ? boothData.filter(b => b.panchayat_name === panchayatFilter)
      : unionFilter
        ? boothData.filter(b => b.union_name === unionFilter)
        : blockFilter
          ? boothData.filter(b => b.block_name === blockFilter)
          : boothData
    return [...pool].sort((a, b) => parseInt(a.number || '0') - parseInt(b.number || '0'))
  }, [boothData, blockFilter, unionFilter, panchayatFilter])

  useEffect(() => {
    if (!unionFilter) return
    if (uniqueUnions.includes(unionFilter)) return
    setUnionFilter('')
    setPanchayatFilter('')
    setBoothFilter('')
  }, [unionFilter, uniqueUnions])

  useEffect(() => {
    if (!panchayatFilter) return
    if (uniquePanchayats.includes(panchayatFilter)) return
    setPanchayatFilter('')
    setBoothFilter('')
  }, [panchayatFilter, uniquePanchayats])

  useEffect(() => {
    if (!boothFilter) return
    if (availableBooths.some(b => String(b.id) === boothFilter)) return
    setBoothFilter('')
  }, [boothFilter, availableBooths])

  /* ── CSV exports ─────────────────────────────────────────────────── */
  const exportBooths = () => {
    if (!filteredBooths.length) return
    const rows = [
      ['#', 'Booth No', 'Booth Name', 'Panchayat', 'Union', 'Block', 'Total Voters', 'Contacted', 'Coverage %', 'Volunteers'],
      ...filteredBooths.map((b, i) => [
        String(i + 1), b.number || '', b.name || '',
        b.panchayat_name || '', b.union_name || '', b.block_name || '',
        String(b.total_voters || 0), String(b.voters_contacted || 0),
        String(b.coverage_percentage || 0), String(b.volunteer_count || 0),
      ]),
    ]
    downloadCsv(rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n'),
      `BJP_BoothWise_${new Date().toISOString().slice(0, 10)}.csv`)
    showToast('<i class="ph ph-file-csv"></i> Booth report exported!', '#138808')
  }

  const exportVillages = () => {
    if (!villageData.length) return
    const rows = [['#', 'Village', 'Constituency', 'Booths', 'Total Voters', 'Contacted', 'Coverage %'],
      ...villageData.map((w, i) => [String(i + 1), w.name, w.constituency_name,
        String(w.booth_count), String(w.total_voters), String(w.voters_contacted),
        String(w.coverage_pct)])]
    downloadCsv(rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n'),
      `BJP_VillageWise_${new Date().toISOString().slice(0, 10)}.csv`)
    showToast('<i class="ph ph-file-csv"></i> Village report exported!', '#138808')
  }

  /* ── KPI totals — follow active filters so cards reflect current scope ── */
  const kpiBase            = (blockFilter || unionFilter || panchayatFilter || boothFilter) ? filteredBooths : boothData
  const totalVoters        = kpiBase.reduce((s, b) => s + (b.total_voters    || 0), 0)
  const totalBooths        = kpiBase.length
  // Survey-based metrics (source of truth for contacted / favourable / coverage)
  const totalSurveyed      = kpiBase.reduce((s, b) => s + (b.survey_count    || 0), 0)
  const totalFavourable    = kpiBase.reduce((s, b) => s + (b.survey_positive || 0), 0)
  const totalNonFavourable = kpiBase.reduce((s, b) => s + (b.survey_negative || 0), 0)
  const overallPct         = totalVoters > 0 ? Math.round(totalSurveyed * 100 / totalVoters) : 0

  // Breadcrumb trail for KPI scope label
  const filterTrail = [
    blockFilter     && { icon: 'ph-buildings',  label: blockFilter },
    unionFilter     && { icon: 'ph-intersect',  label: unionFilter },
    panchayatFilter && { icon: 'ph-tree',       label: panchayatFilter },
    boothFilter     && { icon: 'ph-map-pin',    label: availableBooths.find(b => String(b.id) === boothFilter)?.name || `Booth ${boothFilter}` },
  ].filter(Boolean) as { icon: string; label: string }[]

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-[14px] flex-wrap gap-2">
        <SectionHeader title="Campaign Reports" subtitle="Village-wise voter data" />
        {/* <div className="flex gap-2">
          <button
            onClick={exportVillages}
            className="inline-flex items-center gap-[6px] px-[14px] py-[6px]
                       bg-kampgreen-light text-kampgreen-dark border border-kampgreen/30
                       rounded-md font-inter text-[10px] font-bold tracking-[0.8px] uppercase
                       hover:bg-kampgreen hover:text-white transition-all"
          >
            <i className="ph ph-file-csv" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-[6px] px-[14px] py-[6px]
                       bg-navy-light text-navy border border-navy/20
                       rounded-md font-inter text-[10px] font-bold tracking-[0.8px] uppercase
                       hover:bg-navy hover:text-white transition-all"
          >
            <i className="ph ph-printer" /> Print
          </button>
        </div> */}
      </div>

      {/* KPI scope breadcrumb */}
      {filterTrail.length > 0 && (
        <div className="flex items-center gap-[6px] mb-3 flex-wrap">
          <span className="text-[9px] font-bold uppercase tracking-[0.7px] text-muted">Showing:</span>
          {filterTrail.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <i className="ph ph-caret-right text-[9px] text-muted" />}
              <span className="inline-flex items-center gap-[4px] bg-saffron/10 text-navy border border-saffron/30 rounded-full px-[8px] py-[2px] text-[10px] font-semibold">
                <i className={`ph ${f.icon} text-[10px] text-saffron`} />
                {f.label}
              </span>
            </span>
          ))}
          <button
            onClick={clearReportFilters}
            className="ml-1 text-[9px] text-kampr hover:underline flex items-center gap-[3px]"
          >
            <i className="ph ph-x-circle" /> Reset
          </button>
        </div>
      )}

      {showActivityHighlights ? (
        <SummaryCards kpis={activityKpis} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-[10px] mb-5">
          {[
            { label: 'Total Voters',    value: totalVoters.toLocaleString(),        color: '#0d2455' },
            { label: 'Contacted',       value: totalSurveyed.toLocaleString(),      color: '#138808' },
            { label: 'Coverage',        value: `${overallPct}%`,                    color: overallPct >= 70 ? '#138808' : '#FF9933' },
            { label: 'Total Booths',    value: String(totalBooths),                 color: '#7c3aed' },
            { label: 'Favourable',      value: totalFavourable.toLocaleString(),    color: '#138808' },
            { label: 'Non-Favourable',  value: totalNonFavourable.toLocaleString(), color: '#dc2626' },
            { label: 'Voter Surveys',   value: surveyCount !== null ? surveyCount.toLocaleString() : '—', color: '#0369a1' },
          ].map(k => (
            <div key={k.label} className="bg-surface rounded-[10px] px-[14px] py-3 shadow-card text-center">
              <div className="font-inter text-[22px] font-extrabold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[9px] text-muted uppercase tracking-[0.5px] mt-[3px]">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Booth-wise table card */}
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-5">
        <div className="bg-navy px-[18px] py-[11px] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-white text-[11px] font-bold tracking-[0.6px] uppercase">
            <i className="ph ph-map-pin mr-1" /> Booth-wise
          </div>
          <div className="flex items-center gap-2">
            <Badge
              label={`${filteredBooths.length}${filteredBooths.length !== boothData.length ? `/${boothData.length}` : ''} Booths`}
              variant="s"
            />
            <button
              onClick={exportBooths}
              className="inline-flex items-center gap-1 px-[10px] py-[3px] text-[9px] font-bold
                         tracking-[0.6px] uppercase rounded border border-kampgreen/60
                         bg-kampgreen-light text-kampgreen-dark hover:bg-kampgreen hover:text-white transition-all"
            >
              <i className="ph ph-file-csv" /> Export
            </button>
          </div>
        </div>
        <div className="px-[18px] py-[14px]">
          {/* Filter row — Block → Union → Panchayat → Booth (cascade + independent) */}
          <div className="flex flex-wrap items-center gap-2 mb-3">

            {/* 1. Block */}
            <select
              value={blockFilter}
              onChange={e => {
                setBlockFilter(e.target.value)
                setUnionFilter('')      // reset children
                setPanchayatFilter('')
                setBoothFilter('')
              }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[130px] w-auto ${blockFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Block</option>
              {uniqueBlocks.map(bl => <option key={bl} value={bl}>{bl}</option>)}
            </select>

            {/* 2. Union — narrows when block is set, independent otherwise */}
            <select
              value={unionFilter}
              onChange={e => {
                setUnionFilter(e.target.value)
                setPanchayatFilter('')  // reset children
                setBoothFilter('')
              }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[140px] w-auto ${unionFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Union</option>
              {uniqueUnions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            {/* 3. Panchayat — narrows when union/block is set, independent otherwise */}
            <select
              value={panchayatFilter}
              onChange={e => {
                setPanchayatFilter(e.target.value)
                setBoothFilter('')      // reset children
              }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[150px] w-auto ${panchayatFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Panchayat</option>
              {uniquePanchayats.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* 4. Booth — narrows based on deepest active ancestor */}
            <select
              value={boothFilter}
              onChange={e => setBoothFilter(e.target.value)}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[160px] w-auto ${boothFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Booths</option>
              {availableBooths.map(b => (
                <option key={b.id} value={String(b.id)}>
                  {b.number ? `#${b.number} — ` : ''}{b.name || `Booth ${b.id}`}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[13px] pointer-events-none" />
              <input
                type="text" value={boothSearch}
                onChange={e => setBoothSearch(e.target.value)}
                placeholder="Search booth number, name…"
                className="form-input pl-8 py-[5px] text-[11px] w-full"
              />
              {boothSearch && (
                <button onClick={() => setBoothSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[12px] hover:text-kampr">
                  <i className="ph ph-x" />
                </button>
              )}
            </div>

            {/* Clear all filters */}
            {(blockFilter || unionFilter || panchayatFilter || boothFilter || boothSearch) && (
              <button
                onClick={clearReportFilters}
                className="text-[10px] font-bold text-kampr flex items-center gap-1"
              >
                <i className="ph ph-x-circle" /> Clear
              </button>
            )}
          </div>
          {boothLoading ? (
            <p className="text-muted text-[11px] text-center py-10 italic">Loading data…</p>
          ) : (
            <BoothTable rows={filteredBooths} fetchVolunteers={api.fetchBoothVolunteers} fetchVoters={api.fetchBoothVoters} />
          )}
        </div>
      </div>

  
    </div>
  )
}

/* ── Booth table ─────────────────────────────────────────────────── */
type BoothSortKey = 'number' | 'name' | 'panchayat_name' | 'union_name' | 'block_name' | 'total_voters' | 'voters_contacted' | 'coverage_percentage' | 'volunteer_count' | 'positive_pct' | 'neutral_pct' | 'negative_pct'

function BoothTable({
  rows,
  fetchVolunteers,
  fetchVoters,
}: {
  rows: BoothStat[]
  fetchVolunteers: (id: number) => Promise<VolunteerInfo[]>
  fetchVoters: (id: number, options?: { contactedOnly?: boolean }) => Promise<VoterBasicInfo[]>
}) {
  const [page, setPage]           = useState(1)
  const [sortKey, setSortKey]     = useState<BoothSortKey>('number')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc')
  const [popup,   setPopup]       = useState<{ id: number; title: string } | null>(null)
  const [volList, setVolList]     = useState<VolunteerInfo[]>([])
  const [volLoad, setVolLoad]     = useState(false)
  const [voterPopup,            setVoterPopup]            = useState<{ id: number; title: string } | null>(null)
  const [voterList,             setVoterList]             = useState<VoterBasicInfo[]>([])
  const [voterLoad,             setVoterLoad]             = useState(false)
  const [voterPopupContactedOnly, setVoterPopupContactedOnly] = useState(false)
  const [addrPopup, setAddrPopup] = useState<{ name: string; number: string; address: string } | null>(null)

  useEffect(() => { setPage(1) }, [rows])

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k as BoothSortKey); setSortDir('asc') }
    setPage(1)
  }

  const openVolPopup = (b: BoothStat) => {
    setPopup({ id: b.id, title: `${b.number ? `#${b.number} — ` : ''}${b.name || 'Booth'}` })
    setVolLoad(true)
    setVolList([])
    fetchVolunteers(b.id).then(v => { setVolList(v); setVolLoad(false) })
  }

  const openVoterPopup = (b: BoothStat, contactedOnly = false) => {
    const title = `${b.number ? `#${b.number} — ` : ''}${b.name || 'Booth'}`
    setVoterPopup({ id: b.id, title })
    setVoterPopupContactedOnly(contactedOnly)
    setVoterLoad(true)
    setVoterList([])
    fetchVoters(b.id, { contactedOnly })
      .then(v => setVoterList(Array.isArray(v) ? v : []))
      .catch(() => setVoterList([]))
      .finally(() => setVoterLoad(false))
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortKey === 'number') {
        const an = parseInt(a.number || '0', 10)
        const bn = parseInt(b.number || '0', 10)
        return sortDir === 'asc' ? an - bn : bn - an
      }
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  if (!sorted.length) return (
    <p className="text-muted text-[11px] text-center py-8 italic">No booth data found.</p>
  )

  const paged        = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const grandTotal   = rows.reduce((s, b) => s + (b.total_voters    || 0), 0)
  const grandContact = rows.reduce((s, b) => s + (b.voters_contacted || 0), 0)
  const grandVols    = rows.reduce((s, b) => s + (b.volunteer_count  || 0), 0)
  const thProps      = { sortKey, sortDir, onSort: handleSort }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table w-full text-[11px]">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <Th label="Booth No"     colKey="number"              {...thProps} />
              <Th label="Booth Name"   colKey="name"                {...thProps} />
              <Th label="Panchayat"    colKey="panchayat_name"      {...thProps} />
              <Th label="Union"        colKey="union_name"          {...thProps} />
              <Th label="Block"        colKey="block_name"          {...thProps} />
              <Th label="Total Voters" colKey="total_voters"        {...thProps} className="text-right" />
              <Th label="Contacted"    colKey="voters_contacted"    {...thProps} className="text-right" />
              <Th label="Coverage"     colKey="coverage_percentage" {...thProps} />
              <Th label="Support"      colKey="positive_pct"        {...thProps} />
              <Th label="Volunteers"   colKey="volunteer_count"     {...thProps} className="text-center" />
            </tr>
          </thead>
          <tbody>
            {paged.map((b, i) => (
              <tr key={b.id}>
                <td className="text-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="font-bold text-navy">{b.number || '—'}</td>
                <td>
                  {b.address ? (
                    <button
                      onClick={() => setAddrPopup({ name: b.name, number: b.number, address: b.address! })}
                      className="text-left hover:text-saffron hover:underline transition-colors cursor-pointer"
                      title="Click to view address"
                    >
                      {b.name || '—'}
                    </button>
                  ) : (b.name || '—')}
                </td>
                <td className="text-muted">{b.panchayat_name || '—'}</td>
                <td className="text-muted">{b.union_name || '—'}</td>
                <td className="text-muted">{b.block_name || '—'}</td>
                <td className="text-right">
                  <button
                    onClick={() => openVoterPopup(b)}
                    className="font-semibold text-navy hover:text-saffron hover:underline transition-colors cursor-pointer"
                    title="View voter details"
                  >
                    {(b.total_voters || 0).toLocaleString()}
                  </button>
                </td>
                <td className="text-right">
                  {(b.voters_contacted || 0) > 0 ? (
                    <button
                      onClick={() => openVoterPopup(b, true)}
                      className="font-semibold text-kampgreen hover:text-saffron hover:underline transition-colors cursor-pointer"
                      title="View contacted voters"
                    >
                      {(b.voters_contacted || 0).toLocaleString()}
                    </button>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </td>
                <td className="min-w-[130px]"><PctBar pct={b.coverage_percentage || 0} /></td>
                <td className="min-w-[90px]">
                  <SentimentBar
                    pos={b.positive_pct ?? 0}
                    neu={b.neutral_pct  ?? 0}
                    neg={b.negative_pct ?? 0}
                    posCount={b.survey_positive ?? 0}
                    neuCount={b.survey_neutral ?? 0}
                    negCount={b.survey_negative ?? 0}
                  />
                </td>
                <td className="text-center">
                  <button
                    onClick={() => openVolPopup(b)}
                    className={`
                      inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[10px] font-bold
                      transition-all duration-150 border
                      ${(b.volunteer_count || 0) > 0
                        ? 'bg-[#e8f4fd] text-[#0e6aad] border-[#bde0f7] hover:bg-[#0e6aad] hover:text-white'
                        : 'bg-border/40 text-muted border-border cursor-default'
                      }
                    `}
                    disabled={(b.volunteer_count || 0) === 0}
                    title={(b.volunteer_count || 0) > 0 ? 'View volunteers' : 'No volunteers assigned'}
                  >
                    <i className="ph ph-users text-[10px]" />
                    {b.volunteer_count || 0}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-navy-light">
              <td colSpan={6} className="text-right text-[10px] uppercase tracking-wider text-muted">Grand Total</td>
              <td className="text-right text-navy">{grandTotal.toLocaleString()}</td>
              <td className="text-right text-navy">{grandContact.toLocaleString()}</td>
              <td />
              <td />
              <td className="text-center text-navy">{grandVols}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Pagination page={page} total={sorted.length} onChange={setPage} />

      {popup && (
        <VolunteerPopup
          title={popup.title}
          volunteers={volList}
          loading={volLoad}
          onClose={() => setPopup(null)}
        />
      )}

      {voterPopup && (
        <VoterPopup
          title={voterPopup.title}
          voters={voterList}
          loading={voterLoad}
          contactedOnly={voterPopupContactedOnly}
          onClose={() => { setVoterPopup(null); setVoterPopupContactedOnly(false) }}
        />
      )}

      {addrPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setAddrPopup(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-navy px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-[13px]">
                  {addrPopup.number ? `#${addrPopup.number} — ` : ''}{addrPopup.name}
                </p>
                <p className="text-white/60 text-[10px] uppercase tracking-wider mt-[1px]">Booth Address</p>
              </div>
              <button onClick={() => setAddrPopup(null)} className="text-white/60 hover:text-white transition-colors">
                <i className="ph ph-x text-[16px]" />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <i className="ph ph-map-pin text-saffron text-[18px] mt-[1px] flex-shrink-0" />
                <p className="text-navy text-[13px] leading-relaxed">{addrPopup.address}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Village table ───────────────────────────────────────────────── */
type VillageSortKey = 'name' | 'total_voters' | 'volunteer_count'

function VillageTable({
  rows,
  fetchVolunteers,
}: {
  rows: WardStat[]
  fetchVolunteers: (id: number) => Promise<VolunteerInfo[]>
}) {
  const [page, setPage]       = useState(1)
  const [sortKey, setSortKey] = useState<VillageSortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [popup,   setPopup]   = useState<{ id: number; title: string } | null>(null)
  const [volList, setVolList] = useState<VolunteerInfo[]>([])
  const [volLoad, setVolLoad] = useState(false)

  useEffect(() => { setPage(1) }, [rows])

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k as VillageSortKey); setSortDir('asc') }
    setPage(1)
  }

  const openPopup = (w: WardStat) => {
    setPopup({ id: w.id, title: w.name })
    setVolLoad(true)
    setVolList([])
    fetchVolunteers(w.id).then(v => { setVolList(v); setVolLoad(false) })
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  if (!sorted.length) return (
    <p className="text-muted text-[11px] text-center py-8 italic">No village data found.</p>
  )

  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const grandTotal = rows.reduce((s, w) => s + (w.total_voters    || 0), 0)
  const grandVols  = rows.reduce((s, w) => s + (w.volunteer_count || 0), 0)
  const thProps    = { sortKey, sortDir, onSort: handleSort }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table w-full text-[11px]">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <Th label="Village / Ward" colKey="name"           {...thProps} />
              <Th label="Voter Count"    colKey="total_voters"   {...thProps} className="text-right" />
              <Th label="Volunteers"     colKey="volunteer_count" {...thProps} className="text-center" />
            </tr>
          </thead>
          <tbody>
            {paged.map((w, i) => (
              <tr key={w.id}>
                <td className="text-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="font-bold text-navy">{w.name}</td>
                <td className="text-right">{(w.total_voters || 0).toLocaleString()}</td>
                <td className="text-center">
                  <button
                    onClick={() => openPopup(w)}
                    className={`
                      inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[10px] font-bold
                      transition-all duration-150 border
                      ${(w.volunteer_count || 0) > 0
                        ? 'bg-[#e8f4fd] text-[#0e6aad] border-[#bde0f7] hover:bg-[#0e6aad] hover:text-white'
                        : 'bg-border/40 text-muted border-border cursor-default'
                      }
                    `}
                    disabled={(w.volunteer_count || 0) === 0}
                    title={(w.volunteer_count || 0) > 0 ? 'View volunteers' : 'No volunteers assigned'}
                  >
                    <i className="ph ph-users text-[10px]" />
                    {w.volunteer_count || 0}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-navy-light">
              <td colSpan={2} className="text-right text-[10px] uppercase tracking-wider text-muted">Grand Total</td>
              <td className="text-right text-navy">{grandTotal.toLocaleString()}</td>
              <td className="text-center text-navy">{grandVols}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Pagination page={page} total={sorted.length} onChange={setPage} />

      {popup && (
        <VolunteerPopup
          title={popup.title}
          volunteers={volList}
          loading={volLoad}
          onClose={() => setPopup(null)}
        />
      )}
    </>
  )
}

/* ── Sentiment pills ─────────────────────────────────────────────── */
function SentimentPills({ s, total }: { s: Record<string, number>; total: number }) {
  const pos = s['positive'] || 0
  const neg = s['negative'] || 0
  const neu = s['neutral']  || 0
  if (!total) return <span className="text-muted">—</span>
  const posPct = Math.round(pos * 100 / total)
  const negPct = Math.round(neg * 100 / total)
  const neuPct = Math.round(neu * 100 / total)
  return (
    <div className="flex items-center gap-[4px] text-[9px]">
      {posPct > 0 && <span className="bg-kampgreen-light text-kampgreen-dark px-[5px] py-[1px] rounded font-bold">+{posPct}%</span>}
      {neuPct > 0 && <span className="bg-saffron-light text-saffron-dark px-[5px] py-[1px] rounded font-bold">~{neuPct}%</span>}
      {negPct > 0 && <span className="bg-kampr-light text-kampr px-[5px] py-[1px] rounded font-bold">-{negPct}%</span>}
    </div>
  )
}
