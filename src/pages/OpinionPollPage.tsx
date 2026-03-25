import React, { useState, useEffect, useCallback } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import { usePollAPI } from '../hooks/usePollAPI'
import type { PollData, PollOption, VoteRecord } from '../hooks/usePollAPI'
import { useToast } from '../context/ToastContext'
import { useAuthContext } from '../context/AuthContext'
import { currentDateLabel } from '../utils/formatters'
import { usePollClock } from '../hooks/usePollClock'

/* ── Party SVG logos ── */
const LotusIcon = () => (
  <svg viewBox="0 0 40 40" width="26" height="26" fill="none">
    <ellipse cx="20" cy="26" rx="5" ry="9" fill="#fff" opacity="0.95"/>
    <ellipse cx="20" cy="26" rx="5" ry="9" fill="#fff" opacity="0.95" transform="rotate(36 20 20)"/>
    <ellipse cx="20" cy="26" rx="5" ry="9" fill="#fff" opacity="0.95" transform="rotate(72 20 20)"/>
    <ellipse cx="20" cy="26" rx="5" ry="9" fill="#fff" opacity="0.95" transform="rotate(108 20 20)"/>
    <ellipse cx="20" cy="26" rx="5" ry="9" fill="#fff" opacity="0.95" transform="rotate(144 20 20)"/>
    <ellipse cx="20" cy="26" rx="5" ry="9" fill="#fff" opacity="0.95" transform="rotate(180 20 20)"/>
    <circle cx="20" cy="20" r="5" fill="#FF9933"/>
  </svg>
)

const RisingSunIcon = () => (
  <svg viewBox="0 0 40 40" width="26" height="26" fill="none">
    {[0,30,60,90,120,150,180,210,240,270,300,330].map((angle) => (
      <line key={angle}
        x1="20" y1="20"
        x2={20 + 18 * Math.cos((angle - 90) * Math.PI / 180)}
        y2={20 + 18 * Math.sin((angle - 90) * Math.PI / 180)}
        stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
    ))}
    <circle cx="20" cy="20" r="7" fill="#FFD700"/>
    <path d="M4 28 Q20 18 36 28" stroke="#FFD700" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
)

const RoosterIcon = () => (
  <svg viewBox="0 0 40 40" width="24" height="24" fill="none">
    <path d="M20 8 C14 8 11 13 11 18 C11 24 15 30 20 32 C25 30 29 24 29 18 C29 13 26 8 20 8Z" fill="#fff" opacity="0.9"/>
    <path d="M20 8 C20 8 17 4 14 5 C16 7 17 8 20 8Z" fill="#ff4444"/>
    <path d="M20 8 C20 8 18 3 21 2 C21 5 20.5 7 20 8Z" fill="#ff4444"/>
    <circle cx="17" cy="16" r="2" fill="#ff6400"/>
    <path d="M14 26 L10 34 L16 31 L20 34 L24 31 L30 34 L26 26Z" fill="#fff" opacity="0.85"/>
  </svg>
)

const StarIcon = () => (
  <svg viewBox="0 0 40 40" width="24" height="24" fill="none">
    <polygon points="20,4 23.5,14 34,14 25.5,21 28.5,32 20,25.5 11.5,32 14.5,21 6,14 16.5,14"
      fill="#FFD700" stroke="#e6b800" strokeWidth="0.5"/>
    <text x="20" y="36" textAnchor="middle" fontSize="7" fontWeight="900" fill="#FFD700" fontFamily="sans-serif">TVK</text>
  </svg>
)

const NotaIcon = () => (
  <svg viewBox="0 0 40 40" width="24" height="24" fill="none">
    <circle cx="20" cy="20" r="14" stroke="#fff" strokeWidth="2.5" opacity="0.8"/>
    <line x1="10" y1="10" x2="30" y2="30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9"/>
  </svg>
)

