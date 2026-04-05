import StatCard from '../../../components/ui/StatCard'
import type { DashboardKpis } from '../services/dashboardApi'

interface SummaryCardsProps {
  kpis: DashboardKpis
}

export default function SummaryCards({ kpis }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-[10px] mb-5">
      <StatCard label="Electorate" value={kpis.total_voters.toLocaleString('en-IN')} sub="Scope voters" color="n" />
      <StatCard label="Surveyed" value={kpis.surveyed_voters.toLocaleString('en-IN')} sub="Unique records" color="s" />
      <StatCard label="Coverage" value={`${kpis.coverage_pct}%`} sub="Surveyed / voters" color="g" progress={kpis.coverage_pct} />
      <StatCard label="Positive" value={`${kpis.positive_pct}%`} sub="Support share" color="g" progress={kpis.positive_pct} />
      <StatCard label="Negative Risk" value={`${kpis.negative_risk_pct}%`} sub="Negative sentiment" color="r" progress={kpis.negative_risk_pct} />
      <StatCard label="Not Reachable" value={`${kpis.not_reachable_pct}%`} sub="Not reached / no answer" color="p" progress={kpis.not_reachable_pct} />
      <StatCard label="Follow-up" value={`${kpis.followup_pct}%`} sub="Needs action" color="s" progress={kpis.followup_pct} />
      <StatCard label="F/U Not Required" value={`${kpis.followup_not_required_pct}%`} sub={`${kpis.telecaller_count} telecallers`} color="n" progress={kpis.followup_not_required_pct} />
    </div>
  )
}
