import React, { useEffect, useMemo, useState } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import Badge from '../components/ui/Badge'
import { useAnalyticsAPI } from '../hooks/useAnalyticsAPI'
import type { BoothStat, WardStat } from '../hooks/useAnalyticsAPI'
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

/* ── tab type ────────────────────────────────────────────────────── */
type Tab = 'booth' | 'village'

/* ── main component ──────────────────────────────────────────────── */
export default function ReportsPage() {
  const api = useAnalyticsAPI()
  const { showToast } = useToast()

  const [tab, setTab]              = useState<Tab>('booth')
  const [boothData, setBooths]     = useState<BoothStat[]>([])
  const [villageData, setVillages] = useState<WardStat[]>([])
  const [search,    setSearch]     = useState('')
  const [loading,   setLoad]       = useState(true)
  const [fixing,    setFixing]     = useState(false)

  const reload = () => {
    setLoad(true)
    Promise.all([api.fetchBoothStats(), api.fetchWardStats()])
      .then(([b, w]) => { setBooths(b); setVillages(w) })
      .finally(() => setLoad(false))
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

  /* ── filtered sets ─────────────────────────────────────────────── */
  const filteredBooths = boothData.filter(b =>
    !search.trim() ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.number.toLowerCase().includes(search.toLowerCase())
  )
  const filteredVillages = villageData.filter(w =>
    !search.trim() ||
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.constituency_name || '').toLowerCase().includes(search.toLowerCase())
  )

  /* ── CSV export (always all data) ──────────────────────────────── */
  const exportBooths = () => {
    if (!boothData.length) return
    const rows = [['#', 'Booth No.', 'Booth Name', 'Total Voters', 'Contacted', 'Coverage %'],
      ...boothData.map((b, i) => [String(i + 1), b.number, b.name,
        String(b.total_voters), String(b.voters_contacted), String(b.coverage_percentage)])]
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

  /* ── KPI totals (from full booth data) ─────────────────────────── */
  const totalVoters    = boothData.reduce((s, b) => s + (b.total_voters    || 0), 0)
  const totalContacted = boothData.reduce((s, b) => s + (b.voters_contacted || 0), 0)
  const overallPct     = totalVoters > 0 ? Math.round(totalContacted * 100 / totalVoters) : 0

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-[14px] flex-wrap gap-2">
        <SectionHeader title="Campaign Reports" subtitle="Booth-wise &amp; Village-wise voter data" />
        <div className="flex gap-2">
          <button
            onClick={tab === 'booth' ? exportBooths : exportVillages}
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
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[10px] mb-5">
        {[
          { label: 'Total Voters', value: totalVoters.toLocaleString(),    color: '#0d2455' },
          { label: 'Contacted',    value: totalContacted.toLocaleString(), color: '#138808' },
          { label: 'Coverage',     value: `${overallPct}%`,               color: overallPct >= 70 ? '#138808' : '#FF9933' },
          { label: 'Total Booths', value: String(boothData.length),        color: '#7c3aed' },
        ].map(k => (
          <div key={k.label} className="bg-surface rounded-[10px] px-[14px] py-3 shadow-card text-center">
            <div className="font-inter text-[22px] font-extrabold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[9px] text-muted uppercase tracking-[0.5px] mt-[3px]">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tab + search */}
      <div className="bg-surface rounded-card shadow-card overflow-hidden">
        <div className="bg-navy px-[18px] py-[11px] flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1">
            {(['booth', 'village'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSearch('') }}
                className={`px-3 py-[4px] rounded text-[10px] font-bold tracking-[0.6px] uppercase transition-all
                  ${tab === t ? 'bg-saffron text-navy' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >
                <i className={`ph ${t === 'booth' ? 'ph-map-pin' : 'ph-tree-structure'} mr-1`} />
                {t === 'booth' ? 'Booth-wise' : 'Village-wise'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              label={tab === 'booth'
                ? `${filteredBooths.length}${filteredBooths.length !== boothData.length ? `/${boothData.length}` : ''} Booths`
                : `${filteredVillages.length}${filteredVillages.length !== villageData.length ? `/${villageData.length}` : ''} Villages`}
              variant="s"
            />
            {showFixButton && (
              <button
                onClick={handleFixLinks}
                disabled={fixing}
                className="inline-flex items-center gap-1 px-[10px] py-[3px] text-[9px] font-bold
                           tracking-[0.6px] uppercase rounded border border-saffron/60
                           bg-saffron-light text-saffron-dark hover:bg-saffron hover:text-navy
                           disabled:opacity-50 transition-all"
              >
                <i className={`ph ${fixing ? 'ph-spinner animate-spin' : 'ph-link'}`} />
                {fixing ? 'Fixing…' : 'Fix Data Links'}
              </button>
            )}
          </div>
        </div>

        <div className="px-[18px] py-[14px]">
          {/* Search */}
          <div className="relative mb-3">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[13px] pointer-events-none" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'booth' ? 'Search booth name or number…' : 'Search village or constituency…'}
              className="form-input pl-8 py-[5px] text-[11px] w-full max-w-[360px]"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[12px] hover:text-kampr">
                <i className="ph ph-x" />
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-muted text-[11px] text-center py-10 italic">Loading data…</p>
          ) : tab === 'booth' ? (
            <BoothTable rows={filteredBooths} />
          ) : (
            <VillageTable rows={filteredVillages} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Booth table ─────────────────────────────────────────────────── */
type BoothSortKey = 'number' | 'name' | 'total_voters' | 'voters_contacted' | 'coverage_percentage'

function BoothTable({ rows }: { rows: BoothStat[] }) {
  const [page, setPage]       = useState(1)
  const [sortKey, setSortKey] = useState<BoothSortKey>('number')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => { setPage(1) }, [rows])

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k as BoothSortKey); setSortDir('asc') }
    setPage(1)
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
    <p className="text-muted text-[11px] text-center py-8 italic">No booth data found.</p>
  )

  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const grandTotal     = rows.reduce((s, b) => s + (b.total_voters    || 0), 0)
  const grandContacted = rows.reduce((s, b) => s + (b.voters_contacted || 0), 0)

  const thProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table w-full text-[11px]">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <Th label="Booth No." colKey="number"              {...thProps} />
              <Th label="Name"      colKey="name"                {...thProps} />
              <Th label="Total Voters"  colKey="total_voters"        {...thProps} className="text-right" />
              <Th label="Contacted"     colKey="voters_contacted"    {...thProps} className="text-right" />
              <Th label="Coverage"      colKey="coverage_percentage" {...thProps} />
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((b, i) => (
              <tr key={b.id}>
                <td className="text-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="font-bold text-navy">{b.number}</td>
                <td>{b.name}</td>
                <td className="text-right">{(b.total_voters || 0).toLocaleString()}</td>
                <td className="text-right">{(b.voters_contacted || 0).toLocaleString()}</td>
                <td className="min-w-[130px]"><PctBar pct={b.coverage_percentage || 0} /></td>
                <td>
                  <span className={`inline-block px-2 py-[2px] rounded text-[9px] font-bold ${
                    (b.coverage_percentage || 0) >= 70 ? 'bg-kampgreen-light text-kampgreen-dark'
                    : (b.coverage_percentage || 0) >= 40 ? 'bg-saffron-light text-saffron-dark'
                    : 'bg-kampr-light text-kampr'}`}>
                    {(b.coverage_percentage || 0) >= 70 ? 'On Track' : (b.coverage_percentage || 0) >= 40 ? 'Partial' : 'Low'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-navy-light">
              <td colSpan={3} className="text-right text-[10px] uppercase tracking-wider text-muted">Grand Total</td>
              <td className="text-right text-navy">{grandTotal.toLocaleString()}</td>
              <td className="text-right text-navy">{grandContacted.toLocaleString()}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <Pagination page={page} total={sorted.length} onChange={setPage} />
    </>
  )
}

/* ── Village table ───────────────────────────────────────────────── */
type VillageSortKey = 'name' | 'constituency_name' | 'booth_count' | 'total_voters' | 'voters_contacted' | 'coverage_pct'

function VillageTable({ rows }: { rows: WardStat[] }) {
  const [page, setPage]       = useState(1)
  const [sortKey, setSortKey] = useState<VillageSortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => { setPage(1) }, [rows])

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k as VillageSortKey); setSortDir('asc') }
    setPage(1)
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

  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const grandTotal     = rows.reduce((s, w) => s + (w.total_voters    || 0), 0)
  const grandContacted = rows.reduce((s, w) => s + (w.voters_contacted || 0), 0)

  const thProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="data-table w-full text-[11px]">
          <thead>
            <tr>
              <th className="w-8">#</th>
              <Th label="Village"      colKey="name"              {...thProps} />
              <Th label="Constituency" colKey="constituency_name" {...thProps} />
              <Th label="Booths"       colKey="booth_count"       {...thProps} className="text-center" />
              <Th label="Total Voters" colKey="total_voters"      {...thProps} className="text-right" />
              <Th label="Contacted"    colKey="voters_contacted"  {...thProps} className="text-right" />
              <Th label="Coverage"     colKey="coverage_pct"      {...thProps} />
              <th>Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((w, i) => (
              <tr key={w.id}>
                <td className="text-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="font-bold text-navy">{w.name}</td>
                <td className="text-muted">{w.constituency_name || '—'}</td>
                <td className="text-center">{w.booth_count}</td>
                <td className="text-right">{(w.total_voters || 0).toLocaleString()}</td>
                <td className="text-right">{(w.voters_contacted || 0).toLocaleString()}</td>
                <td className="min-w-[130px]"><PctBar pct={w.coverage_pct || 0} /></td>
                <td className="whitespace-nowrap">
                  <SentimentPills s={w.sentiment} total={w.total_voters} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-navy-light">
              <td colSpan={4} className="text-right text-[10px] uppercase tracking-wider text-muted">Grand Total</td>
              <td className="text-right text-navy">{grandTotal.toLocaleString()}</td>
              <td className="text-right text-navy">{grandContacted.toLocaleString()}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <Pagination page={page} total={sorted.length} onChange={setPage} />
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
