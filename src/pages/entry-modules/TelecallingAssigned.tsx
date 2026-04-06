import { useState, useEffect } from 'react'
import apiClient from '../../utils/api'

interface ApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
  total_voters?: number
}

/* ─── Types ──────────────────────────────────────────────── */
interface AssignmentVoter {
  id:           number
  voter:        number | null
  voter_name:   string
  voter_id_no:  string
  phone:        string
  phone2?:      string
  alt_phoneno2?: string
  alt_phoneno3?: string
  address:      string
  booth_name:   string
  age:          number | null
  gender:       string
}

interface Assignment {
  id:               number
  telecaller_id:    number | null
  telecaller_name:  string
  telecaller_phone: string
  assigned_date:    string
  voters:           AssignmentVoter[]
  created_at:       string
}

function formatAssignedDateTime(assignment: Assignment) {
  const time = assignment.created_at.match(/(\d{2}:\d{2}:\d{2})/)?.[1]
  if (!time) return assignment.assigned_date
  return `${assignment.assigned_date} ${time}`
}

/* ─── Print helpers ──────────────────────────────────────── */
function esc(s: string | number | undefined) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function normalizeAddress(address?: string) {
  return (address ?? '').trim()
}

function openPrintWindow(
  a: Assignment,
  voterDetailsMap: Record<number, { phones: string[]; address: string }>
) {
  const sortedVoters = [...a.voters].sort((left, right) => {
    const leftAddress = normalizeAddress(
      left.voter ? voterDetailsMap[left.voter]?.address : left.address
    ) || normalizeAddress(left.address)
    const rightAddress = normalizeAddress(
      right.voter ? voterDetailsMap[right.voter]?.address : right.address
    ) || normalizeAddress(right.address)

    const leftBlank = leftAddress === ''
    const rightBlank = rightAddress === ''
    if (leftBlank !== rightBlank) return leftBlank ? 1 : -1

    const byAddress = leftAddress.localeCompare(rightAddress, 'en', { sensitivity: 'base' })
    if (byAddress !== 0) return byAddress
    return left.id - right.id
  })

  const rows = sortedVoters.map((v, i) => {
    /* Use fresh phones/address from API; fall back to stored values */
    const fresh   = v.voter ? voterDetailsMap[v.voter] : undefined
    const stored  = [v.phone, v.phone2, v.alt_phoneno2, v.alt_phoneno3].filter(Boolean) as string[]
    const phones  = fresh?.phones?.length ? fresh.phones : stored
    const address = normalizeAddress(fresh?.address) || normalizeAddress(v.address)
    const phonesHtml = phones.length
      ? phones.map(p => `<div>${esc(p)}</div>`).join('')
      : '—'
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(v.voter_name)}</td>
      <td>${esc(v.voter_id_no) || '—'}</td>
      <td>${phonesHtml}</td>
      <td>${esc(v.booth_name) || '—'}</td>
      <td>${esc(address) || '—'}</td>
      <td class="remarks-col">
        <div class="two-col">
          <div class="remark-group">
            <div class="remark-label">Voter Support Level</div>
            <label><input type="checkbox"> Positive</label>
            <label><input type="checkbox"> Negative</label>
            <label><input type="checkbox"> Neutral</label>
          </div>
          <div class="remark-group">
            <div class="remark-label">Response Status</div>
            <label><input type="checkbox"> Not Reach</label>
            <label><input type="checkbox"> No Answer</label>
            <label><input type="checkbox"> Need Followup</label>
            <label><input type="checkbox"> Wrong Number</label>
          </div>
          <div class="remark-group">
            <div class="remark-label">Aware of Candidate</div>
            <label><input type="checkbox"> Yes</label>
            <label><input type="checkbox"> No</label>
            <label><input type="checkbox"> Not Sure</label>
          </div>
          <div class="remark-group">
            <div class="remark-label">Likely to Vote</div>
            <label><input type="checkbox"> Yes</label>
            <label><input type="checkbox"> No</label>
            <label><input type="checkbox"> Not Sure</label>
          </div>
        </div>
      </td>
    </tr>`
  }).join('')

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head>
    <title>Telecalling – ${esc(a.telecaller_name)}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;padding:24px;color:#1e293b}
      h2{color:#0d2455;border-bottom:2px solid #FF9933;padding-bottom:6px;margin-bottom:4px}
      .meta{font-size:10px;color:#64748b;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{background:#0d2455;color:#fff;padding:7px 9px;text-align:left;font-size:10px}
      td{padding:6px 9px;border-bottom:1px solid #e2e8f0;font-size:10px;vertical-align:top}
      tr:nth-child(even) td{background:#f8faff}
      .remarks-col{min-width:360px}
      .two-col{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}
      .remark-group{display:flex;flex-direction:column;gap:3px}
      .remark-label{font-size:9px;font-weight:700;color:#0d2455;text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:3px;padding-bottom:2px;
                    border-bottom:1px solid #e2e8f0}
      label{display:flex;align-items:center;gap:5px;font-size:10px;cursor:pointer}
      input[type=checkbox]{width:11px;height:11px;flex-shrink:0}
      @media print{body{padding:16px}}
    </style>
  </head><body>
    <h2>Telecalling Assignment</h2>
    <p class="meta">
      Telecaller: <strong>${esc(a.telecaller_name)}</strong>
      ${a.telecaller_phone ? ' &middot; ' + esc(a.telecaller_phone) : ''}
      &middot; Date: ${esc(a.assigned_date)}
      &middot; ${a.voters.length} voters
      &middot; Printed: ${new Date().toLocaleString('en-IN')}
    </p>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Name</th><th>Voter ID</th><th>Phone Numbers</th>
          <th>Booth</th><th>Address</th><th>Remarks</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`)
  w.document.close()
  w.print()
}

