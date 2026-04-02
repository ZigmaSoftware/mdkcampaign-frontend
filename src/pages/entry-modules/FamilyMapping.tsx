import { useState, useEffect, useMemo, useRef } from 'react'
import apiClient from '../../utils/api'
import { inputCls, selectCls } from '../../components/entry/FormGroup'
import { useToast } from '../../context/ToastContext'

/* ── Types ─────────────────────────────────────────────── */
interface VoterRow {
  id: number
  name: string
  voter_id: string
  father_name?: string
  phone?: string
  phone2?: string
  alt_phoneno2?: string
  alt_phoneno3?: string
  address?: string
  booth: number
  booth_name?: string
  age?: number | null
  gender?: string
}

interface BoothOption {
  id: number
  number: string
  name: string
  panchayat_name?: string
  constituency_name?: string
}

interface FamilyGroup {
  key: string
  familyNo: number
  boothId: number
  boothNumber: string
  boothName: string
  address: string
  panchayat: string
  constituency: string
  members: VoterRow[]
}

/* ── Helpers ───────────────────────────────────────────── */
const PAGE_SIZE = 20

const normalizeAddress = (addr?: string) =>
  (addr ?? '').trim().toLowerCase().replace(/[,.\-\/\\]+/g, ' ').replace(/\s+/g, ' ')

const genderLabel = (g?: string) =>
  g === 'm' || g === 'Male'   ? 'Male'   :
  g === 'f' || g === 'Female' ? 'Female' :
  g === 'o' || g === 'Other'  ? 'Other'  : '—'

