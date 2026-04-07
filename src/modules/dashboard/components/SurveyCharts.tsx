import Badge from '../../../components/ui/Badge'
import BarChart from '../../../components/ui/BarChart'
import Card from '../../../components/ui/Card'
import DonutChart from '../../../components/ui/DonutChart'
import type { DashboardBreakdownItem } from '../services/dashboardApi'

interface SurveyChartsProps {
  gender: DashboardBreakdownItem[]
  age: DashboardBreakdownItem[]
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
  male: '#0d2455',
  female: '#ec4899',
  other: '#7c3aed',
  '18_23': '#f59e0b',
  '23_30': '#0d2455',
  '30_40': '#1d4ed8',
  '40_50': '#0f766e',
  '50_60': '#7c3aed',
  '60_70': '#b45309',
  '70_80': '#be123c',
  '80_90': '#475569',
  '90_plus': '#111827',
  yes: '#138808',
  no: '#dc2626',
  not_sure: '#6b7280',
  not_reached: '#1d4ed8',
  no_answer: '#7c3aed',
  wrong_number: '#dc2626',
  followup: '#f97316',
}

const SENTIMENT_COLORS = {
  positive: '#138808',
  neutral: '#94a3b8',
  negative: '#dc2626',
}

function totalOf(items: DashboardBreakdownItem[]) {
  return items.reduce((sum, item) => sum + (item.count || 0), 0)
}

