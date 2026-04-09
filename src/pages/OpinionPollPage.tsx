import React, { useState, useEffect, useCallback } from 'react'
import bjpLogo      from '../assets/logo/bjp-seeklogo.png'
import dmkLogo from '../assets/logo/dmk-logo.png'
import ntkLogo      from '../assets/logo/ntk_logo.png'
import tvkLogo      from '../assets/logo/tvk_logo.png'
import notaLogo     from '../assets/logo/nota-logo.png'
import bjpCandidatePhoto from '../assets/pictures/candidates/bjp-c.jpg.jpeg'
import dmkCandidatePhoto from '../assets/pictures/candidates/dmk-c.jpg.jpeg'
import ntkCandidatePhoto from '../assets/pictures/candidates/ntk-c.jpg.jpeg'
import tvkCandidatePhoto from '../assets/pictures/candidates/tvk-c.jpg.jpeg'
import SectionHeader from '../components/ui/SectionHeader'
import { usePollAPI } from '../hooks/usePollAPI'
import type { PollData, PollOption, VoteRecord } from '../hooks/usePollAPI'
import { useToast } from '../context/ToastContext'
import { useAuthContext } from '../context/AuthContext'
import { currentDateLabel } from '../utils/formatters'
import { usePollClock } from '../hooks/usePollClock'

type PartyConfig = {
  logo: string
  border: string
  label: string
  candidateName?: string
  candidateImage?: string
  constituencyTa?: string
}

const PARTY_CONFIG: Record<string, PartyConfig> = {
  bjp:   { logo: bjpLogo,  border: '#FF9933', label: 'BJP', candidateName: 'S கிருத்திகா', candidateImage: bjpCandidatePhoto, constituencyTa: 'மொடக்குறிச்சி' },
  dmk:   { logo: dmkLogo,  border: '#dc0000', label: 'DMK', candidateName: 'செந்தில்நாதன்', candidateImage: dmkCandidatePhoto, constituencyTa: 'மொடக்குறிச்சி' },
  inc:   { logo: dmkLogo,  border: '#dc0000', label: 'INC' },
  tvk:   { logo: tvkLogo,  border: '#d4a800', label: 'TVK', candidateName: 'டி. சண்முகம்', candidateImage: tvkCandidatePhoto, constituencyTa: 'மொடக்குறிச்சி' },
  ntk:   { logo: ntkLogo,  border: '#ff6400', label: 'NTK', candidateName: 'அருண்', candidateImage: ntkCandidatePhoto, constituencyTa: 'மொடக்குறிச்சி' },
  nota:  { logo: notaLogo, border: '#666',    label: 'NOTA' },
}

function PartyLogo({ partyKey, name, size = 44 }: { partyKey: string; name: string; size?: number }) {
  const cfg = PARTY_CONFIG[partyKey]
  const border = cfg?.border ?? '#666'
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: '#fff',
      border: `2px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 2px 10px ${border}55`,
    }}>
      {cfg?.logo
        ? <img src={cfg.logo} alt={name} style={{ width: size * 0.65, height: size * 0.65, objectFit: 'contain' }} />
        : <span style={{ fontSize: 10, fontWeight: 900, color: '#555', lineHeight: 1 }}>{name.slice(0, 3).toUpperCase()}</span>
      }
    </div>
  )
}