/* ── Booth multi-select (reused pattern from AssignTelecalling) ── */
function BoothMultiSelect({
  booths, selected, onChange,
}: {
  booths: BoothOption[]
  selected: Set<number>
  onChange: (next: Set<number>) => void
}) {
  const [open, setOpen] = useState(false)
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
    selected.size === 0 ? 'Select Booth(s)' :
    firstBooth ? `${firstBooth.number} — ${firstBooth.name}` :
    `${selected.size} booths selected`

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`${selectCls} w-[260px] flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${selected.size === 0 ? 'text-muted' : 'text-heading'}`}>{label}</span>
        <i className={`ph ${open ? 'ph-caret-up' : 'ph-caret-down'} text-[11px] text-muted flex-shrink-0`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-[300px] bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <input autoFocus type="text" placeholder="Search booth..." value={search}
              onChange={e => setSearch(e.target.value)} className={`${inputCls} w-full`} />
          </div>
          <label className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-surface-alt cursor-pointer text-[11px] font-semibold text-muted">
            <input type="checkbox" className="w-4 h-4 rounded border-2 border-border cursor-pointer accent-navy"
              checked={selected.size === booths.length && booths.length > 0}
              onChange={() => selected.size === booths.length ? onChange(new Set()) : onChange(new Set(booths.map(b => b.id)))} />
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
              ))}
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
export default function FamilyMapping() {
  const { showToast } = useToast()

  /* ── Master data ── */
  const [booths, setBooths] = useState<BoothOption[]>([])
  const [filterBooths, setFilterBooths] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  /* ── Voter data ── */
  const [voters, setVoters] = useState<VoterRow[]>([])
  const [loading, setLoading] = useState(false)

  /* ── Pagination ── */
  const [page, setPage] = useState(1)

  /* ── Modal ── */
  const [viewFamily, setViewFamily] = useState<FamilyGroup | null>(null)

  /* ── Fetch booths on mount ── */
  useEffect(() => {
    apiClient.get('/masters/booths/', { params: { limit: 500 } })
      .then(r => setBooths(r.data.results ?? []))
      .catch(() => {})
  }, [])

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  /* ── Fetch voters when booths change ── */
  /* Paginate: the API returns at most `limit` rows; we keep asking until we
     have everything so the family grouping operates on the full dataset. */
  useEffect(() => {
    if (filterBooths.size === 0) {
      setVoters([])
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const boothParam = [...filterBooths].join(',')
    const PAGE = 2000

    const fetchAll = async () => {
      let collected: VoterRow[] = []
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const r = await apiClient.get('/voters/voters/', {
          params: { booth: boothParam, limit: PAGE, offset },
          signal: controller.signal,
        })
        const results = r.data.results ?? r.data ?? []
        const rows: VoterRow[] = results.map((v: any) => ({
          id: v.id, name: v.name ?? '', voter_id: v.voter_id ?? '',
          father_name: v.father_name ?? '',
          phone: v.phone ?? '', phone2: v.phone2 ?? '',
          alt_phoneno2: v.alt_phoneno2 ?? '', alt_phoneno3: v.alt_phoneno3 ?? '',
          address: v.address ?? '', booth: v.booth,
          booth_name: v.booth_name ?? '',
          age: v.age, gender: v.gender ?? '',
        }))
        collected = collected.concat(rows)
        offset += PAGE
        hasMore = rows.length === PAGE && (r.data.next != null)
      }
      return collected
    }

    fetchAll()
      .then(all => setVoters(all))
      .catch(err => {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED')
          showToast('Failed to load voters', 'error')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [filterBooths])

  /* ── Build booth lookup ── */
  const boothMap = useMemo(() => {
    const m = new Map<number, BoothOption>()
    booths.forEach(b => m.set(b.id, b))
    return m
  }, [booths])

  /* ── Group voters into families ── */
  const families = useMemo(() => {
    const groups = new Map<string, VoterRow[]>()
    for (const v of voters) {
      const norm = normalizeAddress(v.address)
      if (!norm) continue                 // skip voters without address
      const key = `${v.booth}::${norm}`
      const list = groups.get(key) ?? []
      list.push(v)
      groups.set(key, list)
    }

    // Only keep groups with 2+ members (actual family grouping)
    const result: FamilyGroup[] = []
    let familyNo = 0
    const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
    for (const [key, members] of sorted) {
      if (members.length < 2) continue
      familyNo++
      const booth = boothMap.get(members[0].booth)
      result.push({
        key,
        familyNo,
        boothId: members[0].booth,
        boothNumber: booth?.number ?? '',
        boothName: booth?.name ?? '',
        address: members[0].address ?? '',
        panchayat: booth?.panchayat_name ?? '',
        constituency: booth?.constituency_name ?? '',
        members: members.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
      })
    }
    return result
  }, [voters, boothMap])

  /* ── Filter families by search ── */
  const filteredFamilies = useMemo(() => {
    if (!debouncedSearch) return families
    const q = debouncedSearch.toLowerCase()
    return families.filter(f =>
      f.address.toLowerCase().includes(q) ||
      f.boothNumber.includes(q) ||
      f.boothName.toLowerCase().includes(q) ||
      f.members.some(m =>
        m.name.toLowerCase().includes(q) ||
        m.voter_id.toLowerCase().includes(q) ||
        (m.phone ?? '').includes(q)
      )
    )
  }, [families, debouncedSearch])

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filteredFamilies.length / PAGE_SIZE))
  const paged = filteredFamilies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageStart = (page - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(page * PAGE_SIZE, filteredFamilies.length)
  const goTo = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)))
  useEffect(() => { setPage(1) }, [debouncedSearch, filterBooths])

  const pageNumbers: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  })()

  const singlesCount = voters.filter(v => {
    const norm = normalizeAddress(v.address)
    if (!norm) return false
    const key = `${v.booth}::${norm}`
    return !families.some(f => f.key === key)
  }).length

  /* ════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════ */
  return (
    <div className="page-enter space-y-5">
      <div className="bg-surface rounded-card shadow-card overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <i className="ph ph-house-line text-[18px] text-navy" />
            <div>
              <h2 className="text-[14px] font-bold text-heading">Family Mapping</h2>
              <p className="text-[11px] text-muted">
                Voters grouped by booth + address into family units
                {families.length > 0 && (
                  <span className="ml-1 font-semibold text-navy">
                    · {families.length.toLocaleString('en-IN')} families
                    · {families.reduce((s, f) => s + f.members.length, 0).toLocaleString('en-IN')} members
                  </span>
                )}
                {singlesCount > 0 && (
                  <span className="ml-1 text-muted">· {singlesCount} single-member (not shown)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 px-5 py-3 bg-surface-alt border-b border-border">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Booth</label>
            <BoothMultiSelect booths={booths} selected={filterBooths}
              onChange={next => { setFilterBooths(next); setPage(1) }} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Search</label>
            <div className="relative">
              <i className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted pointer-events-none" />
              <input type="text" placeholder="Name, voter ID, address..."
                value={search} onChange={e => setSearch(e.target.value)}
                className={`${inputCls} pl-7 w-[220px]`} />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                  <i className="ph ph-x text-[11px]" />
                </button>
              )}
            </div>
          </div>

          {(filterBooths.size > 0 || search) && (
            <button onClick={() => { setFilterBooths(new Set()); setSearch('') }}
              className="self-end flex items-center gap-1.5 px-3 py-[7px] rounded-lg
                         border border-rose-200 bg-rose-50 text-rose-500 text-[11px] font-medium
                         hover:bg-rose-100 transition-colors">
              <i className="ph ph-x text-[12px]" /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-surface-alt border-b border-border text-left">
                {['#', 'Family', 'Booth No', 'Address', 'Panchayat / Constituency', 'Members', 'Action'].map(h => (
                  <th key={h} className="px-3 py-[10px] text-[10px] font-bold uppercase tracking-wide text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">
                  <i className="ph ph-spinner-gap animate-spin mr-2" />Loading voters...
                </td></tr>
              ) : filterBooths.size === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <i className="ph ph-house-line text-[32px] text-border block mb-2" />
                  <p className="text-[12px] text-muted">Select booth(s) to view family groups.</p>
                </td></tr>
              ) : filteredFamilies.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <i className="ph ph-house-line text-[32px] text-border block mb-2" />
                  <p className="text-[12px] text-muted">
                    {families.length === 0
                      ? 'No family groups found. Voters need matching booth + address to form families.'
                      : 'No families match your search.'}
                  </p>
                </td></tr>
              ) : (
                paged.map((f, idx) => (
                  <tr key={f.key}
                    className="border-b border-border hover:bg-surface-alt transition-colors">
                    <td className="px-3 py-[9px] text-muted text-[11px]">{pageStart + idx}</td>
                    <td className="px-3 py-[9px]">
                      <span className="font-semibold text-heading">Family {f.familyNo}</span>
                    </td>
                    <td className="px-3 py-[9px]">
                      <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-medium">
                        {f.boothNumber}
                      </span>
                    </td>
                    <td className="px-3 py-[9px] max-w-[260px]">
                      <span className="text-heading truncate block">{f.address}</span>
                    </td>
                    <td className="px-3 py-[9px] text-muted text-[11px]">
                      {[f.panchayat, f.constituency].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-3 py-[9px]">
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                        {f.members.length} members
                      </span>
                    </td>
                    <td className="px-3 py-[9px]">
                      <button onClick={() => setViewFamily(f)}
                        className="flex items-center gap-1.5 px-3 py-[5px] rounded-lg text-[11px] font-semibold
                                   border bg-white text-navy border-navy/30 hover:bg-navy/5 transition-colors">
                        <i className="ph ph-eye text-[12px]" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredFamilies.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-2 border-t border-border bg-surface-alt text-[11px] text-muted flex-wrap gap-2">
            <span className="font-medium">
              {pageStart}–{pageEnd} <span className="font-normal">of {filteredFamilies.length.toLocaleString('en-IN')} families</span>
            </span>
            <div className="flex items-center gap-1">
              {[{ label: '\u00AB', go: 1 }, { label: '\u2039', go: page - 1 }].map(({ label, go }) => (
                <button key={label} onClick={() => goTo(go)} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-border disabled:opacity-30">{label}</button>
              ))}
              {pageNumbers.map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="w-7 text-center">...</span>
                  : <button key={p} onClick={() => goTo(p as number)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-[11px] font-semibold
                        ${page === p ? 'bg-navy text-white' : 'hover:bg-border'}`}>{p}</button>
              )}
              {[{ label: '\u203A', go: page + 1 }, { label: '\u00BB', go: totalPages }].map(({ label, go }) => (
                <button key={label} onClick={() => goTo(go)} disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-border disabled:opacity-30">{label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Family Detail Modal ── */}
      {viewFamily && (
        <div className="fixed inset-0 z-[120] bg-black/45 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setViewFamily(null) }}>
          <div className="w-full max-w-[800px] max-h-[85vh] bg-white rounded-xl shadow-2xl border border-border overflow-hidden">

            {/* Modal header */}
            <div className="px-5 py-3 border-b border-border bg-surface-alt flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                <i className="ph ph-house-line text-[18px] text-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-heading">Family {viewFamily.familyNo}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted flex-wrap">
                  <span><i className="ph ph-map-pin mr-0.5" />Booth {viewFamily.boothNumber} — {viewFamily.boothName}</span>
                  <span><i className="ph ph-house mr-0.5" />{viewFamily.address}</span>
                  {viewFamily.panchayat && <span><i className="ph ph-tree-structure mr-0.5" />{viewFamily.panchayat}</span>}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold flex-shrink-0">
                {viewFamily.members.length} members
              </span>
              <button onClick={() => setViewFamily(null)}
                className="w-7 h-7 rounded-lg hover:bg-border text-muted hover:text-heading transition-colors flex-shrink-0">
                <i className="ph ph-x text-[14px]" />
              </button>
            </div>

            {/* Members table */}
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-surface-alt border-b border-border text-left sticky top-0">
                    {['#', 'Voter Name', 'Voter ID', 'Father Name', 'Age', 'Gender', 'Mobile'].map(h => (
                      <th key={h} className="px-3 py-[10px] text-[10px] font-bold uppercase tracking-wide text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewFamily.members.map((m, idx) => {
                    const phones = [m.phone, m.phone2, m.alt_phoneno2, m.alt_phoneno3].filter(Boolean)
                    return (
                      <tr key={m.id} className="border-b border-border hover:bg-surface-alt transition-colors">
                        <td className="px-3 py-[9px] text-muted text-[11px]">{idx + 1}</td>
                        <td className="px-3 py-[9px] font-semibold text-heading">{m.name}</td>
                        <td className="px-3 py-[9px] text-muted font-mono text-[11px]">{m.voter_id}</td>
                        <td className="px-3 py-[9px] text-muted">{m.father_name || '—'}</td>
                        <td className="px-3 py-[9px] text-muted">{m.age ?? '—'}</td>
                        <td className="px-3 py-[9px] text-muted">{genderLabel(m.gender)}</td>
                        <td className="px-3 py-[9px]">
                          {phones.length === 0 ? <span className="text-muted">—</span> : (
                            <div className="flex flex-col gap-[2px]">
                              {phones.map((p, i) => (
                                <span key={i} className="text-[11px] font-mono text-heading">{p}</span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
