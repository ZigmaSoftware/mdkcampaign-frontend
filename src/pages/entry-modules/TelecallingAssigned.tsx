import { useState, useEffect } from 'react'
import apiClient from '../../utils/api'

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

  useEffect(() => {
    setLoading(true)
    apiClient.get('/telecalling/assignments/', { params: { limit: 500 } })
      .then(r => setAssignments(r.data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalVoters = assignments.reduce((s, a) => s + a.voters.length, 0)

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

        {/* Body */}
        {loading ? (
          <div className="px-5 py-16 text-center text-muted">
            <i className="ph ph-spinner-gap animate-spin text-[28px] block mb-2" />
            Loading assignments…
          </div>
        ) : assignments.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <i className="ph ph-phone-outgoing text-[36px] text-border block mb-3" />
            <p className="text-[13px] font-semibold text-heading mb-1">No assignments yet</p>
            <p className="text-[12px] text-muted">
              Go to <strong>Assign Telecalling</strong> tab, select voters and assign them to a telecaller.
            </p>
          </div>
        ) : (
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
                  <td className="px-5 py-3 text-muted">{idx + 1}</td>

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

                  <td className="px-4 py-3 text-muted">{a.assigned_date}</td>

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
        )}
      </div>
    </div>
  )
}
