import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'
import type { TaskAnalyticsRow } from '../services/taskDashboardApi'

interface TaskTypeCategoryChartProps {
  typeRows: TaskAnalyticsRow[]
  categoryRows: TaskAnalyticsRow[]
}

function SegmentBar({ row }: { row: TaskAnalyticsRow }) {
  const total = row.total || 1
  const pendingPct = (row.pending / total) * 100
  const completedPct = (row.completed / total) * 100
  const cancelledPct = (row.cancelled / total) * 100

  return (
    <div className="overflow-hidden rounded-full h-[10px] bg-[#e5e7eb] flex">
      <div style={{ width: `${pendingPct}%`, background: '#FF9933' }} />
      <div style={{ width: `${completedPct}%`, background: '#138808' }} />
      <div style={{ width: `${cancelledPct}%`, background: '#dc2626' }} />
    </div>
  )
}

function TypeCard({ rows }: { rows: TaskAnalyticsRow[] }) {
  return (
    <Card
      title="Type vs Status"
      icon="ph ph-chart-bar-horizontal"
      headerRight={<Badge label={`${rows.length} task types`} variant="blue" />}
      className="mb-0"
    >
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted italic">No task type data for the current filter scope.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.label} className="rounded-lg border border-border bg-[#f8fafc] px-3 py-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <div className="text-[11px] font-bold text-navy">{row.label}</div>
                  <div className="text-[10px] text-muted">
                    {row.total} total · {row.task_count} task · {row.campaign_count} campaign
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-muted">
                  {row.completion_rate_pct}% completed
                </div>
              </div>
              <SegmentBar row={row} />
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted">
                <span>Pending {row.pending}</span>
                <span>Completed {row.completed}</span>
                <span>Cancelled {row.cancelled}</span>
                <span>Overdue {row.overdue}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function CategoryCard({ rows }: { rows: TaskAnalyticsRow[] }) {
  return (
    <Card
      title="Category Workload"
      icon="ph ph-folders"
      headerRight={<Badge label={`${rows.length} categories`} variant="blue" />}
      className="mb-0"
    >
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted italic">No category workload data for the current filter scope.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full text-[11px]">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Total</th>
                <th className="text-right">Pending</th>
                <th className="text-right">Completed</th>
                <th className="text-right">Overdue</th>
                <th className="text-right">Completion %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label}>
                  <td>
                    <div className="font-semibold text-navy">{row.label}</div>
                    <div className="text-[10px] text-muted">
                      {row.task_count} task · {row.campaign_count} campaign
                    </div>
                  </td>
                  <td className="text-right">{row.total}</td>
                  <td className="text-right">{row.pending}</td>
                  <td className="text-right">{row.completed}</td>
                  <td className={`text-right font-bold ${row.overdue > 0 ? 'text-kampr' : 'text-muted'}`}>{row.overdue}</td>
                  <td className="text-right font-bold text-navy">{row.completion_rate_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export default function TaskTypeCategoryChart({ typeRows, categoryRows }: TaskTypeCategoryChartProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
      <TypeCard rows={typeRows} />
      <CategoryCard rows={categoryRows} />
    </div>
  )
}
