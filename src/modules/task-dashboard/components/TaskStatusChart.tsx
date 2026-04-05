import Badge from '../../../components/ui/Badge'
import BarChart from '../../../components/ui/BarChart'
import Card from '../../../components/ui/Card'
import DonutChart from '../../../components/ui/DonutChart'
import type { TaskDashboardBreakdownItem } from '../services/taskDashboardApi'

interface TaskStatusChartProps {
  statusItems: TaskDashboardBreakdownItem[]
  dueItems: TaskDashboardBreakdownItem[]
}

function totalOf(items: TaskDashboardBreakdownItem[]) {
  return items.reduce((sum, item) => sum + (item.count || 0), 0)
}

function DonutStatusCard({ items }: { items: TaskDashboardBreakdownItem[] }) {
  const total = totalOf(items)
  const segments = total > 0
    ? items.map(item => ({
        value: item.count,
        color: item.color || '#0d2455',
      }))
    : [{ value: 1, color: '#e5e7eb' }]

  return (
    <Card
      title="Task Status Distribution"
      icon="ph ph-chart-donut"
      headerRight={<Badge label={`${total.toLocaleString('en-IN')} tasks`} variant="blue" />}
      className="mb-0"
    >
      <div className="flex flex-col md:flex-row items-center gap-4">
        <DonutChart
          segments={segments}
          centerValue={total.toLocaleString('en-IN')}
          centerLabel={total > 0 ? 'Items' : 'No data'}
          size={138}
        />
        <div className="flex-1 w-full grid grid-cols-1 gap-[8px]">
          {items.map(item => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border border-border bg-[#f8fafc] px-3 py-[8px]">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-navy">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color || '#0d2455' }} />
                {item.label}
              </span>
              <span className="text-[10px] text-muted">
                <strong className="text-navy">{item.count.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function DueBreakdownCard({ items }: { items: TaskDashboardBreakdownItem[] }) {
  const max = Math.max(...items.map(item => item.count), 0)
  const chartItems = items.map(item => ({
    label: item.label,
    value: item.count,
    pct: max > 0 ? Math.max((item.count / max) * 100, 8) : 8,
    color: item.color || '#0d2455',
    display: `${item.count}`,
  }))

  return (
    <Card
      title="Due-Based Breakdown"
      icon="ph ph-calendar-check"
      headerRight={<Badge label={`${totalOf(items)} open tasks`} variant="blue" />}
      className="mb-0"
    >
      <BarChart items={chartItems} height={220} />
    </Card>
  )
}

export default function TaskStatusChart({ statusItems, dueItems }: TaskStatusChartProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
      <DonutStatusCard items={statusItems} />
      <DueBreakdownCard items={dueItems} />
    </div>
  )
}
