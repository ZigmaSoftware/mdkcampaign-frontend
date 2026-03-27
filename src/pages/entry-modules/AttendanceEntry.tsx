import { useState, useEffect, useCallback } from 'react'
import { useAttendanceAPI } from '../../hooks/useAttendanceAPI'
import type { TodayStatus, AttendanceRecord } from '../../hooks/useAttendanceAPI'
import { useAuthContext } from '../../context/AuthContext'

/* ── Helpers ── */
function statusColor(s: string) {
  if (s === 'PRESENT')    return { bg: '#dcfce7', color: '#15803d', icon: 'ph-check-circle' }
  if (s === 'INCOMPLETE') return { bg: '#fef3c7', color: '#d97706', icon: 'ph-warning-circle' }
  return                         { bg: '#fee2e2', color: '#dc2626', icon: 'ph-x-circle' }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtHours(h: string | number) {
  const n = parseFloat(String(h))
  if (!n) return '—'
  const hrs = Math.floor(n)
  const mins = Math.round((n - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

/* ── Today Card ── */
function TodayCard({
  today, onPunchIn, onPunchOut, loading,
}: {
  today: TodayStatus | null
  onPunchIn: () => void
  onPunchOut: () => void
  loading: boolean
}) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const isPunchedIn  = today?.punch_in != null
  const isPunchedOut = today?.punch_out != null
  const st = today?.status ?? 'ABSENT'
  const badge = statusColor(st)

  return (
    <div className="bg-surface rounded-card shadow-card overflow-hidden mb-5">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #0d2455 0%, #1a3a7c 100%)' }}>
        <div>
          <div className="text-[11px] text-[#94a3b8] uppercase tracking-[1.5px] font-semibold mb-1">TODAY</div>
          <div className="text-white font-bold text-[16px]">{dateStr}</div>
        </div>
        <div className="text-right">
          <div className="text-[28px] font-black text-white font-mono">{timeStr}</div>
          <div className="text-[10px] text-[#94a3b8] mt-[2px]">IST</div>
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Status badge */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: badge.bg }}>
            <i className={`ph ${badge.icon} text-[20px]`} style={{ color: badge.color }} />
          </div>
          <div>
            <div className="text-[13px] font-bold text-navy">
              {st === 'ABSENT' ? 'Not Punched In' : st === 'INCOMPLETE' ? 'Shift In Progress' : 'Shift Complete'}
            </div>
            <div className="text-[11px]" style={{ color: badge.color }}>
              {st === 'PRESENT'
                ? `${fmtHours(today?.total_work_hours ?? '0')} worked`
                : st === 'INCOMPLETE'
                  ? `Punched in at ${today?.punch_in_time ?? '—'}`
                  : 'Punch in to start your shift'}
            </div>
          </div>
          <span className="ml-auto text-[10px] font-bold px-3 py-1 rounded-full"
            style={{ background: badge.bg, color: badge.color }}>
            {st}
          </span>
        </div>

        {/* Punch timeline */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#f0f9ff] rounded-xl px-4 py-3 border border-[#bae6fd]">
            <div className="text-[10px] font-semibold text-[#0369a1] uppercase tracking-[0.8px] mb-1">
              <i className="ph ph-sign-in mr-1" />Punch In
            </div>
            <div className="text-[20px] font-black text-navy font-mono">
              {today?.punch_in_time ?? '——:——'}
            </div>
          </div>
          <div className="bg-[#f0fdf4] rounded-xl px-4 py-3 border border-[#bbf7d0]">
            <div className="text-[10px] font-semibold text-[#15803d] uppercase tracking-[0.8px] mb-1">
              <i className="ph ph-sign-out mr-1" />Punch Out
            </div>
            <div className="text-[20px] font-black text-navy font-mono">
              {today?.punch_out_time ?? '——:——'}
            </div>
          </div>
        </div>

        {/* Work hours */}
        {st === 'PRESENT' && (
          <div className="bg-[#f0fdf4] rounded-xl px-4 py-3 mb-5 flex items-center gap-3 border border-[#bbf7d0]">
            <i className="ph ph-clock-countdown text-[24px] text-[#15803d]" />
            <div>
              <div className="text-[11px] text-[#15803d] font-semibold uppercase tracking-[0.8px]">Total Work Hours</div>
              <div className="text-[22px] font-black text-navy">{fmtHours(today?.total_work_hours ?? '0')}</div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {!isPunchedIn && (
            <button
              onClick={onPunchIn}
              disabled={loading}
              className="flex-1 py-[14px] rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #138808 0%, #16a34a 100%)', boxShadow: '0 4px 12px rgba(19,136,8,0.3)' }}
            >
              <i className="ph ph-sign-in text-[18px]" />
              Punch In
            </button>
          )}
          {isPunchedIn && !isPunchedOut && (
            <button
              onClick={onPunchOut}
              disabled={loading}
              className="flex-1 py-[14px] rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
            >
              <i className="ph ph-sign-out text-[18px]" />
              Punch Out
            </button>
          )}
          {isPunchedOut && (
            <div className="flex-1 py-[14px] rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] font-bold text-[14px] flex items-center justify-center gap-2">
              <i className="ph ph-check-circle text-[18px]" />
              Shift Complete
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── History Table ── */
function HistoryTable({ records }: { records: AttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted gap-2">
        <i className="ph ph-clock text-[32px] opacity-30" />
        <p className="text-[13px]">No attendance history yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-[#f8fafc] border-b border-border">
                      <th className="text-left px-4 py-3 font-bold text-navy">Username</th>
            <th className="text-left px-4 py-3 font-bold text-navy">Date</th>
            <th className="text-left px-4 py-3 font-bold text-navy">Punch In</th>
            <th className="text-left px-4 py-3 font-bold text-navy">Punch Out</th>
            <th className="text-left px-4 py-3 font-bold text-navy">Work Hours</th>
            <th className="text-left px-4 py-3 font-bold text-navy">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec, idx) => {
            const badge = statusColor(rec.status)
            return (
              <tr key={rec.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'}>
                <td className="px-4 py-[9px] border-b border-[#f0f0f0]">
                          <div className="font-semibold text-navy">{rec.full_name || rec.username}</div>
                          <div className="text-[10px] text-muted">@{rec.username}</div>
                        </td>
                <td className="px-4 py-[10px] font-medium text-navy border-b border-[#f0f0f0]">
                  {fmtDate(rec.attendance_date)}
                </td>
                <td className="px-4 py-[10px] font-mono text-[#0369a1] border-b border-[#f0f0f0]">
                  {rec.punch_in_time ?? '—'}
                </td>
                <td className="px-4 py-[10px] font-mono text-[#15803d] border-b border-[#f0f0f0]">
                  {rec.punch_out_time ?? '—'}
                </td>
                <td className="px-4 py-[10px] font-semibold text-navy border-b border-[#f0f0f0]">
                  {fmtHours(rec.total_work_hours)}
                </td>
                <td className="px-4 py-[10px] border-b border-[#f0f0f0]">
                  <span className="text-[10px] font-bold px-2 py-[3px] rounded-full"
                    style={{ background: badge.bg, color: badge.color }}>
                    {rec.status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Admin Report Tab ── */
function AdminReport() {
  const { fetchReport } = useAttendanceAPI()
  const [report, setReport] = useState<any>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    const params: Record<string, string> = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo)   params.date_to   = dateTo
    if (statusFilter) params.status = statusFilter
    const r = await fetchReport(params)
    if (r) setReport(r)
  }, [fetchReport, dateFrom, dateTo, statusFilter])

  useEffect(() => { load() }, [])

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-[#f8fafc] rounded-xl border border-border">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-navy uppercase tracking-[0.5px]">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-navy" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-navy uppercase tracking-[0.5px]">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-navy" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-navy uppercase tracking-[0.5px]">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-navy bg-white">
            <option value="">All</option>
            <option value="PRESENT">Present</option>
            <option value="INCOMPLETE">Incomplete</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={load}
            className="px-4 py-2 bg-navy text-white rounded-lg text-[12px] font-semibold hover:bg-[#163070] transition-colors">
            <i className="ph ph-magnifying-glass mr-1" />Apply
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Records',  value: report.summary.total_records,  icon: 'ph-list',          bg: '#dbeafe', color: '#1d4ed8' },
              { label: 'Present',        value: report.summary.present,        icon: 'ph-check-circle',  bg: '#dcfce7', color: '#15803d' },
              { label: 'Incomplete',     value: report.summary.incomplete,     icon: 'ph-warning',       bg: '#fef3c7', color: '#d97706' },
              { label: 'Avg Hours',      value: `${parseFloat(report.summary.avg_work_hours).toFixed(1)}h`, icon: 'ph-clock', bg: '#f0f9ff', color: '#0369a1' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border border-border"
                style={{ background: s.bg }}>
                <div className="flex items-center gap-2 mb-2">
                  <i className={`ph ${s.icon} text-[16px]`} style={{ color: s.color }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.5px]" style={{ color: s.color }}>{s.label}</span>
                </div>
                <div className="text-[22px] font-black" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Report table */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-border">
                    <th className="text-left px-4 py-3 font-bold text-navy">User</th>
                    <th className="text-left px-4 py-3 font-bold text-navy">Role</th>
                    <th className="text-left px-4 py-3 font-bold text-navy">Date</th>
                    <th className="text-left px-4 py-3 font-bold text-navy">Punch In</th>
                    <th className="text-left px-4 py-3 font-bold text-navy">Punch Out</th>
                    <th className="text-left px-4 py-3 font-bold text-navy">Hours</th>
                    <th className="text-left px-4 py-3 font-bold text-navy">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.records.map((rec: AttendanceRecord, idx: number) => {
                    const badge = statusColor(rec.status)
                    return (
                      <tr key={rec.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'}>
                        <td className="px-4 py-[9px] border-b border-[#f0f0f0]">
                          <div className="font-semibold text-navy">{rec.full_name || rec.username}</div>
                          <div className="text-[10px] text-muted">@{rec.username}</div>
                        </td>
                        <td className="px-4 py-[9px] text-muted border-b border-[#f0f0f0] capitalize">{rec.role?.replace('_', ' ')}</td>
                        <td className="px-4 py-[9px] font-medium text-navy border-b border-[#f0f0f0]">{fmtDate(rec.attendance_date)}</td>
                        <td className="px-4 py-[9px] font-mono text-[#0369a1] border-b border-[#f0f0f0]">{rec.punch_in ? new Date(rec.punch_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</td>
                        <td className="px-4 py-[9px] font-mono text-[#15803d] border-b border-[#f0f0f0]">{rec.punch_out ? new Date(rec.punch_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</td>
                        <td className="px-4 py-[9px] font-semibold text-navy border-b border-[#f0f0f0]">{fmtHours(rec.total_work_hours)}</td>
                        <td className="px-4 py-[9px] border-b border-[#f0f0f0]">
                          <span className="text-[9px] font-bold px-2 py-[2px] rounded-full"
                            style={{ background: badge.bg, color: badge.color }}>{rec.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Main Component ── */
type TabId = 'today' | 'history' | 'report'

export default function AttendanceEntry() {
  const { user } = useAuthContext()
  const { punchIn, punchOut, fetchToday, fetchMyHistory, loading, error } = useAttendanceAPI()

  const isAdmin = user?.role === 'admin' || user?.role === 'district_head' || user?.role === 'constituency_mgr'

  const [activeTab, setActiveTab]   = useState<TabId>('today')
  const [today, setToday]           = useState<TodayStatus | null>(null)
  const [history, setHistory]       = useState<AttendanceRecord[]>([])
  const [actionMsg, setActionMsg]   = useState<{ text: string; ok: boolean } | null>(null)

  const loadToday = useCallback(async () => {
    const t = await fetchToday()
    if (t) setToday(t)
  }, [fetchToday])

  const loadHistory = useCallback(async () => {
    const h = await fetchMyHistory()
    if (h) setHistory(h)
  }, [fetchMyHistory])

  useEffect(() => { loadToday() }, [])
  useEffect(() => {
    if (activeTab === 'history') loadHistory()
  }, [activeTab])

  const handlePunchIn = async () => {
    setActionMsg(null)
    const rec = await punchIn()
    if (rec) {
      setToday(rec as any)
      setActionMsg({ text: `Punched in at ${rec.punch_in_time}`, ok: true })
    } else {
      setActionMsg({ text: error ?? 'Punch-in failed.', ok: false })
    }
  }

  const handlePunchOut = async () => {
    setActionMsg(null)
    const rec = await punchOut()
    if (rec) {
      setToday(rec as any)
      setActionMsg({ text: `Punched out at ${rec.punch_out_time} · ${fmtHours(rec.total_work_hours)} worked`, ok: true })
    } else {
      setActionMsg({ text: error ?? 'Punch-out failed.', ok: false })
    }
  }

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'today',   label: 'Today',    icon: 'ph ph-calendar-check' },
    { id: 'history', label: 'My History', icon: 'ph ph-clock-counter-clockwise' },
    ...(isAdmin ? [{ id: 'report' as TabId, label: 'Report',  icon: 'ph ph-chart-bar' }] : []),
  ]

  return (
    <div className="page-enter max-w-[900px] mx-auto">
      {/* Tab bar */}
      <div className="flex gap-2 mb-5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold border transition-all duration-150
              ${activeTab === tab.id
                ? 'bg-navy text-white border-navy shadow-sm'
                : 'bg-white text-muted border-border hover:border-navy hover:text-navy'}`}
          >
            <i className={`${tab.icon} mr-1`} />{tab.label}
          </button>
        ))}
      </div>

      {/* Action message */}
      {actionMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl flex items-center gap-2 text-[13px] font-semibold border
          ${actionMsg.ok
            ? 'bg-[#dcfce7] border-[#bbf7d0] text-[#15803d]'
            : 'bg-[#fee2e2] border-[#fca5a5] text-[#dc2626]'}`}>
          <i className={`ph ${actionMsg.ok ? 'ph-check-circle' : 'ph-warning-circle'} text-[16px]`} />
          {actionMsg.text}
        </div>
      )}

      {/* Today tab */}
      {activeTab === 'today' && (
        <TodayCard
          today={today}
          onPunchIn={handlePunchIn}
          onPunchOut={handlePunchOut}
          loading={loading}
        />
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="bg-surface rounded-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <i className="ph ph-clock-counter-clockwise text-navy text-[18px]" />
            <div>
              <h3 className="text-[13px] font-bold text-navy">My Attendance History</h3>
              <p className="text-[11px] text-muted">Last 30 days</p>
            </div>
          </div>
          <HistoryTable records={history} />
        </div>
      )}

      {/* Report tab (admin) */}
      {activeTab === 'report' && isAdmin && (
        <div className="bg-surface rounded-card shadow-card overflow-hidden p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <i className="ph ph-chart-bar text-navy text-[18px]" />
            <div>
              <h3 className="text-[13px] font-bold text-navy">Attendance Report</h3>
              <p className="text-[11px] text-muted">View and filter attendance across all users</p>
            </div>
          </div>
          <AdminReport />
        </div>
      )}
    </div>
  )
}
