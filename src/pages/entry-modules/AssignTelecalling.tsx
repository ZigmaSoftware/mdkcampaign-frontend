import React, { useState, useEffect, useCallback, useRef } from 'react'
import apiClient from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { inputCls, selectCls } from '../../components/entry/FormGroup'
import { addGroup, getGroups, subscribe } from '../../utils/telecallingStore'

/* ─── Types ──────────────────────────────────────────────── */
interface VoterRow {
  id: number
  name: string
  voter_id: string
  phone?: string
  address?: string
  booth: number
  booth_name?: string
  age?: number
  gender?: string
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


/* ─── Constants ──────────────────────────────────────────── */
const PAGE_SIZE = 20
const genderLabel = (g?: string) => g === 'm' ? 'Male' : g === 'f' ? 'Female' : g === 'o' ? 'Other' : '—'

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

  const [filterBooths,     setFilterBooths]     = useState<Set<number>>(new Set())
  const [filterTelecaller, setFilterTelecaller] = useState('')
  const [filterDate,       setFilterDate]       = useState('')
  const [filterSearch,     setFilterSearch]     = useState('')

  const [voters,    setVoters]    = useState<VoterRow[]>([])
  const rawVotersRef              = useRef<VoterRow[]>([])  // unfiltered API results for current page
  const [rawCount,  setRawCount]  = useState(0)   // API total before client-side filter
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(false)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [assignTo, setAssignTo] = useState('')

  /* Assigned voter IDs — kept in a ref so fetchVoters doesn't need it as a dep */
  const assignedIdsRef = useRef<Set<number>>(
    new Set(getGroups().flatMap(g => g.voters.map(v => v.id)))
  )
  const [assignedVoterIds, setAssignedVoterIds] = useState<Set<number>>(assignedIdsRef.current)

  useEffect(() => subscribe(() => {
    const next = new Set(getGroups().flatMap(g => g.voters.map(v => v.id)))
    assignedIdsRef.current = next
    setAssignedVoterIds(next)
    /* Re-filter current page's voters immediately after assignment */
    setVoters(rawVotersRef.current.filter(v => !next.has(v.id) && !!v.phone))
  }), [])

  /* ── Fetch masters ── */
  useEffect(() => {
    apiClient.get('/masters/booths/', { params: { limit: 500 } })
      .then(r => setBooths(r.data.results ?? []))
      .catch(() => {})

    apiClient.get('/volunteers/volunteers/', { params: { role: 'Telecalling', limit: 500, status: 'active' } })
      .then(r => {
        const rows = (r.data.results ?? []) as any[]
        setTelecallers(
          rows
            .filter(v => (v.role ?? '').toLowerCase() === 'telecalling')
            .map(v => ({ id: v.id, name: v.name ?? v.user_name ?? `Vol #${v.id}`, phone: v.phone }))
        )
      })
      .catch(() => {})
  }, [])

  /* ── Fetch voters (auto-advances page if all on current page are assigned) ── */
  const doFetch = useCallback((targetPage: number, boothSet: Set<number>, date: string, search: string) => {
    setLoading(true)
    setSelected(new Set())

    const params: Record<string, any> = {
      limit:  PAGE_SIZE,
      offset: (targetPage - 1) * PAGE_SIZE,
    }
    if (boothSet.size === 1) params.booth = [...boothSet][0]
    else if (boothSet.size > 1) params.booth = [...boothSet].join(',')
    if (date)   params.created_date = date
    if (search) params.search       = search

    apiClient.get('/voters/voters/', { params })
      .then(r => {
        const apiCount = r.data.count ?? 0
        const all: VoterRow[] = (r.data.results ?? []).map((v: any) => ({
          id: v.id, name: v.name, voter_id: v.voter_id,
          phone: v.phone ?? '', address: v.address ?? '',
          booth: v.booth, booth_name: v.booth_name ?? v.booth_number ?? '',
          age: v.age, gender: v.gender,
        }))

        rawVotersRef.current = all
        const filtered = all.filter(v => !assignedIdsRef.current.has(v.id) && !!v.phone)
        const tp = Math.max(1, Math.ceil(apiCount / PAGE_SIZE))

        /* If this page is fully assigned and there are more pages, auto-skip ahead */
        if (filtered.length === 0 && all.length > 0 && targetPage < tp) {
          setPage(targetPage + 1)
          doFetch(targetPage + 1, boothSet, date, search)
          return
        }

        setPage(targetPage)
        setRawCount(apiCount)
        setVoters(filtered)
        setTotal(apiCount)
      })
      .catch(() => showToast('Failed to load voters', 'error'))
      .finally(() => setLoading(false))
  }, [])

