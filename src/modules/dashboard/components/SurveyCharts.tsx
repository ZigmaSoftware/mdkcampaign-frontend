import Badge from '../../../components/ui/Badge'
import BarChart from '../../../components/ui/BarChart'
import Card from '../../../components/ui/Card'
import DonutChart from '../../../components/ui/DonutChart'
import type { DashboardBreakdownItem } from '../services/dashboardApi'

interface SurveyChartsProps {
  support: DashboardBreakdownItem[]
  awareness: DashboardBreakdownItem[]
  voteLikelihood: DashboardBreakdownItem[]
  response: DashboardBreakdownItem[]
  partyPreference: DashboardBreakdownItem[]
}

const SUPPORT_COLORS: Record<string, string> = {
  positive: '#138808',
  neutral: '#FF9933',
  negative: '#dc2626',
  yes: '#138808',
  no: '#dc2626',
  not_sure: '#6b7280',
  not_reached: '#1d4ed8',
  no_answer: '#7c3aed',
  wrong_number: '#dc2626',
  followup: '#f97316',
}

function totalOf(items: DashboardBreakdownItem[]) {
  return items.reduce((sum, item) => sum + (item.count || 0), 0)
}

function DonutCard({
  title,
  icon,
  items,
}: {
  title: string
  icon: string
  items: DashboardBreakdownItem[]
}) {
  const total = totalOf(items)
  const segments = total > 0
    ? items.map(item => ({
        value: item.count,
        color: SUPPORT_COLORS[item.key] || '#0d2455',
      }))
    : [{ value: 1, color: '#e5e7eb' }]

  return (
    <Card
      title={title}
      icon={icon}
      headerRight={<Badge label={`${total.toLocaleString('en-IN')} records`} variant="blue" />}
      className="mb-0"
    >
      <div className="flex flex-col md:flex-row items-center gap-4">
        <DonutChart
          segments={segments}
          centerValue={total.toLocaleString('en-IN')}
          centerLabel={total > 0 ? 'Responses' : 'No data'}
          size={136}
        />
        <div className="flex-1 w-full grid grid-cols-1 gap-[8px]">
          {items.map(item => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
            return (
              <div key={item.key} className="flex items-center justify-between bg-[#f8fafc] border border-border rounded-lg px-3 py-[8px]">
                <span className="flex items-center gap-2 text-[11px] font-semibold text-navy">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: SUPPORT_COLORS[item.key] || '#0d2455' }}
                  />
                  {item.label}
                </span>
                <span className="text-[10px] text-muted">
                  <strong className="text-navy">{item.count.toLocaleString('en-IN')}</strong> · {pct}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function PartyPreferenceCard({ items }: { items: DashboardBreakdownItem[] }) {
  const max = Math.max(...items.map(item => item.count), 0)
  const chartItems = items.slice(0, 6).map(item => ({
    label: item.label,
    value: item.count,
    pct: max > 0 ? Math.max((item.count / max) * 100, 8) : 8,
    color: '#0d2455',
    display: `${item.count}`,
  }))

  return (
    <Card
      title="Party Preference"
      icon="ph ph-flag-banner"
      headerRight={<Badge label={`${items.length} parties`} variant="blue" />}
      className="mb-0"
    >
      {chartItems.length === 0 ? (
        <p className="text-[11px] text-muted italic">No party preference data for the current filter scope.</p>
      ) : (
        <BarChart items={chartItems} height={220} />
      )}
    </Card>
  )
}

function ResponseCard({ items }: { items: DashboardBreakdownItem[] }) {
  const max = Math.max(...items.map(item => item.count), 0)
  const chartItems = items.map(item => ({
    label: item.label,
    value: item.count,
    pct: max > 0 ? Math.max((item.count / max) * 100, 8) : 8,
    color: SUPPORT_COLORS[item.key] || '#0d2455',
    display: `${item.count}`,
  }))

  return (
    <Card
      title="Response Outcomes"
      icon="ph ph-phone-disconnect"
      headerRight={<Badge label={`${totalOf(items)} records`} variant="blue" />}
      className="mb-0"
    >
      <BarChart items={chartItems} height={220} />
    </Card>
  )
}

export default function SurveyCharts({
  support,
  awareness,
  voteLikelihood,
  response,
  partyPreference,
}: SurveyChartsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
      <DonutCard title="Support Snapshot" icon="ph ph-thumbs-up" items={support} />
      <DonutCard title="Candidate Awareness" icon="ph ph-megaphone-simple" items={awareness} />
      <DonutCard title="Likelihood To Vote" icon="ph ph-check-circle" items={voteLikelihood} />
      <ResponseCard items={response} />
      <div className="xl:col-span-2">
        <PartyPreferenceCard items={partyPreference} />
      </div>
    </div>
  )
}

