import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'
import type { CampaignActivityStatusRow } from '../services/taskDashboardApi'

interface CampaignActivityTableProps {
  rows: CampaignActivityStatusRow[]
}

export default function CampaignActivityTable({ rows }: CampaignActivityTableProps) {
  return (
    <Card
      title="Campaign Activity Status"
      icon="ph ph-megaphone"
      headerRight={<Badge label={`${rows.length} activities`} variant="blue" />}
      className="mb-5"
      bodyClass="p-0"
    >
      {rows.length === 0 ? (
        <div className="px-[18px] py-[18px] text-[11px] text-muted italic">
          No campaign activity rows for the current filter scope.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full text-[11px]">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Type</th>
                <th className="text-right">Planned</th>
                <th className="text-right">In Progress</th>
                <th className="text-right">Completed</th>
                <th className="text-right">Pending</th>
                <th className="text-right">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.activity_name}-${row.event_type}`} className={row.overdue > 0 ? 'bg-[#fff7f7]' : ''}>
                  <td>
                    <div className="font-semibold text-navy">{row.activity_name}</div>
                    {row.is_unmapped && (
                      <div className="text-[10px] text-kampr">Fallback mapping</div>
                    )}
                  </td>
                  <td className="text-muted">{row.event_type || '—'}</td>
                  <td className="text-right">{row.planned}</td>
                  <td className="text-right">{row.in_progress}</td>
                  <td className="text-right text-kampgreen font-bold">{row.completed}</td>
                  <td className="text-right">{row.pending}</td>
                  <td className={`text-right font-bold ${row.overdue > 0 ? 'text-kampr' : 'text-muted'}`}>{row.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