  /* Trigger fetch whenever page, booths, date, or search change */
  useEffect(() => { doFetch(page, filterBooths, filterDate, filterSearch) }, [page, filterBooths, filterDate, filterSearch])

  /* Already filtered at fetch time — no need to re-filter */
  const visibleVoters = voters
  const isAllSelected = visibleVoters.length > 0 && visibleVoters.every(v => selected.has(v.id))

  const toggleAll = () => {
    const next = new Set(selected)
    if (isAllSelected) visibleVoters.forEach(v => next.delete(v.id))
    else               visibleVoters.forEach(v => next.add(v.id))
    setSelected(next)
  }
  const toggleOne = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  /* ── Assign ── */
  const handleAssign = () => {
    if (!assignTo)           { showToast('Select a telecalling person', 'error'); return }
    if (selected.size === 0) { showToast('Select at least one voter', 'error');   return }

    const telecaller = telecallers.find(t => String(t.id) === assignTo)
    if (!telecaller) { showToast('Telecaller not found — please re-select', 'error'); return }

    const date        = filterDate || new Date().toISOString().slice(0, 10)
    const voterIds    = Array.from(selected)
    const groupVoters = voters.filter(v => selected.has(v.id))

    /* Push to shared store — also triggers assignedVoterIds sync via subscription */
    addGroup({ id: `${assignTo}-${Date.now()}`, telecaller, voters: groupVoters, date })
    setSelected(new Set())
    showToast(`${voterIds.length} voter(s) assigned to ${telecaller.name}`, 'success')

    /* Try backend — silent fail if endpoint not ready */
    apiClient.post('/telecalling/assignments/', {
      telecaller_id: Number(assignTo),
      voter_ids:     voterIds,
      assigned_date: date,
    }).catch(() => {})
  }

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageStart  = (page - 1) * PAGE_SIZE + 1
  const pageEnd    = Math.min(page * PAGE_SIZE, total)
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

  const applyBooths  = (next: Set<number>) => { setFilterBooths(next);  setPage(1) }
  const applyDate    = (v: string)          => { setFilterDate(v);      setPage(1) }
  const applySearch  = (v: string)          => { setFilterSearch(v);    setPage(1) }
  const clearAll     = () => { setFilterBooths(new Set()); setFilterDate(''); setFilterTelecaller(''); setFilterSearch(''); setPage(1) }
  const hasFilters   = filterBooths.size > 0 || !!filterDate || !!filterTelecaller || !!filterSearch
  const assignName  = telecallers.find(t => String(t.id) === assignTo)?.name ?? ''

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
                Select voters and assign to a telecalling volunteer
                {rawCount > 0 && <span className="ml-1 font-semibold text-navy">· {rawCount.toLocaleString('en-IN')} voters</span>}
                {assignedVoterIds.size > 0 && <span className="ml-1 text-rose-400 font-medium">· {assignedVoterIds.size} assigned</span>}
              </p>
            </div>
          </div>

