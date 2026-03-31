import React, { useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import Badge from '../components/ui/Badge'
import { useAnalyticsAPI } from '../hooks/useAnalyticsAPI'
import type { WardStat, BoothStat, VolunteerInfo, VoterBasicInfo } from '../hooks/useAnalyticsAPI'
import { useToast } from '../context/ToastContext'

const PAGE_SIZE = 10

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

function VoterPopup({
  title,
  voters,
  loading,
  onClose,
}: {
  title: string
  voters: VoterBasicInfo[]
  loading: boolean
  onClose: () => void
}) {
  const [search,       setSearch]       = useState('')
  const [activeWard,   setActiveWard]   = useState<string | null>(null)

  // Build ward list preserving order of first appearance
  const wards = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const v of voters) {
      const w = v.ward_name || 'Unassigned'
      if (!seen.has(w)) { seen.add(w); list.push(w) }
    }
    return list.sort((a, b) => a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b))
  }, [voters])

  // Set first ward as default once data loads
  useEffect(() => {
    if (!loading && wards.length > 0 && activeWard === null) setActiveWard(wards[0])
  }, [loading, wards, activeWard])

  const wardVoters = useMemo(() =>
    voters.filter(v => (v.ward_name || 'Unassigned') === activeWard),
    [voters, activeWard]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return wardVoters
    return wardVoters.filter(v =>
      (v.name || '').toLowerCase().includes(q) ||
      (v.voter_id || '').toLowerCase().includes(q) ||
      (v.phone || '').includes(q)
    )
  }, [wardVoters, search])

  const handleSearch = (v: string) => setSearch(v)
  const handleWardChange = (w: string) => { setActiveWard(w); setSearch('') }

  const wardCount = (w: string) => voters.filter(v => (v.ward_name || 'Unassigned') === w).length

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
            <div className="text-white text-[12px] font-bold tracking-[0.6px]">
              <i className="ph ph-users mr-2 text-saffron" />
              Voters — {title}
            </div>
            <div className="text-white/50 text-[9px] mt-[2px]">
              {loading ? 'Loading…' : `${voters.length} voter${voters.length !== 1 ? 's' : ''} across ${wards.length} ward${wards.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <i className="ph ph-x text-[14px]" />
          </button>
        </div>

        {/* Ward tabs */}
        {!loading && wards.length > 1 && (
          <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0 flex-wrap border-b border-border bg-[#f7f9fc]">
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

        {/* Search */}
        {!loading && voters.length > 0 && (
          <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b border-border">
            <div className="relative">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[12px] pointer-events-none" />
              <input
                type="text" value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name, voter ID or phone…"
                className="form-input pl-8 py-[5px] text-[11px] w-full"
              />
              {search && (
                <button onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[11px] hover:text-kampr">
                  <i className="ph ph-x" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-muted text-[11px] text-center py-10 italic">Loading voters…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted text-[11px] text-center py-10 italic">
              {search ? 'No voters match your search.' : 'No voters in this ward.'}
            </p>
          ) : (
            <table className="data-table w-full text-[11px]">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  <th>Voter ID</th>
                  <th>Name</th>
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
  const [search,      setSearch]     = useState('')
  const [boothSearch, setBoothSearch] = useState('')
  const [loading,     setLoad]       = useState(true)
  const [boothLoading, setBoothLoad] = useState(true)
  const [fixing,      setFixing]     = useState(false)

  const [panchayatFilter, setPanchayatFilter] = useState('')
  const [unionFilter,     setUnionFilter]     = useState('')
  const [blockFilter,     setBlockFilter]     = useState('')
  const [boothFilter,     setBoothFilter]     = useState('')

  const reload = () => {
    setLoad(true)
    setBoothLoad(true)
    api.fetchWardStats()
      .then(w => setVillages(w))
      .finally(() => setLoad(false))
    api.fetchBoothStats()
      .then(b => setBooths(b))
      .finally(() => setBoothLoad(false))
  }

  useEffect(() => { reload() }, [])

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

  // Unique values for dropdown filters (from full boothData, not filtered)
  const uniquePanchayats = useMemo(
    () => [...new Set(boothData.map(b => b.panchayat_name).filter(Boolean))].sort(),
    [boothData]
  )
  const uniqueUnions = useMemo(
    () => [...new Set(boothData.map(b => b.union_name).filter(Boolean))].sort(),
    [boothData]
  )
  const uniqueBlocks = useMemo(
    () => [...new Set(boothData.map(b => b.block_name).filter(Boolean))].sort(),
    [boothData]
  )

  // Booths available after panchayat/union/block filters (for booth dropdown)
  const availableBooths = useMemo(() =>
    boothData.filter(b => {
      if (panchayatFilter && b.panchayat_name !== panchayatFilter) return false
      if (unionFilter     && b.union_name     !== unionFilter)     return false
      if (blockFilter     && b.block_name     !== blockFilter)     return false
      return true
    }).sort((a, b) => parseInt(a.number || '0') - parseInt(b.number || '0')),
    [boothData, panchayatFilter, unionFilter, blockFilter]
  )

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

  /* ── KPI totals (from booth data which is always populated) ─────── */
  const totalVoters    = boothData.reduce((s, b) => s + (b.total_voters    || 0), 0)
  const totalContacted = boothData.reduce((s, b) => s + (b.voters_contacted || 0), 0)
  const totalBooths    = boothData.length
  const overallPct     = totalVoters > 0 ? Math.round(totalContacted * 100 / totalVoters) : 0

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

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[10px] mb-5">
        {[
          { label: 'Total Voters', value: totalVoters.toLocaleString(),    color: '#0d2455' },
          { label: 'Contacted',    value: totalContacted.toLocaleString(), color: '#138808' },
          { label: 'Coverage',     value: `${overallPct}%`,               color: overallPct >= 70 ? '#138808' : '#FF9933' },
          { label: 'Total Booths', value: String(totalBooths),             color: '#7c3aed' },
        ].map(k => (
          <div key={k.label} className="bg-surface rounded-[10px] px-[14px] py-3 shadow-card text-center">
            <div className="font-inter text-[22px] font-extrabold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[9px] text-muted uppercase tracking-[0.5px] mt-[3px]">{k.label}</div>
          </div>
        ))}
      </div>

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
          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Panchayat filter */}
            <select
              value={panchayatFilter}
              onChange={e => { setPanchayatFilter(e.target.value); setUnionFilter(''); setBlockFilter(''); setBoothFilter('') }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[150px] w-auto ${panchayatFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Panchayat</option>
              {uniquePanchayats.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {/* Union filter */}
            <select
              value={unionFilter}
              onChange={e => { setUnionFilter(e.target.value); setBlockFilter(''); setBoothFilter('') }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[140px] w-auto ${unionFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Union</option>
              {(panchayatFilter
                ? [...new Set(boothData.filter(b => b.panchayat_name === panchayatFilter).map(b => b.union_name).filter(Boolean))].sort()
                : uniqueUnions
              ).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            {/* Block filter */}
            <select
              value={blockFilter}
              onChange={e => { setBlockFilter(e.target.value); setBoothFilter('') }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[130px] w-auto ${blockFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Block</option>
              {(unionFilter
                ? [...new Set(boothData.filter(b => b.union_name === unionFilter).map(b => b.block_name).filter(Boolean))].sort()
                : uniqueBlocks
              ).map(bl => <option key={bl} value={bl}>{bl}</option>)}
            </select>
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[320px]">
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
            {/* Booth filter */}
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
            {/* Clear all filters */}
            {(panchayatFilter || unionFilter || blockFilter || boothFilter || boothSearch) && (
              <button
                onClick={() => { setPanchayatFilter(''); setUnionFilter(''); setBlockFilter(''); setBoothFilter(''); setBoothSearch('') }}
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
type BoothSortKey = 'number' | 'name' | 'panchayat_name' | 'union_name' | 'block_name' | 'total_voters' | 'voters_contacted' | 'coverage_percentage' | 'volunteer_count'

function BoothTable({
  rows,
  fetchVolunteers,
  fetchVoters,
}: {
  rows: BoothStat[]
  fetchVolunteers: (id: number) => Promise<VolunteerInfo[]>
  fetchVoters: (id: number) => Promise<VoterBasicInfo[]>
}) {
  const [page, setPage]           = useState(1)
  const [sortKey, setSortKey]     = useState<BoothSortKey>('number')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc')
  const [popup,   setPopup]       = useState<{ id: number; title: string } | null>(null)
  const [volList, setVolList]     = useState<VolunteerInfo[]>([])
  const [volLoad, setVolLoad]     = useState(false)
  const [voterPopup, setVoterPopup] = useState<{ id: number; title: string } | null>(null)
  const [voterList,  setVoterList]  = useState<VoterBasicInfo[]>([])
  const [voterLoad,  setVoterLoad]  = useState(false)

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

  const openVoterPopup = (b: BoothStat) => {
    const title = `${b.number ? `#${b.number} — ` : ''}${b.name || 'Booth'}`
    setVoterPopup({ id: b.id, title })
    setVoterLoad(true)
    setVoterList([])
    fetchVoters(b.id).then(v => { setVoterList(v); setVoterLoad(false) })
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
              <Th label="Volunteers"   colKey="volunteer_count"     {...thProps} className="text-center" />
            </tr>
          </thead>
          <tbody>
            {paged.map((b, i) => (
              <tr key={b.id}>
                <td className="text-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="font-bold text-navy">{b.number || '—'}</td>
                <td>{b.name || '—'}</td>
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
                <td className="text-right">{(b.voters_contacted || 0).toLocaleString()}</td>
                <td className="min-w-[130px]"><PctBar pct={b.coverage_percentage || 0} /></td>
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
          onClose={() => setVoterPopup(null)}
        />
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
