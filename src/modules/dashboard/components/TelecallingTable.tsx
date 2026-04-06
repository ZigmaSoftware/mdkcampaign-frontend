import { useEffect, useMemo, useState } from 'react'

import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'
import type { TelecallerEfficiencyRow } from '../services/dashboardApi'

interface TelecallingTableProps {
  rows: TelecallerEfficiencyRow[]
}

function metricClass(value: number) {
  if (value >= 70) return 'text-kampgreen'
  if (value >= 40) return 'text-saffron-dark'
  return 'text-kampr'
}

export default function TelecallingTable({ rows }: TelecallingTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    setPage(1)
  }, [rows, pageSize])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pagedRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  )

  return (
    <Card
      title="Telecaller Efficiency"
      icon="ph ph-headset"
      headerRight={<Badge label={`${rows.length} telecallers`} variant="blue" />}
      bodyClass="p-0"
      className="mb-0"
    >
      {rows.length === 0 ? (
        <div className="px-[18px] py-[18px] text-[11px] text-muted italic">
          No telecaller activity found for the current filter scope.
        </div>
      ) : (
        <>
          <div className="border-b border-border bg-[#f8fafc] px-[18px] py-[10px] text-[10px] text-muted">
            Score = 55% Reach + 25% Positive + 20% Follow-up Not Required
          </div>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-[11px]">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Telecaller</th>
                  <th className="text-right">Assigned</th>
                  <th className="text-right">Surveyed</th>
                  <th className="text-right">Reach</th>
                  <th className="text-right">Positive</th>
                  <th className="text-right">F/U Not Required</th>
                  <th className="text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map(row => (
                  <tr key={`${row.telecaller_id ?? row.telecaller_name}-${row.rank}`}>
                    <td>
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#e8f4fd] text-[#0e6aad] font-bold">
                        {row.rank}
                      </span>
                    </td>
                    <td>
                      <div className="font-bold text-navy">{row.telecaller_name || 'Unassigned'}</div>
                      <div className="text-[10px] text-muted">
                        {row.role || 'General Volunteer'}
                        {row.phone ? ` · ${row.phone}` : ''}
                        {row.assigned_booths ? ` · ${row.assigned_booths} booths` : ''}
                      </div>
                    </td>
                    <td className="text-right">{row.assigned_voters.toLocaleString('en-IN')}</td>
                    <td className="text-right">{row.surveyed_voters.toLocaleString('en-IN')}</td>
                    <td className={`text-right font-bold ${metricClass(row.reach_pct)}`}>{row.reach_pct}%</td>
                    <td className={`text-right font-bold ${metricClass(row.positive_pct)}`}>{row.positive_pct}%</td>
                    <td className={`text-right font-bold ${metricClass(row.followup_not_required_pct)}`}>{row.followup_not_required_pct}%</td>
                    <td className="text-right font-extrabold text-navy">{row.efficiency_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-[18px] py-[12px]">
            <span className="text-[10px] text-muted">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={String(pageSize)}
                onChange={e => setPageSize(parseInt(e.target.value, 10))}
                className="form-input py-[4px] text-[10px] min-w-[88px]"
              >
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
              </select>
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-2 py-[4px] text-[10px] font-bold rounded border border-border text-muted disabled:opacity-40 hover:text-navy hover:border-saffron transition-all"
              >
                Prev
              </button>
              <span className="text-[10px] font-semibold text-navy">
                {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-2 py-[4px] text-[10px] font-bold rounded border border-border text-muted disabled:opacity-40 hover:text-navy hover:border-saffron transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