          {/* Telecalling person — top right */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted whitespace-nowrap">Telecalling Person</span>
            <select value={filterTelecaller} onChange={e => setFilterTelecaller(e.target.value)}
              className={`${selectCls} w-[190px]`}>
              <option value="">All Telecallers</option>
              {telecallers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Filter + assign row */}
        <div className="flex flex-wrap items-end gap-3 px-5 py-3 bg-surface-alt border-b border-border">

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Search</label>
            <div className="relative">
              <i className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Name or Voter ID…"
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

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Date</label>
            <input type="date" value={filterDate} onChange={e => applyDate(e.target.value)}
              className={`${inputCls} w-[155px]`} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">Booth</label>
            <BoothMultiSelect booths={booths} selected={filterBooths} onChange={applyBooths} />
          </div>

          <div className="w-px self-stretch bg-border mx-1" />

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Assign To
              {selected.size > 0 && <span className="ml-1 normal-case text-navy font-semibold">({selected.size} selected)</span>}
            </label>
            <div className="flex items-stretch rounded-lg overflow-hidden border border-border shadow-sm">
              <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                className="text-[12px] px-3 py-[7px] bg-surface text-heading outline-none min-w-[180px] cursor-pointer">
                <option value="">Select Telecaller…</option>
                {telecallers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.phone ? ` · ${t.phone}` : ''}</option>
                ))}
              </select>
              <button onClick={handleAssign} disabled={selected.size === 0 || !assignTo}
                className="px-4 py-[7px] bg-navy text-white text-[12px] font-semibold border-l border-white/20
                           disabled:opacity-40 hover:bg-navy/90 transition-colors whitespace-nowrap">
                <i className="ph ph-check mr-1" />
                Assign
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
                    checked={isAllSelected} onChange={toggleAll} />
                </th>
                {['#', 'Voter Name', 'Voter ID', 'Phone', 'Age / Gender', 'Booth', 'Address'].map(h => (
                  <th key={h} className="px-3 py-[10px] text-[10px] font-bold uppercase tracking-wide text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted">
                  <i className="ph ph-spinner-gap animate-spin mr-2" />Loading voters…
                </td></tr>
              ) : visibleVoters.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <i className="ph ph-users-three text-[32px] text-border block mb-2" />
                  <p className="text-[12px] text-muted">
                    {rawCount === 0
                      ? (filterBooths.size > 0 ? 'No voters found for selected booth(s).' : 'No voters found.')
                      : 'All voters have been assigned.'}
                  </p>
                </td></tr>
              ) : (
                visibleVoters.map((v, idx) => (
                  <tr key={v.id} onClick={() => toggleOne(v.id)}
                    className={`border-b border-border cursor-pointer transition-colors
                      ${selected.has(v.id) ? 'bg-blue-50' : 'hover:bg-surface-alt'}`}>
                    <td className="px-4 py-[9px]" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="w-4 h-4 rounded border-2 border-border cursor-pointer accent-navy"
                        checked={selected.has(v.id)} onChange={() => toggleOne(v.id)} />
                    </td>
                    <td className="px-3 py-[9px] text-muted text-[11px]">{pageStart + idx}</td>
                    <td className="px-3 py-[9px] font-semibold text-heading">{v.name}</td>
                    <td className="px-3 py-[9px] text-muted font-mono text-[11px]">{v.voter_id}</td>
                    <td className="px-3 py-[9px]">{v.phone || '—'}</td>
                    <td className="px-3 py-[9px] text-muted">{v.age ?? '—'} / {genderLabel(v.gender)}</td>
                    <td className="px-3 py-[9px]">
                      {v.booth_name
                        ? <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-medium">{v.booth_name}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-[9px] text-muted truncate max-w-[180px]">{v.address || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-5 py-2 border-t border-border bg-surface-alt text-[11px] text-muted flex-wrap gap-2">
            <span className="font-medium">{pageStart}–{pageEnd} <span className="font-normal">of {total.toLocaleString('en-IN')} voters</span></span>
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
          </div>
        )}
      </div>

      {/* Floating confirm bar */}
      {selected.size > 0 && assignName && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-navy text-white
                        px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10">
          <i className="ph ph-users text-saffron text-[15px]" />
          <span className="text-[12px]">
            <strong className="text-saffron">{selected.size}</strong> voter(s) → <strong>{assignName}</strong>
          </span>
          <button onClick={handleAssign}
            className="bg-saffron text-navy px-4 py-1.5 rounded-lg text-[12px] font-bold
                       hover:bg-saffron/90 transition-colors">
            <i className="ph ph-check mr-1" />
            Confirm
          </button>
          <button onClick={() => setSelected(new Set())} className="text-white/50 hover:text-white">
            <i className="ph ph-x text-[14px]" />
          </button>
        </div>
      )}
    </div>
  )
}