/* ════════════════════════════════════════════════════════════
   Component
════════════════════════════════════════════════════════════ */
export default function TelecallingAssigned() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [printingId,  setPrintingId]  = useState<number | null>(null)
  const [filterTelecaller, setFilterTelecaller] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [telecallerOptions, setTelecallerOptions] = useState<{ id: string; name: string }[]>([])
  const [totalAssignments, setTotalAssignments] = useState(0)
  const [totalVoters, setTotalVoters] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    apiClient.get('/telecalling/assignments/filters/')
      .then(r => {
        const options = (r.data.telecallers ?? []).map((row: { id: number; name: string }) => ({
          id: String(row.id),
          name: row.name,
        }))
        setTelecallerOptions(options)
      })
      .catch(() => setTelecallerOptions([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    apiClient.get<ApiResponse<Assignment>>('/telecalling/assignments/', {
      params: {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        include_summary: 1,
        ...(filterTelecaller ? { telecaller: filterTelecaller } : {}),
        ...(filterDate ? { date: filterDate } : {}),
      },
    })
      .then(r => {
        setAssignments(r.data.results ?? [])
        setTotalAssignments(r.data.count ?? 0)
        setTotalVoters(r.data.total_voters ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterDate, filterTelecaller, page])

  useEffect(() => {
    setPage(1)
  }, [filterTelecaller, filterDate])

  const totalPages  = Math.max(1, Math.ceil(totalAssignments / PAGE_SIZE))
  const hasActiveFilters = !!filterTelecaller || !!filterDate
  const pageNums: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const nums: (number | '...')[] = [1]
    if (page > 3) nums.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i)
    if (page < totalPages - 2) nums.push('...')
    nums.push(totalPages)
    return nums
  })()

  /* Fetch fresh voter phone data, then open print window */
  const handlePrint = async (a: Assignment) => {
    setPrintingId(a.id)
    const voterIds = a.voters.map(v => v.voter).filter(Boolean) as number[]

    /* Fetch all voters in parallel */
    const results = await Promise.all(
      voterIds.map(id =>
        apiClient.get(`/voters/voters/${id}/`)
          .then(r => r.data)
          .catch(() => null)
      )
    )

    /* Build id → latest phone/address map */
    const voterDetailsMap: Record<number, { phones: string[]; address: string }> = {}
    results.forEach((v: any) => {
      if (!v) return
      const phones = [v.phone, v.phone2, v.alt_phoneno2, v.alt_phoneno3].filter(Boolean)
      voterDetailsMap[v.id] = {
        phones,
        address: v.address ?? '',
      }
    })

    setPrintingId(null)
    openPrintWindow(a, voterDetailsMap)
  }

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <i className="ph ph-clipboard-text text-[18px] text-navy" />
            <div>
              <h2 className="text-[14px] font-bold text-heading">Telecalling Assigned</h2>
              <p className="text-[11px] text-muted">
                Voters assigned to telecallers
                {totalVoters > 0 && (
                  <span className="ml-1 font-semibold text-navy">· {totalVoters} voters</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {!loading && assignments.length > 0 && (
          <div className="flex flex-wrap items-end gap-3 px-5 py-3 bg-surface-alt border-b border-border">
            <div className="min-w-[220px] flex-1 max-w-[280px]">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-muted mb-1">
                Telecalling Person
              </label>
              <select
                value={filterTelecaller}
                onChange={e => setFilterTelecaller(e.target.value)}
                className="w-full h-[38px] rounded-lg border border-border bg-white px-3 text-[12px] text-heading outline-none focus:border-navy"
              >
                <option value="">All telecalling persons</option>
                {telecallerOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-muted mb-1">
                Date
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full h-[38px] rounded-lg border border-border bg-white px-3 text-[12px] text-heading outline-none focus:border-navy"
              />
            </div>

            {(filterTelecaller || filterDate) && (
              <button
                type="button"
                onClick={() => {
                  setFilterTelecaller('')
                  setFilterDate('')
                }}
                className="h-[38px] px-4 rounded-lg border border-border bg-white text-[12px] font-semibold text-muted hover:border-navy hover:text-navy transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="px-5 py-16 text-center text-muted">
            <i className="ph ph-spinner-gap animate-spin text-[28px] block mb-2" />
            Loading assignments…
          </div>
        ) : totalAssignments === 0 ? (
          <div className="px-5 py-16 text-center">
            <i className={`text-[36px] text-border block mb-3 ${hasActiveFilters ? 'ph ph-funnel' : 'ph ph-phone-outgoing'}`} />
            {hasActiveFilters ? (
              <>
                <p className="text-[13px] font-semibold text-heading mb-1">No assignments match the selected filters</p>
                <p className="text-[12px] text-muted">
                  Change the telecalling person or date filter to see matching assignment rows.
                </p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-heading mb-1">No assignments yet</p>
                <p className="text-[12px] text-muted">
                  Go to <strong>Assign Telecalling</strong> tab, select voters and assign them to a telecaller.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-surface-alt border-b border-border text-left">
                  <th className="px-5 py-[10px] text-[10px] font-bold uppercase tracking-wide text-muted">#</th>
                  <th className="px-4 py-[10px] text-[10px] font-bold uppercase tracking-wide text-muted">Telecalling Person</th>
                  <th className="px-4 py-[10px] text-[10px] font-bold uppercase tracking-wide text-muted">Voters Assigned</th>
                  <th className="px-4 py-[10px] text-[10px] font-bold uppercase tracking-wide text-muted">Date</th>
                  <th className="px-4 py-[10px]" />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, idx) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
                    <td className="px-5 py-3 text-muted">{(page - 1) * PAGE_SIZE + idx + 1}</td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <i className="ph ph-phone-outgoing text-green-600 text-[13px]" />
                        </div>
                        <div>
                          <p className="font-semibold text-heading">{a.telecaller_name}</p>
                          {a.telecaller_phone && (
                            <p className="text-[11px] text-muted">{a.telecaller_phone}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                                       bg-green-100 text-green-700 text-[11px] font-bold">
                        <i className="ph ph-users text-[11px]" />
                        {a.voters.length} voters
                      </span>
                    </td>

                    <td className="px-4 py-3 text-muted">{formatAssignedDateTime(a)}</td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handlePrint(a)}
                        disabled={printingId === a.id}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg
                                   bg-navy text-white text-[11px] font-semibold
                                   hover:bg-navy/90 transition-colors disabled:opacity-60"
                      >
                        {printingId === a.id
                          ? <><i className="ph ph-spinner-gap animate-spin text-[13px]" />Loading…</>
                          : <><i className="ph ph-printer text-[13px]" />Print</>
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalAssignments > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-alt">
                <span className="text-[11px] text-muted">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalAssignments)} of {totalAssignments}
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
    </div>
  )
}
