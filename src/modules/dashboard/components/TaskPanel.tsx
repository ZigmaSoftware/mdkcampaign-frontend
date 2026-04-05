import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'
import type { TaskPanelItem, TaskPanelSummary } from '../services/dashboardApi'

interface TaskPanelProps {
  summary: TaskPanelSummary
  items: TaskPanelItem[]
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-[#fef3c7] text-[#b45309]',
  in_progress: 'bg-[#dbeafe] text-navy',
  completed: 'bg-[#dcfce7] text-kampgreen-dark',
  cancelled: 'bg-[#fee2e2] text-kampr',
}

function formatDateTime(value: string) {
  if (!value) return 'No schedule'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export default function TaskPanel({ summary, items }: TaskPanelProps) {
  return (
    <Card
      title="Task Panel"
      icon="ph ph-kanban"
      headerRight={<Badge label={`${summary.open ?? 0} open`} variant="n" />}
      className="mb-0"
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-[10px] mb-4">
        {[
          { label: 'Pending', value: summary.pending ?? 0, color: 's' },
          { label: 'In Progress', value: summary.in_progress ?? 0, color: 'blue' },
          { label: 'Completed', value: summary.completed ?? 0, color: 'g' },
          { label: 'Overdue', value: summary.overdue ?? 0, color: 'r' },
          { label: 'Completion', value: `${summary.completion_pct ?? 0}%`, color: 'n' },
        ].map(item => (
          <div key={item.label} className="rounded-[10px] border border-border bg-[#f8fafc] px-3 py-[10px]">
            <div className="text-[9px] uppercase tracking-[0.6px] text-muted">{item.label}</div>
            <div className="mt-[4px] text-[20px] font-extrabold text-navy">{item.value}</div>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-muted italic">No task records found for the current scope.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(task => (
            <div key={task.id} className="rounded-xl border border-border bg-[#f8fafc] px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-[12px] font-bold text-navy">{task.title || 'Untitled task'}</h4>
                    <span className={`text-[9px] font-bold px-2 py-[3px] rounded-full ${STATUS_STYLE[task.status] || 'bg-border text-muted'}`}>
                      {(task.status || 'unknown').replace('_', ' ')}
                    </span>
                    {task.task_category && (
                      <span
                        className="text-[9px] font-bold px-2 py-[3px] rounded-full text-white"
                        style={{ background: task.task_category_color || '#0d2455' }}
                      >
                        {task.task_category}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted mt-[6px]">
                    {formatDateTime(task.expected_datetime)}
                    {task.booth_number ? ` · Booth ${task.booth_number}` : ''}
                    {task.booth ? ` · ${task.booth}` : ''}
                    {task.ward ? ` · ${task.ward}` : ''}
                    {task.venue ? ` · ${task.venue}` : ''}
                  </div>
                </div>
                <div className="text-[10px] text-muted text-right">
                  {task.volunteer_role ? <div>Role: <strong className="text-navy">{task.volunteer_role}</strong></div> : null}
                  {task.coordinator ? <div>Coord: <strong className="text-navy">{task.coordinator}</strong></div> : null}
                  {task.delivery_incharge ? <div>Incharge: <strong className="text-navy">{task.delivery_incharge}</strong></div> : null}
                </div>
              </div>
              {task.notes && (
                <div className="mt-2 text-[10px] text-muted border-t border-border pt-2">
                  {task.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

