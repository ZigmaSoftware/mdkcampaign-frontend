import { Fragment, useEffect, useMemo, useState } from 'react'

import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'
import type { UnifiedTaskRow } from '../services/taskDashboardApi'

interface TaskListTableProps {
  rows: UnifiedTaskRow[]
}

function formatDue(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadgeClasses(status: string) {
  if (status === 'completed') return { bg: '#dcfce7', color: '#138808' }
  if (status === 'cancelled') return { bg: '#fee2e2', color: '#dc2626' }
  return { bg: '#fff3e0', color: '#e07010' }
}

export default function TaskListTable({ rows }: TaskListTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setPage(1)
    setExpandedId(null)
  }, [rows, pageSize])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pagedRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  )

  return (
    <Card
      title="Unified Task List"
      icon="ph ph-list-checks"
      headerRight={<Badge label={`${rows.length} items`} variant="s" />}
      bodyClass="p-0"
      className="mb-0"
    >
      {rows.length === 0 ? (
        <div className="px-[18px] py-[18px] text-[11px] text-muted italic">
          No task rows for the current filter scope.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-[11px]">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Module</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map(row => {
                  const badge = statusBadgeClasses(row.status)
                  const expanded = expandedId === row.id
                  return (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => setExpandedId(prev => prev === row.id ? null : row.id)}
                        className={`cursor-pointer ${row.due_bucket === 'overdue' ? 'bg-[#fff7f7]' : ''}`}
                      >
                        <td>
                          <div className="font-semibold text-navy">{row.title}</div>
                          <div className="text-[10px] text-muted">
                            {row.due_bucket === 'overdue' ? 'Overdue' : row.due_bucket === 'today' ? 'Due today' : row.due_bucket === 'tomorrow' ? 'Due tomorrow' : 'Scheduled'}
                          </div>
                        </td>
                        <td>
                          <span className={`rounded-full px-2 py-[3px] text-[9px] font-bold ${row.module === 'campaign' ? 'bg-navy/10 text-navy' : 'bg-kampgreen/10 text-kampgreen-dark'}`}>
                            {row.module_label}
                          </span>
                        </td>
                        <td className="text-muted">{row.task_type}</td>
                        <td className="text-muted">{row.task_category}</td>
                        <td className="text-muted">{formatDue(row.due_datetime || row.due_date)}</td>
                        <td>
                          <span className="rounded-full px-3 py-[4px] text-[10px] font-bold" style={{ background: badge.bg, color: badge.color }}>
                            {row.status_display}
                          </span>
                        </td>
                        <td className="text-muted">{row.owner || '—'}</td>
                      </tr>
                      {expanded && (
                        <tr className="bg-surface-alt">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted mb-1">Location</div>
                                <div className="text-navy">{row.location || '—'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted mb-1">Created</div>
                                <div className="text-navy">{formatDue(row.created_at)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted mb-1">Completion Time</div>
                                <div className="text-navy">{row.completion_hours != null ? `${row.completion_hours}h` : '—'}</div>
                              </div>
                            </div>
                            {row.details && (
                              <div className="mt-3">
                                <div className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted mb-1">Details</div>
                                <div className="text-[11px] text-muted leading-relaxed">{row.details}</div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
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