function PartyChip({ partyKey, name }: { partyKey: string; name: string }) {
  const cfg = PARTY_CONFIG[partyKey]
  const border = cfg?.border ?? '#666'
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: '#fff', border: `1.5px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {cfg?.logo
        ? <img src={cfg.logo} alt={name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
        : <span style={{ fontSize: 9, fontWeight: 900, color: '#555' }}>{name.slice(0,3).toUpperCase()}</span>
      }
    </div>
  )
}

function CandidateAvatar({ partyKey, name, size = 36 }: { partyKey: string; name: string; size?: number }) {
  const cfg = PARTY_CONFIG[partyKey]
  if (!cfg?.candidateImage) return null
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      overflow: 'hidden',
      background: '#f7f1ea',
      border: `1.5px solid ${cfg.border}`,
      boxShadow: `0 2px 10px ${cfg.border}33`,
    }}>
      <img
        src={cfg.candidateImage}
        alt={`${cfg.candidateName ?? name} portrait`}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}

function pct(count: number | null, total: number): number {
  if (count == null || total === 0) return 0
  return Math.round((count / total) * 100)
}

function getCandidateDetails(partyKey: string) {
  const cfg = PARTY_CONFIG[partyKey]
  if (!cfg?.candidateName) return null
  return {
    name: cfg.candidateName,
    constituencyTa: cfg.constituencyTa,
  }
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

  const q1Total = q1Options.reduce((s, o) => s + (o.vote_count ?? 0), 0)

  const leadingQ1 = q1Options.reduce<PollOption | null>(
    (best, o) => (o.vote_count ?? 0) > (best?.vote_count ?? -1) ? o : best, null
  )

  const q1Sorted = [...q1Options].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))

const pollUrl = `${window.location.origin}/#modakurichi`

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
            onClick={() => {
              const waText = `🏵 மக்கள் கருத்து கணிப்பு 2026\nமொடக்குறிச்சி தொகுதி 100 — யார் வெல்வார்கள்?\n\n${pollUrl}\n\nவாக்களித்து நண்பர்களுக்கும் அனுப்புங்கள்! 🪷`
              window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank')
            }}
            className="flex items-center gap-2 text-[11px] font-bold px-4 py-2 rounded-lg border-none cursor-pointer"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <i className="ph ph-whatsapp-logo" /> Share
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
              <i className="ph ph-check-square text-saffron" />  Party / Alliance Vote
            </h3>
            <span className="text-[10px] font-bold text-muted">{q1Total} votes</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {q1Sorted.map(opt => {
              const count  = opt.vote_count ?? 0
              const p      = pct(count, q1Total)
              const isTop  = opt.id === leadingQ1?.id && q1Total > 0
              const candidate = getCandidateDetails(opt.key)
              return (
                <div key={opt.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <PartyChip partyKey={opt.key} name={opt.name} />
                      <CandidateAvatar partyKey={opt.key} name={opt.name} size={28} />
                      <div>
                        <div className="text-[12px] font-semibold text-navy">{opt.name}</div>
                        {candidate && (
                          <div className="font-tamil text-[10px] text-muted mt-[2px]">
                            {candidate.name}
                            {candidate.constituencyTa ? ` · ${candidate.constituencyTa}` : ''}
                          </div>
                        )}
                      </div>
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

      
      </div>

      {/* Votes Table */}
    
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
  const [hasVoted,   setHasVoted]   = useState(poll.user_has_voted)

  const q1All     = poll.options.filter(o => o.question_no === 1)
  const q1Options = q1All.filter(o => o.key !== 'nota')
  const q1Nota    = q1All.find(o => o.key === 'nota') ?? null

  const pollUrl = `${window.location.origin}/#modakurichi`

  const handleSubmit = async () => {
    if (!selectedQ1) { showToast('<i class="ph ph-warning"></i> Please select your vote!', '#dc2626'); return }
    const updated = await castVote(poll.id, selectedQ1)
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
          <div className="text-[9px] text-saffron font-extrabold tracking-[1.5px] uppercase mb-2">கேள்வி · QUESTION</div>
          <div className="font-tamil text-[18px] font-extrabold text-white leading-[1.4] mb-[6px]">இந்த தேர்தலில் நீங்கள் யாருக்கு வாக்களிப்பீர்கள்?</div>
          <div className="text-[11px] text-[#888]">Which alliance/party would you vote for?</div>
        </div>
        <div>
          {q1Options.map(opt => {
            const isSelected = selectedQ1 === opt.id
            const candidate = getCandidateDetails(opt.key)
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
                <div className="flex items-center gap-[10px]">
                  <PartyLogo partyKey={opt.key} name={opt.name} size={48} />
                  <CandidateAvatar partyKey={opt.key} name={opt.name} size={48} />
                </div>
                <div className="flex-1">
                  <div className="text-[16px] font-extrabold text-white">{opt.name}</div>
                  {candidate && (
                    <div className="font-tamil text-[11px] text-saffron mt-[2px]">
                      {candidate.name}
                      {candidate.constituencyTa ? ` · ${candidate.constituencyTa}` : ''}
                    </div>
                  )}
                  {opt.name_ta && <div className="font-tamil text-[10px] text-[#888] mt-[2px]">{opt.name_ta}</div>}
                </div>
                <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                  style={{ borderColor: isSelected ? '#FF9933' : '#555', background: isSelected ? '#FF9933' : 'transparent' }}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            )
          })}
          {(() => {
            const isSelected = q1Nota ? selectedQ1 === q1Nota.id : false
            const canSelect  = !hasVoted && !!q1Nota
            return (
              <div
                onClick={() => canSelect && setSelectedQ1(q1Nota!.id)}
                className="flex items-center gap-[14px] px-5 py-[14px] transition-all duration-200"
                style={{
                  borderLeft: `3px solid ${isSelected ? '#666' : 'transparent'}`,
                  background: isSelected ? '#141414' : '#0d0d0d',
                  borderTop: '1px solid #2a2a2a',
                  cursor: canSelect ? 'pointer' : 'default',
                  opacity: q1Nota ? 1 : 0.4,
                }}
              >
                <PartyLogo partyKey="nota" name="NOTA" size={48} />
                <div className="flex-1">
                  <div className="text-[16px] font-extrabold text-[#aaa]">NOTA</div>
                  <div className="font-tamil text-[10px] text-[#666] mt-[2px]">மேற்கண்ட யாருமில்லை · None of the Above</div>
                </div>
                <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                  style={{ borderColor: isSelected ? '#999' : '#444', background: isSelected ? '#666' : 'transparent' }}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            )
          })()}
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

        <div className="text-center px-5 py-[10px]" style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}>
          <a href={pollUrl} target="_blank" rel="noreferrer"
            className="font-mono text-[11px] underline" style={{ color: '#FF9933', wordBreak: 'break-all' }}>
            {pollUrl}
          </a>
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