const PARTY_CONFIG: Record<string, {
  icon: React.ReactNode
  bg: string
  border: string
  label: string
}> = {
  bjp:   { icon: <LotusIcon />,     bg: 'linear-gradient(135deg,#FF9933,#e06500)', border: '#FF9933', label: 'BJP' },
  dmk:   { icon: <RisingSunIcon />, bg: 'linear-gradient(135deg,#dc0000,#8b0000)', border: '#dc0000', label: 'DMK' },
  inc:   { icon: <RisingSunIcon />, bg: 'linear-gradient(135deg,#dc0000,#8b0000)', border: '#dc0000', label: 'INC' },
  tvk:   { icon: <StarIcon />,      bg: 'linear-gradient(135deg,#d4a800,#a07800)', border: '#d4a800', label: 'TVK' },
  ntk:   { icon: <RoosterIcon />,   bg: 'linear-gradient(135deg,#ff6400,#c44a00)', border: '#ff6400', label: 'NTK' },
  nota:  { icon: <NotaIcon />,      bg: 'linear-gradient(135deg,#444,#222)',       border: '#666',    label: 'NOTA' },
}

function PartyLogo({ partyKey, name, size = 44 }: { partyKey: string; name: string; size?: number }) {
  const cfg = PARTY_CONFIG[partyKey]
  const bg = cfg?.bg ?? `linear-gradient(135deg,#555,#333)`
  const border = cfg?.border ?? '#666'
  const icon = cfg?.icon ?? (
    <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
      {name.slice(0, 3).toUpperCase()}
    </span>
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: bg,
      border: `2px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 2px 10px ${border}55`,
    }}>
      {icon}
    </div>
  )
}