function formatPct(value?: number) {
  if (!value) return '0%'
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`
}

function formatRatio(count: number, overallCount?: number) {
  if (typeof overallCount === 'number') {
    return `${count.toLocaleString('en-IN')} / ${overallCount.toLocaleString('en-IN')}`
  }
  return count.toLocaleString('en-IN')
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
            const pct = item.pct ?? (total > 0 ? Math.round((item.count / total) * 100) : 0)
            const hasOverallCount = typeof item.overall_count === 'number'
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
                  <strong className="text-navy">{formatRatio(item.count, hasOverallCount ? item.overall_count : undefined)}</strong>
                  {` · ${formatPct(pct)}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function GenderBreakdownCard({ items }: { items: DashboardBreakdownItem[] }) {
  const total = totalOf(items)
  const segments = total > 0
    ? items.map(item => ({
        value: item.count,
        color: SUPPORT_COLORS[item.key] || '#0d2455',
      }))
    : [{ value: 1, color: '#e5e7eb' }]

  return (
    <Card
      title="Gender Breakup"
      icon="ph ph-gender-intersex"
      headerRight={<Badge label={`${total.toLocaleString('en-IN')} surveyed`} variant="blue" />}
      className="mb-0"
    >
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <DonutChart
            segments={segments}
            centerValue={total.toLocaleString('en-IN')}
            centerLabel={total > 0 ? 'Surveyed' : 'No data'}
            size={146}
          />
          <div className="flex-1 w-full grid grid-cols-1 gap-[8px]">
            {items.map(item => (
              <div
                key={item.key}
                className="flex items-center justify-between bg-[#f8fafc] border border-border rounded-lg px-3 py-[9px]"
              >
                <span className="flex items-center gap-2 text-[11px] font-semibold text-navy">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: SUPPORT_COLORS[item.key] || '#0d2455' }}
                  />
                  {item.label}
                </span>
                <span className="text-[10px] text-muted text-right">
                  <strong className="text-navy">{formatRatio(item.count, item.overall_count)}</strong>
                  {` · ${formatPct(item.pct)}`}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-muted italic">
              Displayed as surveyed count / scoped voter count for each gender.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {items.map(item => {
            const positiveCount = item.positive_count || 0
            const neutralCount = item.neutral_count || 0
            const negativeCount = item.negative_count || 0
            const sentimentTotal = positiveCount + neutralCount + negativeCount
            const miniSegments = sentimentTotal > 0
              ? [
                  { value: positiveCount, color: SENTIMENT_COLORS.positive },
                  { value: neutralCount, color: SENTIMENT_COLORS.neutral },
                  { value: negativeCount, color: SENTIMENT_COLORS.negative },
                ]
              : [{ value: 1, color: '#e5e7eb' }]

            return (
              <div
                key={`gender-sentiment-${item.key}`}
                className="rounded-[14px] border border-border bg-[#f8fafc] px-3 py-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-navy">{item.label}</span>
                  <span className="text-[10px] text-muted">{formatRatio(item.count, item.overall_count)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <DonutChart
                    segments={miniSegments}
                    centerValue={sentimentTotal.toLocaleString('en-IN')}
                    centerLabel={sentimentTotal > 0 ? 'Pos / Neu / Neg' : 'No data'}
                    size={96}
                    strokeWidth={16}
                  />
                  <div className="flex-1 grid grid-cols-1 gap-[6px]">
                    <div className="flex items-center justify-between rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-[6px] text-[10px]">
                      <span className="font-semibold text-kampgreen-dark">Positive</span>
                      <strong className="text-kampgreen-dark">{positiveCount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-[#cbd5e1] bg-[#f1f5f9] px-2 py-[6px] text-[10px]">
                      <span className="font-semibold text-slate-600">Neutral</span>
                      <strong className="text-slate-700">{neutralCount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-[#fecaca] bg-[#fef2f2] px-2 py-[6px] text-[10px]">
                      <span className="font-semibold text-[#991b1b]">Negative</span>
                      <strong className="text-[#991b1b]">{negativeCount.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
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

function AgeBreakdownCard({ items }: { items: DashboardBreakdownItem[] }) {
  const total = totalOf(items)
  const maxSentiment = Math.max(
    ...items.map(item => (item.positive_count || 0) + (item.neutral_count || 0) + (item.negative_count || 0)),
    0,
  )

  return (
    <Card
      title="Age-Wise Breakdown"
      icon="ph ph-chart-bar"
      headerRight={<Badge label={`${total.toLocaleString('en-IN')} surveyed`} variant="blue" />}
      className="mb-0"
    >
      {total === 0 ? (
        <p className="text-[11px] text-muted italic">No age breakup data for the current filter scope.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-[3px]">
              <span className="w-2 h-2 rounded-full bg-kampgreen" />
              Positive
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#cbd5e1] bg-[#f1f5f9] px-2 py-[3px]">
              <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
              Neutral
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#fecaca] bg-[#fef2f2] px-2 py-[3px]">
              <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
              Negative
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-saffron/35 bg-saffron/10 px-2 py-[3px] text-navy">
              <span className="w-2 h-2 rounded-full bg-saffron" />
              First-time voters: 18-23
            </span>
          </div>

          <div className="flex items-end gap-[10px] w-full" style={{ height: 260 }}>
            {items.map(item => {
              const positiveCount = item.positive_count || 0
              const neutralCount = item.neutral_count || 0
              const negativeCount = item.negative_count || 0
              const sentimentTotal = positiveCount + neutralCount + negativeCount
              const heightPct = maxSentiment > 0 ? (sentimentTotal / maxSentiment) * 100 : 0
              const barHeight = sentimentTotal > 0 ? Math.max(heightPct, 12) : 0
              const positivePct = sentimentTotal > 0 ? (positiveCount / sentimentTotal) * 100 : 0
              const neutralPct = sentimentTotal > 0 ? (neutralCount / sentimentTotal) * 100 : 0
              const negativePct = sentimentTotal > 0 ? (negativeCount / sentimentTotal) * 100 : 0
              const isFirstTimeBucket = item.key === '18_23'

              return (
                <div
                  key={item.key}
                  className="flex flex-col items-center gap-[6px] flex-1 h-full justify-end min-w-0"
                >
                  <div className="text-[10px] font-semibold text-navy">
                    {item.count.toLocaleString('en-IN')}
                  </div>
                  <div
                    className={`w-full max-w-[58px] rounded-t-[10px] overflow-hidden border transition-all duration-500 ${
                      isFirstTimeBucket ? 'border-saffron/60 bg-saffron/5' : 'border-border bg-[#eef2ff]'
                    }`}
                    style={{ height: `${barHeight}%`, minHeight: sentimentTotal > 0 ? 28 : 10 }}
                  >
                    {sentimentTotal > 0 ? (
                      <div className="flex flex-col justify-end h-full">
                        {negativeCount > 0 && (
                          <div
                            className="w-full bg-[#dc2626]"
                            style={{ height: `${negativePct}%` }}
                            title={`Negative: ${negativeCount}`}
                          />
                        )}
                        {neutralCount > 0 && (
                          <div
                            className="w-full bg-[#94a3b8]"
                            style={{ height: `${neutralPct}%` }}
                            title={`Neutral: ${neutralCount}`}
                          />
                        )}
                        {positiveCount > 0 && (
                          <div
                            className="w-full bg-kampgreen"
                            style={{ height: `${positivePct}%` }}
                            title={`Positive: ${positiveCount}`}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="h-full w-full bg-[#e5e7eb]" />
                    )}
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-[10px] font-semibold ${
                        isFirstTimeBucket ? 'text-[#b45309]' : 'text-muted'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-[9px] text-muted">
                      {positiveCount.toLocaleString('en-IN')} / {neutralCount.toLocaleString('en-IN')} / {negativeCount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function SurveyCharts({
  gender,
  age,
  support,
  awareness,
  voteLikelihood,
  response,
  partyPreference,
}: SurveyChartsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
      <GenderBreakdownCard items={gender} />
      <AgeBreakdownCard items={age} />
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
