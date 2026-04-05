import StatCard from '../../../components/ui/StatCard'
import type { TaskDashboardSummaryResponse } from '../services/taskDashboardApi'

interface TaskSummaryCardsProps {
  summary: TaskDashboardSummaryResponse
}

export default function TaskSummaryCards({ summary }: TaskSummaryCardsProps) {
  const { counts, derived } = summary

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-[10px] mb-5">
      <StatCard label="Today" value={counts.today.toLocaleString('en-IN')} sub="Due today" color="n" />
      <StatCard label="Tomorrow" value={counts.tomorrow.toLocaleString('en-IN')} sub="Due tomorrow" color="s" />
      <StatCard label="Overdue" value={counts.overdue.toLocaleString('en-IN')} sub="Open and past due" color="r" />
      <StatCard label="Pending" value={counts.pending.toLocaleString('en-IN')} sub="Open workload" color="s" />
      <StatCard label="Completed" value={counts.completed.toLocaleString('en-IN')} sub="Closed successfully" color="g" />
      <StatCard label="Cancelled" value={counts.cancelled.toLocaleString('en-IN')} sub="Closed cancelled" color="r" />
      <StatCard label="Completion Rate" value={`${derived.completion_rate_pct}%`} sub={`${counts.total} total items`} color="g" progress={derived.completion_rate_pct} />
      <StatCard label="Overdue Risk" value={`${derived.overdue_risk_pct}%`} sub="Overdue / open tasks" color="r" progress={derived.overdue_risk_pct} />
      <StatCard label="Campaign Ratio" value={`${derived.campaign_task_ratio_pct}%`} sub="Campaign share" color="n" progress={derived.campaign_task_ratio_pct} />
      <StatCard label="Avg Completion" value={derived.avg_completion_time_label} sub="Created to completion" color="p" />
    </div>
  )
}
