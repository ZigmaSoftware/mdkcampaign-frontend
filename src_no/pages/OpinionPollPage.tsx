import { useState, useEffect } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import { currentDateLabel } from '../utils/formatters'

/* ── Types & constants ── */
interface PollVote {
  username: string
  phone: string
  city: string
  q1: string
  q2: string
  comment: string
  timestamp: string
}

const LS_KEY_VOTES = 'mkural_votes'
const PAGE_SIZE = 10

const Q1_OPTIONS = [
  { key: 'bjp',    name: 'ADMK + BJP',           color: '#FF9933', icon: '🪷' },
  { key: 'dmk',    name: 'DMK + INC',             color: '#3b82f6', icon: null },
  { key: 'ntk',    name: 'Naam Tamilar Katchi',   color: '#ef4444', icon: null },
  { key: 'nota',   name: 'NOTA',                  color: '#555',    icon: null },
  { key: 'tvk',    name: 'TVK',                   color: '#f59e0b', icon: null },
]

const Q2_ISSUES = [
  { key: 'healthcare',  icon: '🏥', labelTa: 'சுகாதாரம்',        label: 'Healthcare'             },
  { key: 'employment',  icon: '💼', labelTa: 'வேலைவாய்ப்பு',     label: 'Employment'              },
  { key: 'roads',       icon: '🛣️', labelTa: 'சாலைகள்',          label: 'Roads & Infrastructure'  },
  { key: 'education',   icon: '📚', labelTa: 'கல்வி',             label: 'Education'               },
  { key: 'water',       icon: '💧', labelTa: 'குடிநீர்',          label: 'Drinking Water'          },
  { key: 'agriculture', icon: '🌾', labelTa: 'விவசாயம்',         label: 'Agriculture'             },
  { key: 'womensafety', icon: '🛡️', labelTa: 'பெண் பாதுகாப்பு',  label: 'Women Safety'            },
  { key: 'pricerise',   icon: '📈', labelTa: 'விலைவாசி',         label: 'Price Rise'              },
]

const CITIES = ['Arachalur', 'Avalpoondurai', 'Nanjai Uthukuli', 'Elumathur', 'Lakkapuram']

/* ── Helpers ── */
function loadVotes(): PollVote[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY_VOTES) || '[]') } catch { return [] }
}

function tally(votes: PollVote[], field: 'q1' | 'q2'): Record<string, number> {
  const out: Record<string, number> = {}
  for (const v of votes) { const k = v[field]; if (k) out[k] = (out[k] || 0) + 1 }
  return out
}

function pct(count: number, total: number) {
  if (!total) return 0
  return Math.round((count / total) * 100)
}