function PartyChip({ partyKey, name }: { partyKey: string; name: string }) {
  const cfg = PARTY_CONFIG[partyKey]
  const bg = cfg?.bg ?? 'linear-gradient(135deg,#555,#333)'
  const border = cfg?.border ?? '#666'
  const icon = cfg?.icon ?? <span style={{ fontSize: 9, fontWeight: 900, color: '#fff' }}>{name.slice(0,3).toUpperCase()}</span>
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: bg, border: `1.5px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </div>
  )
}

function pct(count: number | null, total: number): number {
  if (count == null || total === 0) return 0
  return Math.round((count / total) * 100)
}

const PAGE_SIZE = 10

/* ══════════════════════════════════════════════════════════
   ADMIN DASHBOARD VIEW (src_no style, backend data)
══════════════════════════════════════════════════════════ */
function AdminDashboard({ poll, votes, onRefresh }: { poll: PollData; votes: VoteRecord[]; onRefresh: () => void }) {
  const [filterParty, setFilterParty] = useState('')
  const [filterName,  setFilterName]  = useState('')
  const [page,        setPage]        = useState(1)
  const [copied,      setCopied]      = useState(false)

  const totalVotes = poll.total_votes
  const q1Options  = poll.options.filter(o => o.question_no === 1)
  const q2Options  = poll.options.filter(o => o.question_no === 2)

  const q1Total = q1Options.reduce((s, o) => s + (o.vote_count ?? 0), 0)
  const q2Total = q2Options.reduce((s, o) => s + (o.vote_count ?? 0), 0)

  const leadingQ1 = q1Options.reduce<PollOption | null>(
    (best, o) => (o.vote_count ?? 0) > (best?.vote_count ?? -1) ? o : best, null
  )
  const leadingQ2 = q2Options.reduce<PollOption | null>(
    (best, o) => (o.vote_count ?? 0) > (best?.vote_count ?? -1) ? o : best, null
  )

  const q1Sorted = [...q1Options].sort((a, b) => (a.vote_count ?? 0) - (b.vote_count ?? 0))
  const q2Sorted = [...q2Options].sort((a, b) => (a.vote_count ?? 0) - (b.vote_count ?? 0))

  const pollUrl = `${(import.meta.env.VITE_PUBLIC_URL as string) || window.location.origin}/#poll`

  const filtered = [...votes].filter(v => {
    if (filterParty && v.q1_key !== filterParty) return false
    if (filterName  && !v.username.toLowerCase().includes(filterName.toLowerCase())) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <SectionHeader
        title="Opinion Poll Dashboard"
        icon="ph ph-megaphone"
        subtitle={`Live polling insights · ${poll.constituency_name} ${poll.constituency_no} · ${currentDateLabel()}`}
      />

      {/* Poll link banner */}
      <div className="rounded-card px-5 py-4 mb-5 flex items-center justify-between gap-4 flex-wrap"
        style={{ background: '#1a0a00', border: '1px solid #FF9933' }}>
        <div>
          <div className="text-[11px] font-extrabold text-saffron tracking-[1px] uppercase mb-1">Public Poll Link</div>
          <a href={pollUrl} target="_blank" rel="noreferrer" className="text-[13px] font-mono underline" style={{ color: '#FF9933' }}>{pollUrl}</a>
          <div className="text-[10px] text-[#888] mt-1">Share with voters — no login required</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(pollUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
              } else {
                const el = document.createElement('textarea')
                el.value = pollUrl
                el.style.position = 'fixed'; el.style.opacity = '0'
                document.body.appendChild(el); el.select()
                document.execCommand('copy')
                document.body.removeChild(el)
                setCopied(true); setTimeout(() => setCopied(false), 2000)
              }
            }}
            className="flex items-center gap-2 text-[11px] font-bold px-4 py-2 rounded-lg border-none cursor-pointer"
            style={{ background: '#FF9933', color: '#0d2455' }}
          >
            <i className={copied ? 'ph ph-check' : 'ph ph-copy'} /> {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 text-[11px] font-bold px-4 py-2 rounded-lg cursor-pointer"
            style={{ background: '#222', color: '#aaa', border: '1px solid #333' }}
          >
            <i className="ph ph-arrows-clockwise" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 sm:grid-cols-2 gap-4 mb-5">
        {[
          { icon: 'ph-users',          label: 'Total Votes',   value: totalVotes.toLocaleString('en-IN'), color: '#FF9933' },
          { icon: 'ph-trophy',         label: 'Leading Party', value: leadingQ1?.name ?? '—',            color: '#138808' },
          { icon: 'ph-flag',           label: 'Top Issue',     value: leadingQ2?.name ?? '—',            color: '#3b82f6' },
          { icon: 'ph-calendar',       label: 'Poll Date',     value: currentDateLabel(),                color: '#6b7280' },
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

        {/* Q1 Results */}
        <div className="rounded-card bg-white border border-border shadow-card overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <h3 className="text-[12px] font-extrabold text-navy uppercase tracking-[1px] flex items-center gap-2">
              <i className="ph ph-check-square text-saffron" /> Q1 — Party / Alliance Vote
            </h3>
            <span className="text-[10px] font-bold text-muted">{q1Total} votes</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {q1Sorted.map(opt => {
              const count  = opt.vote_count ?? 0
              const p      = pct(count, q1Total)
              const isTop  = opt.id === leadingQ1?.id && q1Total > 0
              return (
                <div key={opt.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <PartyChip partyKey={opt.key} name={opt.name} />
                      <span className="text-[12px] font-semibold text-navy">{opt.name}</span>
                      {isTop && <span className="text-[8px] font-bold text-[#138808] bg-[#e8f5e9] px-2 py-[2px] rounded-full">🏆 LEADING</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted">{count}</span>
                      <span className="text-[13px] font-extrabold min-w-[36px] text-right" style={{ color: opt.bar_color }}>{p}%</span>
                    </div>
                  </div>
                  <div className="h-[8px] rounded-full overflow-hidden bg-[#f0f0f0]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: opt.bar_color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Q2 Results */}
        <div className="rounded-card bg-white border border-border shadow-card overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <h3 className="text-[12px] font-extrabold text-navy uppercase tracking-[1px] flex items-center gap-2">
              <i className="ph ph-flag text-saffron" /> Q2 — Who Will Win?
            </h3>
            <span className="text-[10px] font-bold text-muted">{q2Total} votes</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {q2Sorted.map(opt => {
              const count  = opt.vote_count ?? 0
              const p      = pct(count, q2Total)
              const isTop  = opt.id === leadingQ2?.id && q2Total > 0
              return (
                <div key={opt.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <PartyChip partyKey={opt.key} name={opt.name} />
                      <span className="text-[12px] font-semibold text-navy">{opt.name}</span>
                      {isTop && <span className="text-[8px] font-bold text-[#1565c0] bg-[#e3f2fd] px-2 py-[2px] rounded-full">Top</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted">{count}</span>
                      <span className="text-[13px] font-extrabold text-navy min-w-[36px] text-right">{p}%</span>
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

      {/* Votes Table */}
      <div className="rounded-card bg-white border border-border shadow-card overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f0f0' }}>
          <h3 className="text-[12px] font-extrabold text-navy uppercase tracking-[1px] flex items-center gap-2">
            <i className="ph ph-list-bullets text-saffron" /> All Votes
          </h3>
          <span className="text-[10px] font-bold text-muted">{filtered.length} of {votes.length}</span>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 flex flex-wrap gap-3 items-center" style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
          <i className="ph ph-funnel text-[13px] text-muted" />
          <input
            type="text"
            placeholder="Search username..."
            value={filterName}
            onChange={e => { setFilterName(e.target.value); setPage(1) }}
            className="border border-border rounded px-2 py-1 text-[11px] bg-white focus:outline-none focus:border-saffron"
            style={{ width: 150 }}
          />
          <select
            value={filterParty}
            onChange={e => { setFilterParty(e.target.value); setPage(1) }}
            className="border border-border rounded px-2 py-1 text-[11px] bg-white focus:outline-none focus:border-saffron"
          >
            <option value="">All Parties</option>
            {q1Options.map(o => <option key={o.key} value={o.key}>{o.name}</option>)}
          </select>
          {(filterParty || filterName) && (
            <button onClick={() => { setFilterParty(''); setFilterName(''); setPage(1) }}
              className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
              <i className="ph ph-x" /> Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted text-[13px]">
            <i className="ph ph-chart-bar text-[32px] block mb-2 opacity-30" />
            {votes.length === 0 ? 'No votes yet.' : 'No results match your filters.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full data-table text-[12px]">
                <thead>
                  <tr>
                    <th>#</th><th>Username</th><th>IP</th>
                    <th>Q1 — Party</th><th>Q2 — Win Prediction</th><th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((v, i) => {
                    const globalIdx = filtered.length - ((page - 1) * PAGE_SIZE) - i
                    return (
                      <tr key={v.id}>
                        <td className="text-muted">{globalIdx}</td>
                        <td className="font-semibold text-navy">{v.username}</td>
                        <td className="text-muted text-[10px]">{v.voter_ip}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <PartyChip partyKey={v.q1_key} name={v.q1_option} />
                            <span className="font-semibold text-navy">{v.q1_option}</span>
                          </div>
                        </td>
                        <td className="text-navy">{v.q2_option}</td>
                        <td className="text-muted text-[10px]">
                          {new Date(v.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #f0f0f0' }}>
              <span className="text-[11px] text-muted">Page {page} of {totalPages} · {filtered.length} records</span>
              <div className="flex items-center gap-1">
                {[1, 'prev', ...Array.from({length: totalPages}, (_, i) => i+1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1), 'next', totalPages]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((p, i) =>
                    p === 'prev' ? (
                      <button key="prev" onClick={() => setPage(pg => Math.max(1, pg-1))} disabled={page===1}
                        className="px-2 py-1 rounded text-[11px] font-bold border border-border disabled:opacity-30 hover:bg-gray-50">‹</button>
                    ) : p === 'next' ? (
                      <button key="next" onClick={() => setPage(pg => Math.min(totalPages, pg+1))} disabled={page===totalPages}
                        className="px-2 py-1 rounded text-[11px] font-bold border border-border disabled:opacity-30 hover:bg-gray-50">›</button>
                    ) : (
                      <button key={p} onClick={() => setPage(p as number)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border ${page===p ? 'bg-saffron text-white border-saffron' : 'border-border hover:bg-gray-50'}`}>
                        {p}
                      </button>
                    )
                  )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   NON-ADMIN VOTING VIEW (dark themed, no percentages)
══════════════════════════════════════════════════════════ */
function VoterView({ poll, onVoted }: { poll: PollData; onVoted: (updated: PollData) => void }) {
  const { castVote, loading } = usePollAPI()
  const { showToast } = useToast()
  const clock = usePollClock()

  const [selectedQ1, setSelectedQ1] = useState<number | null>(poll.user_q1_option)
  const [selectedQ2, setSelectedQ2] = useState<number | null>(poll.user_q2_option)
  const [hasVoted,   setHasVoted]   = useState(poll.user_has_voted)

  const q1Options = poll.options.filter(o => o.question_no === 1)
  const q2Options = poll.options.filter(o => o.question_no === 2)

  const handleSubmit = async () => {
    if (!selectedQ1) { showToast('<i class="ph ph-warning"></i> Please select Q1 answer!', '#dc2626'); return }
    if (!selectedQ2) { showToast('<i class="ph ph-warning"></i> Please select Q2 answer!', '#dc2626'); return }
    const updated = await castVote(poll.id, selectedQ1, selectedQ2)
    if (updated) {
      setHasVoted(true)
      onVoted(updated)
      showToast('<i class="ph ph-check-circle"></i> Vote recorded!', '#138808')
    } else {
      showToast('<i class="ph ph-warning"></i> Could not record vote. Try again.', '#dc2626')
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5">
      <SectionHeader
        title={`Opinion Poll — ${poll.constituency_name} ${poll.constituency_no}`}
        icon="ph ph-megaphone"
        subtitle="Cast your vote · TN Assembly 2026"
      />
      <div className="rounded-[14px] overflow-hidden max-w-[720px] mx-auto"
        style={{ background: '#0d0d0d', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-[10px] border-b" style={{ borderColor: '#2a2a2a' }}>
          <div className="flex items-center gap-[10px]">
            <div className="w-2 h-2 rounded-full bg-kampr flex-shrink-0 animate-livePulse" />
            <div>
              <div className="font-inter text-[18px] font-black text-white tracking-[2px] uppercase">MAKKAL KURAL</div>
              <div className="font-tamil text-[8px] text-[#888] tracking-[2px] uppercase mt-[1px]">மக்கள் குரல் · OPINION POLL</div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-[6px] rounded-md px-[14px] py-[6px]"
              style={{ background: '#1a0a00', border: '1px solid #FF9933' }}>
              <div className="w-2 h-2 rounded-full bg-kampr animate-livePulse flex-shrink-0" />
              <span className="text-[11px] font-extrabold text-saffron tracking-[1.5px]">LIVE POLL</span>
            </div>
            <div className="text-[11px] text-[#aaa] mt-[2px] text-right">{clock}</div>
          </div>
        </div>

        {/* Ticker */}
        <div className="bg-saffron px-5 py-[10px] flex items-center gap-3 overflow-hidden">
          <span className="font-tamil text-[9px] font-extrabold text-white px-[10px] py-1 rounded-[4px] tracking-[1px] whitespace-nowrap flex-shrink-0"
            style={{ background: '#dc2626' }}>கருத்து கணிப்பு</span>
          <span className="text-[13px] font-bold text-[#1a1a1a] font-tamil whitespace-nowrap">
            மொடக்குறிச்சி தொகுதியில் யார் வெல்வார்கள்? — <span className="text-navy">Who will win Constituency 100?</span>
          </span>
        </div>

        {/* Q1 */}
        <div className="px-5 py-4" style={{ background: '#0d0d0d', borderTop: '1px solid #222' }}>
          <div className="text-[9px] text-saffron font-extrabold tracking-[1.5px] uppercase mb-2">கேள்வி 1 OF 2 · QUESTION 1</div>
          <div className="font-tamil text-[18px] font-extrabold text-white leading-[1.4] mb-[6px]">இந்த தேர்தலில் நீங்கள் யாருக்கு வாக்களிப்பீர்கள்?</div>
          <div className="text-[11px] text-[#888]">Which alliance/party would you vote for?</div>
        </div>
        <div>
          {q1Options.map(opt => {
            const isSelected = selectedQ1 === opt.id
            return (
              <div key={opt.id}
                onClick={() => !hasVoted && setSelectedQ1(opt.id)}
                className="flex items-center gap-[14px] px-5 py-[14px] transition-all duration-200"
                style={{
                  borderLeft: `3px solid ${isSelected ? '#FF9933' : 'transparent'}`,
                  background: isSelected ? '#1a0e00' : '#0d0d0d',
                  borderBottom: '1px solid #1a1a1a',
                  cursor: hasVoted ? 'default' : 'pointer',
                }}
              >
                <PartyLogo partyKey={opt.key} name={opt.name} size={48} />
                <div className="flex-1">
                  <div className="text-[16px] font-extrabold text-white">{opt.name}</div>
                  {opt.name_ta && <div className="font-tamil text-[10px] text-[#888] mt-[2px]">{opt.name_ta}</div>}
                </div>
                <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                  style={{ borderColor: isSelected ? '#FF9933' : '#555', background: isSelected ? '#FF9933' : 'transparent' }}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            )
          })}
        </div>

        {/* Q2 */}
        <div className="px-5 py-5" style={{ background: '#0a0a0a', borderTop: '2px solid #222' }}>
          <div className="text-[9px] text-saffron font-extrabold tracking-[1.5px] uppercase mb-2">கேள்வி 2 OF 2 · QUESTION 2</div>
          <div className="font-tamil text-[17px] font-extrabold text-white mb-1">மொடக்குறிச்சியில் யார் வெற்றி பெறுவார்கள்?</div>
          <div className="text-[10px] text-[#777] mb-4">Who do you think will win?</div>
          <div className="grid grid-cols-2 gap-3">
            {q2Options.map(c => {
              const isSelected = selectedQ2 === c.id
              return (
                <div key={c.id}
                  onClick={() => !hasVoted && setSelectedQ2(c.id)}
                  className="rounded-[10px] p-[14px] flex items-center gap-3 transition-all duration-200"
                  style={{
                    background: isSelected ? '#1a0e00' : '#111',
                    border: `1px solid ${isSelected ? '#FF9933' : '#2a2a2a'}`,
                    cursor: hasVoted ? 'default' : 'pointer',
                  }}
                >
                  <PartyLogo partyKey={c.key} name={c.name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-extrabold text-white">{c.name}</div>
                    {c.sub_label && <div className="text-[9px] text-[#888] mt-[2px]">{c.sub_label}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer / Submit */}
        <div className="flex items-center justify-between px-5 py-[14px] flex-wrap gap-[10px]"
          style={{ background: '#111', borderTop: '2px solid #222' }}>
          <div className="text-[11px] text-[#666]">
            மொத்த வாக்குகள் / Total Votes: <span className="text-saffron font-extrabold">{poll.total_votes.toLocaleString('en-IN')}</span>
          </div>
          {hasVoted ? (
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#138808] px-5 py-[10px] rounded-md"
              style={{ background: '#0a1a0a', border: '1px solid #138808' }}>
              <i className="ph ph-check-circle text-[14px]" /> Vote Recorded
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="font-inter text-[11px] font-black text-navy px-7 py-[10px] rounded-md uppercase tracking-[1px] transition-all duration-150 border-none cursor-pointer bg-saffron hover:bg-saffron-dark disabled:opacity-50"
            >
              <i className="ph ph-paper-plane-tilt mr-1" /> Submit Vote
            </button>
          )}
        </div>

        <div className="font-tamil text-[8.5px] text-[#444] text-center px-5 py-[10px]"
          style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}>
          இந்த கருத்துக் கணிப்பு தேர்தல் முடிவுகளை உத்தரவாதப்படுத்துவதில்லை · For informational purposes only
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function OpinionPollPage() {
  const { fetchActivePoll, fetchVotesList } = usePollAPI()
  const { user } = useAuthContext()
  const isAdmin = user?.role === 'admin'

  const [poll,      setPoll]      = useState<PollData | null>(null)
  const [votes,     setVotes]     = useState<VoteRecord[]>([])
  const [loading,   setLoading]   = useState(true)
  const [fetchErr,  setFetchErr]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchErr(false)
    const data = await fetchActivePoll()
    if (!data) { setFetchErr(true); setLoading(false); return }
    setPoll(data)
    if (isAdmin) {
      const voteData = await fetchVotesList(data.id)
      if (voteData) setVotes(voteData)
    }
    setLoading(false)
  }, [fetchActivePoll, fetchVotesList, isAdmin])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-5">
        <SectionHeader title="Opinion Poll" icon="ph ph-megaphone" subtitle="Loading..." />
        <div className="flex items-center justify-center py-20 text-[#888]">
          <i className="ph ph-circle-notch animate-spin text-saffron text-[32px] mr-3" />
          <span>Loading poll data...</span>
        </div>
      </div>
    )
  }

  if (fetchErr || !poll) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-5">
        <SectionHeader title="Opinion Poll" icon="ph ph-megaphone" subtitle="No active poll" />
        <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-[14px]"
          style={{ background: '#111' }}>
          <i className="ph ph-megaphone text-[40px] text-[#444]" />
          <p className="text-[#888] text-[14px]">No active poll at the moment.</p>
        </div>
      </div>
    )
  }

  if (isAdmin) {
    return <AdminDashboard poll={poll} votes={votes} onRefresh={load} />
  }

  return <VoterView poll={poll} onVoted={updated => setPoll(updated)} />
}
