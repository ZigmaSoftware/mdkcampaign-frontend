import React, { useState, useEffect } from 'react'
import { getGroups, subscribe, type AssignmentGroup } from '../../utils/telecallingStore'

/* ─── Print ──────────────────────────────────────────────── */
function esc(s: string | number | undefined) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function printAssignment(group: AssignmentGroup) {
  const rows = group.voters.map((v, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(v.name)}</td>
      <td>${esc(v.voter_id)}</td>
      <td>${esc(v.phone) || '—'}</td>
      <td>${esc(v.booth_name) || esc(v.booth)}</td>
      <td>${esc(v.address) || '—'}</td>
      <td class="remarks-col">
        <div class="two-col">
          <div class="remark-group">
            <div class="remark-label">Voter Support Level</div>
            <label><input type="checkbox"> Strong Support</label>
            <label><input type="checkbox"> Leaning Support</label>
            <label><input type="checkbox"> Neutral</label>
            <label><input type="checkbox"> Leaning Against</label>
            <label><input type="checkbox"> Strong Against</label>
            <label><input type="checkbox"> Undecided</label>
          </div>
          <div class="remark-group">
            <div class="remark-label">Response Status</div>
            <label><input type="checkbox"> Interested</label>
            <label><input type="checkbox"> Not Reach</label>
            <label><input type="checkbox"> Not Attend Call</label>
            <label><input type="checkbox"> Need Followup</label>
          </div>
        </div>
      </td>
    </tr>`).join('')

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head>
    <title>Telecalling – ${esc(group.telecaller.name)}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;padding:24px;color:#1e293b}
      h2{color:#0d2455;border-bottom:2px solid #FF9933;padding-bottom:6px;margin-bottom:4px}
      .meta{font-size:10px;color:#64748b;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{background:#0d2455;color:#fff;padding:7px 9px;text-align:left;font-size:10px}
      td{padding:6px 9px;border-bottom:1px solid #e2e8f0;font-size:10px;vertical-align:top}
      tr:nth-child(even) td{background:#f8faff}
      .remarks-col{min-width:260px}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
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
      Telecaller: <strong>${esc(group.telecaller.name)}</strong>
      ${group.telecaller.phone ? ' &middot; ' + esc(group.telecaller.phone) : ''}
      &middot; Date: ${esc(group.date)}
      &middot; ${group.voters.length} voters
      &middot; Printed: ${new Date().toLocaleString('en-IN')}
    </p>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Name</th><th>Voter ID</th><th>Phone</th>
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
  const [groups, setGroups] = useState<AssignmentGroup[]>(getGroups())

  /* Stay in sync with the store */
  useEffect(() => subscribe(() => setGroups(getGroups())), [])

  const totalVoters = groups.reduce((s, g) => s + g.voters.length, 0)

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
                Voters assigned to telecallers this session
                {totalVoters > 0 && (
                  <span className="ml-1 font-semibold text-navy">· {totalVoters} voters</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {groups.length === 0 ? (
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
              {groups.map((group, idx) => (
                <tr key={group.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
                  <td className="px-5 py-3 text-muted">{idx + 1}</td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <i className="ph ph-phone-outgoing text-green-600 text-[13px]" />
                      </div>
                      <div>
                        <p className="font-semibold text-heading">{group.telecaller.name}</p>
                        {group.telecaller.phone && (
                          <p className="text-[11px] text-muted">{group.telecaller.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                                     bg-green-100 text-green-700 text-[11px] font-bold">
                      <i className="ph ph-users text-[11px]" />
                      {group.voters.length} voters
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted">{group.date}</td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => printAssignment(group)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg
                                 bg-navy text-white text-[11px] font-semibold
                                 hover:bg-navy/90 transition-colors"
                    >
                      <i className="ph ph-printer text-[13px]" />
                      Print
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