function byDay(votes: PollVote[]): { date: string; count: number }[] {
  const map: Record<string, number> = {}
  for (const v of votes) {
    const d = new Date(v.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    map[d] = (map[d] || 0) + 1
  }
  return Object.entries(map).map(([date, count]) => ({ date, count }))
}

/* ── Component ── */
export default function OpinionPollPage() {
  const [votes,   setVotes]   = useState<PollVote[]>([])
  const [refresh, setRefresh] = useState(0)

  // Filters
  const [filterParty, setFilterParty] = useState('')
  const [filterCity,  setFilterCity]  = useState('')
  const [filterName,  setFilterName]  = useState('')

  // Pagination
  const [page, setPage] = useState(1)

  useEffect(() => { setVotes(loadVotes()); setPage(1) }, [refresh])
  useEffect(() => { setPage(1) }, [filterParty, filterCity, filterName])

  const total  = votes.length
  const q1Data = tally(votes, 'q1')
  const q2Data = tally(votes, 'q2')
  const topQ1  = Q1_OPTIONS.reduce((a, b) => (q1Data[a.key] || 0) >= (q1Data[b.key] || 0) ? a : b)
  const topQ2  = Q2_ISSUES.reduce((a, b)  => (q2Data[a.key] || 0) >= (q2Data[b.key] || 0) ? a : b)
  const trend  = byDay(votes)
  const maxDay = Math.max(...trend.map(d => d.count), 1)

  // Ascending sorts (lowest first)
  const q1Sorted = [...Q1_OPTIONS].sort((a, b) => (q1Data[a.key] || 0) - (q1Data[b.key] || 0))
  const q2Sorted = [...Q2_ISSUES].sort((a, b) => (q2Data[a.key] || 0) - (q2Data[b.key] || 0))

  // Filtered + paginated votes (most recent first)
  const filtered = [...votes].reverse().filter(v => {
    if (filterParty && v.q1 !== filterParty) return false
    if (filterCity  && v.city !== filterCity)  return false
    if (filterName  && !v.username?.toLowerCase().includes(filterName.toLowerCase())) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pollUrl = `${window.location.origin}/poll-system`

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <SectionHeader
        title="Opinion Poll Dashboard"
        icon="ph ph-megaphone"
        subtitle={`Live polling insights · Modakkurichi Constituency 100 · ${currentDateLabel()}`}
      />

      {/* ── Public Poll Link ── */}
      <div
        className="rounded-card px-5 py-4 mb-5 flex items-center justify-between gap-4 flex-wrap"
        style={{ background: '#1a0a00', border: '1px solid #FF9933' }}
      >
        <div>
          <div className="text-[11px] font-extrabold text-saffron tracking-[1px] uppercase mb-1">Public Poll Link</div>
          <div className="text-[13px] text-white font-mono">{pollUrl}</div>
          <div className="text-[10px] text-[#888] mt-1">Share this link with voters — no login required</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard?.writeText(pollUrl).then(() => alert('Copied!'))}
            className="flex items-center gap-2 text-[11px] font-bold px-4 py-2 rounded-lg border-none cursor-pointer"
            style={{ background: '#FF9933', color: '#0d2455' }}
          >
            <i className="ph ph-copy" /> Copy Link
          </button>
          <button
            onClick={() => setRefresh(r => r + 1)}
            className="flex items-center gap-2 text-[11px] font-bold px-4 py-2 rounded-lg border-none cursor-pointer"
            style={{ background: '#222', color: '#aaa', border: '1px solid #333' }}
          >
            <i className="ph ph-arrows-clockwise" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 sm:grid-cols-2 gap-4 mb-5">
        {[
          { icon: 'ph-users',          label: 'Total Votes',   value: total.toLocaleString('en-IN'), color: '#FF9933' },
          { icon: 'ph-trophy',         label: 'Leading Party', value: total ? topQ1.name : '—',      color: '#138808' },
          { icon: 'ph-warning-circle', label: 'Top Issue',     value: total ? topQ2.labelTa : '—',   color: '#3b82f6' },
          { icon: 'ph-calendar',       label: 'Poll Date',     value: currentDateLabel(),             color: '#6b7280' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="rounded-card px-5 py-4 bg-white border border-border shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <i className={`ph ${icon} text-[16px]`} style={{ color }} />
              <span className="text-[10px] text-muted uppercase tracking-[1px] font-semibold">{label}</span>
            </div>
            <div className="text-[20px] font-black text-navy leading-none">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-1 gap-5 mb-5">

        {/* ── Q1 Results — ascending ── */}
        <div className="rounded-card bg-white border border-border shadow-card overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <h3 className="text-[12px] font-extrabold text-navy uppercase tracking-[1px] flex items-center gap-2">
              <i className="ph ph-check-square text-saffron" /> Q1 — Party / Alliance Vote
            </h3>
            <span className="text-[10px] font-bold text-muted">{total} votes</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {q1Sorted.map((opt) => {
              const count = q1Data[opt.key] || 0
              const p     = pct(count, total)
              const isTop = opt.key === topQ1.key && total > 0
              return (
                <div key={opt.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">{opt.icon ?? '•'}</span>
                      <span className="text-[12px] font-semibold text-navy">{opt.name}</span>
                      {isTop && <span className="text-[8px] font-bold text-[#138808] bg-[#e8f5e9] px-2 py-[2px] rounded-full">🏆 LEADING</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted">{count}</span>
                      <span className="text-[13px] font-extrabold" style={{ color: opt.color, minWidth: 36, textAlign: 'right' }}>{p}%</span>
                    </div>
                  </div>
                  <div className="h-[8px] rounded-full overflow-hidden bg-[#f0f0f0]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: opt.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Q2 Results — ascending ── */}
        <div className="rounded-card bg-white border border-border shadow-card overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <h3 className="text-[12px] font-extrabold text-navy uppercase tracking-[1px] flex items-center gap-2">
              <i className="ph ph-flag text-saffron" /> Q2 — Key Issues
            </h3>
            <span className="text-[10px] font-bold text-muted">{total} votes</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {q2Sorted.map((issue) => {
              const count = q2Data[issue.key] || 0
              const p     = pct(count, total)
              const isTop = issue.key === topQ2.key && total > 0
              return (
                <div key={issue.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">{issue.icon}</span>
                      <span className="text-[12px] font-semibold text-navy">{issue.labelTa}</span>
                      {isTop && <span className="text-[8px] font-bold text-[#1565c0] bg-[#e3f2fd] px-2 py-[2px] rounded-full">Top Issue</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted">{count}</span>
                      <span className="text-[13px] font-extrabold text-navy" style={{ minWidth: 36, textAlign: 'right' }}>{p}%</span>
                    </div>
                  </div>
                  <div className="h-[8px] rounded-full overflow-hidden bg-[#f0f0f0]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: '#FF9933' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Daily Trend ── */}
      {trend.length > 0 && (
        <div className="rounded-card bg-white border border-border shadow-card overflow-hidden mb-5">
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <h3 className="text-[12px] font-extrabold text-navy uppercase tracking-[1px] flex items-center gap-2">
              <i className="ph ph-trend-up text-saffron" /> Daily Vote Trend
            </h3>
          </div>
          <div className="px-5 py-5 flex items-end gap-3 overflow-x-auto scrollbar-none" style={{ minHeight: 100 }}>
            {trend.map(({ date, count }) => (
              <div key={date} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 48 }}>
                <div className="text-[10px] font-extrabold text-navy">{count}</div>
                <div className="w-9 rounded-t-[4px] transition-all duration-700" style={{ height: Math.max(8, Math.round((count / maxDay) * 80)), background: '#FF9933' }} />
                <div className="text-[9px] text-muted text-center">{date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Votes Table ── */}
      <div className="rounded-card bg-white border border-border shadow-card overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f0f0' }}>
          <h3 className="text-[12px] font-extrabold text-navy uppercase tracking-[1px] flex items-center gap-2">
            <i className="ph ph-list-bullets text-saffron" /> Recent Votes
          </h3>
          <span className="text-[10px] font-bold text-muted">{filtered.length} of {total}</span>
        </div>

        {/* ── Filters ── */}
        <div className="px-5 py-3 flex flex-wrap gap-3 items-center" style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
          <div className="flex items-center gap-1.5">
            <i className="ph ph-funnel text-[13px] text-muted" />
            <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Filter</span>
          </div>
          <input
            type="text"
            placeholder="Search name..."
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            className="border border-border rounded px-2 py-1 text-[11px] bg-white focus:outline-none focus:border-saffron"
            style={{ width: 130 }}
          />
          <select
            value={filterParty}
            onChange={e => setFilterParty(e.target.value)}
            className="border border-border rounded px-2 py-1 text-[11px] bg-white focus:outline-none focus:border-saffron"
          >
            <option value="">All Parties</option>
            {Q1_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
          </select>
          <select
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
            className="border border-border rounded px-2 py-1 text-[11px] bg-white focus:outline-none focus:border-saffron"
          >
            <option value="">All Cities</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(filterParty || filterCity || filterName) && (
            <button
              onClick={() => { setFilterParty(''); setFilterCity(''); setFilterName('') }}
              className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <i className="ph ph-x" /> Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted text-[13px]">
            <i className="ph ph-chart-bar text-[32px] block mb-2 opacity-30" />
            {total === 0 ? 'No votes yet. Share the poll link to start collecting data.' : 'No results match your filters.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full data-table text-[12px]">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Q1 — Party Vote</th>
                    <th>Q2 — Key Issue</th>
                    <th>Comment</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((v, i) => {
                    const globalIdx = filtered.length - ((page - 1) * PAGE_SIZE) - i
                    const q1  = Q1_OPTIONS.find(o => o.key === v.q1)
                    const q2  = Q2_ISSUES.find(o  => o.key === v.q2)
                    return (
                      <tr key={i}>
                        <td className="text-muted">{globalIdx}</td>
                        <td className="font-semibold text-navy">{v.username || '—'}</td>
                        <td className="text-muted">{v.phone || '—'}</td>
                        <td className="text-muted">{v.city || '—'}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px]">{q1?.icon ?? '•'}</span>
                            <span className="font-semibold text-navy">{q1?.name ?? v.q1}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px]">{q2?.icon}</span>
                            <span className="text-navy">{q2?.labelTa ?? v.q2 ?? '—'}</span>
                          </div>
                        </td>
                        <td className="text-muted text-[11px]" style={{ maxWidth: 160 }}>
                          <span title={v.comment}>{v.comment ? (v.comment.length > 40 ? v.comment.slice(0, 40) + '…' : v.comment) : '—'}</span>
                        </td>
                        <td className="text-muted text-[10px]">
                          {new Date(v.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #f0f0f0' }}>
              <span className="text-[11px] text-muted">
                Page {page} of {totalPages} &nbsp;·&nbsp; {filtered.length} records
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2 py-1 rounded text-[11px] font-bold border border-border disabled:opacity-30 hover:bg-gray-50"
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 rounded text-[11px] font-bold border border-border disabled:opacity-30 hover:bg-gray-50"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} className="px-1 text-[11px] text-muted">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border ${page === p ? 'bg-saffron text-white border-saffron' : 'border-border hover:bg-gray-50'}`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded text-[11px] font-bold border border-border disabled:opacity-30 hover:bg-gray-50"
                >
                  ›
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded text-[11px] font-bold border border-border disabled:opacity-30 hover:bg-gray-50"
                >
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
