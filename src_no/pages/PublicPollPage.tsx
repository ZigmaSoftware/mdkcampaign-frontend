import { useState, useEffect } from 'react'

/* ── Types ── */
interface PollVote {
  username: string
  phone: string
  city: string
  q1: string
  q2: string
  comment: string
  timestamp: string
}

/* ── Constants ── */
const LS_VOTED = 'mkural_has_voted'
const LS_VOTES = 'mkural_votes'

const SEED: Record<string, number> = { bjp: 2841, dmk: 1124, tvk: 498, ntk: 212, other: 146, nota: 0 }
const SEED_TOTAL = Object.values(SEED).reduce((a, b) => a + b, 0)

const Q1_OPTIONS = [
  {
    key: 'bjp',
    flag: '🪷',
    flagBg: '#FF9933',
    flagColor: '#fff',
    strip: '#FF9933',
    name: 'ADMK + BJP',
    nameTa: 'அதிமுக + பாஜக கூட்டணி',
    cand: '',
  },
  {
    key: 'dmk',
    flag: 'INC\nDMK',
    flagBg: '#dc0000',
    flagColor: '#fff',
    strip: '#dc0000',
    name: 'DMK + INC',
    nameTa: 'திமுக + காங்கிரஸ் கூட்டணி',
    cand: '',
  },
    {
    key: 'ntk',
    flag: 'NTK',
    flagBg: '#ff6400',
    flagColor: '#fff',
    strip: '#ff6400',
    name: 'Naam Tamilar Katchi',
    nameTa: 'நாம் தமிழர் கட்சி',
    cand: '',
  },
    {
    key: 'nota',
    flag: '✗',
    flagBg: '#555',
    flagColor: '#fff',
    strip: '#666',
    name: 'NOTA',
    nameTa: 'மேற்கண்ட எவரும் இல்லை / None of the Above',
    cand: '',
  },
  {
    key: 'tvk',
    flag: 'TVK',
    flagBg: '#ffc800',
    flagColor: '#0a0a14',
    strip: '#ffc800',
    name: 'TVK',
    nameTa: 'தமிழக வெற்றி கழகம்',
    cand: '',
  },

]

const Q2_ISSUES = [
  { key: 'healthcare',  text: '🏥 சுகாதாரம் / Healthcare' },
  { key: 'employment',  text: '💼 வேலைவாய்ப்பு / Employment & Jobs' },
  { key: 'roads',       text: '🛣️ சாலை & உள்கட்டமைப்பு / Roads & Infrastructure' },
  { key: 'education',   text: '📚 கல்வி / Education' },
  { key: 'water',       text: '💧 குடிநீர் / Drinking Water' },
  { key: 'agriculture', text: '🌾 விவசாயம் / Agriculture & Farmers' },
  { key: 'womensafety', text: '🛡️ பெண்களின் பாதுகாப்பு / Women Safety' },
  { key: 'pricerise',   text: '📈 விலைவாசி / Price Rise & Inflation' },
]

const CITIES = ['Arachalur', 'Avalpoondurai', 'Nanjai Uthukuli', 'Elumathur', 'Lakkapuram']

/* ── Helpers ── */
function loadVotes(): PollVote[] {
  try { return JSON.parse(localStorage.getItem(LS_VOTES) || '[]') } catch { return [] }
}

function saveVote(v: PollVote) {
  const arr = loadVotes(); arr.push(v)
  localStorage.setItem(LS_VOTES, JSON.stringify(arr))
  localStorage.setItem(LS_VOTED, '1')
}

function updateLastVoteQ2(q2: string, comment: string) {
  const arr = loadVotes()
  if (arr.length) { arr[arr.length - 1].q2 = q2; arr[arr.length - 1].comment = comment; localStorage.setItem(LS_VOTES, JSON.stringify(arr)) }
}

/* ── Component ── */
export default function PublicPollPage() {
  const [, setVotes]      = useState<PollVote[]>([])
  const [hasVoted,    setHasVoted]   = useState(false)
  const [registered,  setRegistered] = useState(false)
  const [username,    setUsername]   = useState('')
  const [phone,       setPhone]      = useState('')
  const [city,        setCity]       = useState('')
  const [selQ1,       setSelQ1]      = useState<string | null>(null)
  const [selQ2,       setSelQ2]      = useState<string | null>(null)
  const [comment,     setComment]    = useState('')
  const [q2Submitted, setQ2Submitted] = useState(false)
  const [dispCount,   setDispCount]  = useState(SEED_TOTAL)
  const [clock,       setClock]      = useState('')
  const [copyDone,    setCopyDone]   = useState(false)

  useEffect(() => {
    const v = loadVotes()
    setVotes(v)
    setDispCount(SEED_TOTAL + v.length)
    if (localStorage.getItem(LS_VOTED)) {
      setHasVoted(true)
      setRegistered(true)
      const last = v[v.length - 1]
      if (last) {
        setUsername(last.username || '')
        setPhone(last.phone || '')
        setCity(last.city || '')
        if (last.q2) { setSelQ2(last.q2); setQ2Submitted(true) }
        if (last.comment) setComment(last.comment)
      }
    }

    const fmt = () => {
      const n = new Date()
      const h = n.getHours(), m = n.getMinutes().toString().padStart(2, '0')
      const ap = h >= 12 ? 'PM' : 'AM', hh = (h % 12 || 12).toString().padStart(2, '0')
      setClock(`${hh}:${m} ${ap}`)
    }
    fmt()
    const ci = setInterval(fmt, 30000)
    const ti = setInterval(() => {
      if (Math.random() < 0.3) setDispCount(c => c + Math.floor(Math.random() * 3) + 1)
    }, 3000)
    return () => { clearInterval(ci); clearInterval(ti) }
  }, [])

  const handleRegister = () => {
    if (!username.trim() || !phone.trim() || !city) return
    setRegistered(true)
  }

  const handleSubmit = () => {
    if (!selQ1 || hasVoted) return
    const v: PollVote = { username, phone, city, q1: selQ1, q2: '', comment: '', timestamp: new Date().toISOString() }
    saveVote(v)
    setVotes(loadVotes())
    setDispCount(c => c + 1)
    setHasVoted(true)
  }

  const handleQ2Submit = () => {
    if (!selQ2) return
    updateLastVoteQ2(selQ2, comment)
    setQ2Submitted(true)
  }

  const getShareUrl = () => {
    const token = btoa('poll-system').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return `${window.location.origin}/s/${token}`
  }

  const handleShare = (p: 'wa' | 'fb' | 'li' | 'copy') => {
    const url = getShareUrl()
    const waText = `🏵 மக்கள் கருத்து கணிப்பு 2026\nமொடக்குறிச்சி தொகுதி 100 — யார் வெல்வார்கள்?\n\n${url}\n\nவாக்களித்து நண்பர்களுக்கும் அனுப்புங்கள்! 🪷`
    const liText = [
      `🗳️ MODAKKURICHI CONSTITUENCY 100 — PUBLIC OPINION POLL 2026`,
      ``,
      `Cast your vote and make your voice heard ahead of the Tamil Nadu Assembly Election 2026!`,
      ``,
      `📊 Live results from thousands of voters`,
      `🔐 Your response is completely confidential`,
      `⏱️ Takes less than 30 seconds`,
      ``,
      `👉 Participate here: ${url}`,
      ``,
      `Share with your friends and family — every vote counts! 🪷`,
      ``,
      `#TNElections2026 #Modakkurichi #OpinionPoll #TamilNadu #BJP #ADMK #AssemblyElections`,
    ].join('\n')
    if (p === 'wa')   window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank')
    if (p === 'fb')   window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
    if (p === 'li')   window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(liText)}`, '_blank')
    if (p === 'copy') navigator.clipboard?.writeText(url).then(() => { setCopyDone(true); setTimeout(() => setCopyDone(false), 2000) })
  }

  const ticker = 'BREAKING: மொடக்குறிச்சி தொகுதி 100 — மக்கள் கருத்துக் கணிப்பு 2026 || தமிழ்நாடு சட்டமன்றத் தேர்தல் — 23 ஏப்ரல் 2026 || ADMK + BJP · DMK + INC · TVK · NTK · NOTA || உங்கள் கருத்து பதிவு செய்யுங்கள் — CAST YOUR OPINION VOTE NOW   '
  const F  = "'Barlow Condensed','Rajdhani',sans-serif"
  const TA = "'Noto Sans Tamil',sans-serif"

  const canRegister = username.trim() && phone.trim() && city

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '0 0 32px', fontFamily: F, color: '#111' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700;800&family=Barlow+Condensed:wght@600;700;800;900&family=Rajdhani:wght@600;700&display=swap');
        .mk-ticker { animation: mkTicker 22s linear infinite; display: inline-block; white-space: nowrap; }
        @keyframes mkTicker { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }
        .mk-blink  { animation: mkBlink 1.5s ease-in-out infinite; }
        @keyframes mkBlink { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .mk-opt    { cursor: pointer; transition: background 0.15s; user-select: none; }
        .mk-opt:hover { background: #fff8f0 !important; }
        .mk-voted  { cursor: default !important; }
        .mk-voted.mk-opt:hover { background: #fff !important; }
        .mk-q2opt  { cursor: pointer; transition: all 0.15s; user-select: none; }
        .mk-q2opt:hover { border-color: #FF9933 !important; background: #fff8f0 !important; }
        .mk-btn    { cursor: pointer; transition: transform 0.15s; }
        .mk-btn:active { transform: scale(.97); }
        .mk-input  { width: 100%; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 14px; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.15s; background: #fff; }
        .mk-input:focus { border-color: #FF9933; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 520, boxShadow: '0 4px 32px rgba(0,0,0,.12)' }}>

        {/* ── Ticker ── */}
        <div style={{ background: '#cc0000', padding: '5px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span className="mk-ticker" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: '#fff', padding: '0 20px' }}>
            🔴 {ticker}🔴 {ticker}
          </span>
        </div>

        {/* ── Channel Bar ── */}
        <div style={{ background: 'linear-gradient(90deg,#fff7ee,#fff3e0,#fff7ee)', borderBottom: '3px solid #FF9933', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="mk-blink" style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF9933', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: '#e06500' }}>MAKKAL KURAL</div>
              <div style={{ fontFamily: TA, fontSize: 9, color: '#888', letterSpacing: 1, marginTop: 1 }}>மக்கள் குரல் · OPINION POLL</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mk-blink" style={{ background: '#cc0000', color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: 2, padding: '3px 10px', borderRadius: 3 }}>🔴 LIVE POLL</div>
            <div style={{ fontSize: 11, color: '#999', letterSpacing: 1, marginTop: 2 }}>{clock}</div>
          </div>
        </div>

        {/* ── Headline Strip ── */}
        <div style={{ background: 'linear-gradient(90deg,#FF9933,#e06500)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#cc0000', color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: 2, padding: '3px 8px', borderRadius: 2, flexShrink: 0, fontFamily: TA }}>கருத்து கணிப்பு</div>
          <div style={{ fontFamily: TA, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
            மொடக்குறிச்சி தொகுதியில் யார் வெல்வார்கள்? — <span style={{ color: '#fff3e0' }}>Who will win Constituency 100?</span>
          </div>
        </div>

        {/* ── Step 1: Registration Form ── */}
        {!registered && (
          <div style={{ background: '#fff8f0', padding: '18px 16px', borderBottom: '1px solid #ffe0b2' }}>
            <div style={{ fontSize: 10, color: '#FF9933', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>உங்கள் விவரங்கள் · YOUR DETAILS</div>
            <div style={{ fontFamily: TA, fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
              வாக்களிக்க முன் உங்கள் விவரங்களை பதிவு செய்யுங்கள்
            </div>
            <div style={{ fontFamily: TA, fontSize: 11, color: '#888', marginBottom: 16 }}>Please enter your details before casting your vote</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontFamily: TA, fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  👤 பெயர் / Name <span style={{ color: '#cc0000' }}>*</span>
                </label>
                <input className="mk-input" type="text" placeholder="உங்கள் பெயர் / Your name" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div>
                <label style={{ fontFamily: TA, fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  📱 தொலைபேசி எண் / Phone Number <span style={{ color: '#cc0000' }}>*</span>
                </label>
                <input className="mk-input" type="tel" placeholder="10 digit mobile number" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} />
              </div>
              <div>
                <label style={{ fontFamily: TA, fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  📍 நகரம் / City <span style={{ color: '#cc0000' }}>*</span>
                </label>
                <select className="mk-input" value={city} onChange={e => setCity(e.target.value)}>
                  <option value="">-- நகரத்தை தேர்வு செய்யுங்கள் / Select City --</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button
                className="mk-btn"
                onClick={handleRegister}
                disabled={!canRegister}
                style={{
                  marginTop: 4, width: '100%', padding: 13, border: 'none', borderRadius: 6,
                  fontFamily: F, fontSize: 15, fontWeight: 900, letterSpacing: 2,
                  background: canRegister ? 'linear-gradient(135deg,#FF9933,#e06500)' : '#e0e0e0',
                  color: canRegister ? '#fff' : '#aaa',
                  cursor: canRegister ? 'pointer' : 'default',
                }}
              >
                தொடரவும் / CONTINUE →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Constituency Header + Poll ── */}
        {registered && (
          <>
            <div style={{ background: '#fff', padding: '14px 16px', borderBottom: '1px solid #ffe0b2' }}>
              <div style={{ fontSize: 10, color: '#FF9933', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>TAMIL NADU ASSEMBLY ELECTION 2026</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', letterSpacing: 1, lineHeight: 1 }}>MODAKKURICHI</div>
              <div style={{ fontFamily: TA, fontSize: 14, color: '#666', marginTop: 2 }}>மொடக்குறிச்சி — தொகுதி எண் 100 — ஈரோடு மாவட்டம்</div>
              <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  { v: '2,42,185',                       l: 'வாக்காளர்கள் / VOTERS' },
                  { v: '274',                             l: 'வாக்கு சாவடிகள் / BOOTHS' },
                  { v: dispCount.toLocaleString('en-IN'), l: 'வாக்குகள் / VOTES CAST' },
                ].map(({ v, l }) => (
                  <div key={l}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#e06500' }}>{v}</div>
                    <div style={{ fontFamily: TA, fontSize: 9, color: '#999', letterSpacing: 0.5 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Q1 Question ── */}
            <div style={{ background: '#fff8f0', padding: '14px 16px 8px', borderBottom: '1px solid #ffe0b2' }}>
              <div style={{ fontSize: 10, color: '#FF9933', fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>கேள்வி 1 OF 2 · QUESTION 1</div>
              <div style={{ fontFamily: TA, fontSize: 16, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.4, marginBottom: 4 }}>
                இந்த தேர்தலில் நீங்கள் யாருக்கு வாக்களிப்பீர்கள்?
              </div>
              <div style={{ fontFamily: TA, fontSize: 11, color: '#888' }}>If elections were held today, which alliance/party would you vote for?</div>
            </div>

            {/* ── Q1 Options ── */}
            <div style={{ background: '#fff' }}>
              {Q1_OPTIONS.map((opt) => {
                const isSel = selQ1 === opt.key
                return (
                  <div
                    key={opt.key}
                    className={`mk-opt${hasVoted ? ' mk-voted' : ''}`}
                    onClick={() => !hasVoted && setSelQ1(opt.key)}
                    style={{
                      padding: '10px 0', borderBottom: '1px solid #f5e6d0',
                      background: isSel && !hasVoted ? '#fff8f0' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
                      <div style={{ width: 4, flexShrink: 0, alignSelf: 'stretch', borderRadius: 2, minHeight: 44, background: opt.strip }} />
                      <div style={{
                        width: 36, height: 36, flexShrink: 0, borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: opt.flagBg, color: opt.flagColor,
                        fontSize: opt.key === 'bjp' ? 18 : 11, fontWeight: 900, lineHeight: 1.1,
                        whiteSpace: 'pre', textAlign: 'center', fontFamily: F,
                      }}>
                        {opt.flag}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', letterSpacing: 0.5, lineHeight: 1.1 }}>{opt.name}</div>
                        <div style={{ fontFamily: TA, fontSize: 10, color: '#888', marginTop: 1 }}>{opt.nameTa}</div>
                        {opt.cand && <div style={{ fontFamily: TA, fontSize: 10, color: '#e06500', marginTop: 2 }}>{opt.cand}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {hasVoted && isSel && (
                          <div style={{ fontFamily: TA, fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 2, background: '#FF9933', color: '#fff' }}>
                            உங்கள் வாக்கு
                          </div>
                        )}
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${isSel ? '#FF9933' : '#ddd'}`,
                          background: isSel ? '#FF9933' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSel && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Vote Button ── */}
            {!hasVoted && (
              <div style={{ padding: '14px 16px', background: '#fff', borderTop: '1px solid #ffe0b2' }}>
                <button
                  className="mk-btn"
                  onClick={handleSubmit}
                  disabled={!selQ1}
                  style={{
                    width: '100%', padding: 14, border: 'none', borderRadius: 6,
                    fontFamily: F, fontSize: 16, fontWeight: 900, letterSpacing: 2,
                    background: selQ1 ? 'linear-gradient(135deg,#FF9933,#e06500)' : '#e0e0e0',
                    color: selQ1 ? '#fff' : '#aaa',
                    cursor: selQ1 ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {selQ1 ? 'வாக்களிக்கவும் / SUBMIT VOTE →' : 'முதலில் ஒரு கட்சியை தேர்வு செய்யுங்கள்'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#aaa', fontFamily: 'Rajdhani, sans-serif' }}>
                  மொத்தம் <b style={{ color: '#666' }}>{dispCount.toLocaleString('en-IN')}</b> பேர் வாக்களித்துள்ளனர்
                </div>
              </div>
            )}

            {/* ── Voted Message ── */}
            {hasVoted && (
              <div style={{ textAlign: 'center', padding: '14px 16px', background: '#fff8f0', borderTop: '1px solid #ffe0b2' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
                <div style={{ fontFamily: TA, fontSize: 14, fontWeight: 700, color: '#e06500', marginBottom: 4 }}>
                  உங்கள் வாக்கு பதிவாகிவிட்டது!
                </div>
                <div style={{ fontFamily: TA, fontSize: 12, color: '#666' }}>
                  Your vote has been recorded successfully.<br />
                  இந்த கருத்துக் கணிப்பை நண்பர்களுக்கும் அனுப்புங்கள்!
                </div>
              </div>
            )}

            {/* ── Q2 — Issues (shown after voting) ── */}
            {hasVoted && (
              <div style={{ padding: '14px 16px', background: '#fff8f0', borderTop: '2px solid #ffe0b2' }}>
                <div style={{ fontSize: 10, color: '#FF9933', fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>கேள்வி 2 OF 2 · QUESTION 2</div>
                <div style={{ fontFamily: TA, fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
                  இந்தத் தொகுதியில் மிக முக்கியமான பிரச்சினை என்ன?
                </div>
                <div style={{ fontFamily: TA, fontSize: 11, color: '#888', marginBottom: 14 }}>What is the most important issue in your constituency?</div>

                {q2Submitted ? (
                  <div style={{ textAlign: 'center', padding: '14px', background: '#fff', borderRadius: 8, border: '1px solid #ffe0b2' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>✅</div>
                    <div style={{ fontFamily: TA, fontSize: 13, color: '#e06500', fontWeight: 700 }}>உங்கள் கருத்து பதிவாகிவிட்டது!</div>
                    <div style={{ fontFamily: TA, fontSize: 11, color: '#888', marginTop: 4 }}>Your response has been recorded.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {Q2_ISSUES.map((issue) => {
                        const isSel = selQ2 === issue.key
                        return (
                          <div
                            key={issue.key}
                            className="mk-q2opt"
                            onClick={() => setSelQ2(issue.key)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px', borderRadius: 5,
                              border: `1px solid ${isSel ? '#FF9933' : '#e0e0e0'}`,
                              background: isSel ? '#fff3e0' : '#fff',
                            }}
                          >
                            <div style={{
                              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                              border: `2px solid ${isSel ? '#FF9933' : '#ccc'}`,
                              background: isSel ? '#FF9933' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isSel && <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />}
                            </div>
                            <div style={{ fontFamily: TA, fontSize: 12, color: isSel ? '#e06500' : '#333', fontWeight: isSel ? 700 : 400 }}>
                              {issue.text}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Comment box */}
                    <div style={{ marginTop: 14 }}>
                      <label style={{ fontFamily: TA, fontSize: 11, color: '#555', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                        💬 கூடுதல் கருத்து / Additional Comment <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span>
                      </label>
                      <textarea
                        className="mk-input"
                        rows={3}
                        placeholder="உங்கள் கருத்தை இங்கே தெரிவிக்கலாம் / Type your comment here..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        style={{ resize: 'vertical', fontFamily: "'Noto Sans Tamil',sans-serif" }}
                      />
                    </div>

                    <button
                      className="mk-btn"
                      onClick={handleQ2Submit}
                      disabled={!selQ2}
                      style={{
                        marginTop: 12, width: '100%', padding: 12, border: 'none', borderRadius: 6,
                        fontFamily: F, fontSize: 15, fontWeight: 900, letterSpacing: 2,
                        background: selQ2 ? 'linear-gradient(135deg,#FF9933,#e06500)' : '#e0e0e0',
                        color: selQ2 ? '#fff' : '#aaa',
                        cursor: selQ2 ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      {selQ2 ? 'கருத்து பதிவு செய்யுங்கள் / SUBMIT →' : 'ஒரு பிரச்சினையை தேர்வு செய்யுங்கள்'}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Share Bar ── */}
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #ffe0b2' }}>
          <div style={{ fontSize: 10, color: '#aaa', fontWeight: 700, letterSpacing: 1.5, textAlign: 'center', marginBottom: 8, fontFamily: F }}>SHARE THIS POLL</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { label: '💬 WhatsApp', bg: '#25D366', action: () => handleShare('wa') },
              { label: '👍 Facebook', bg: '#1877F2', action: () => handleShare('fb') },
              { label: '🔵 LinkedIn', bg: '#0A66C2', action: () => handleShare('li') },
              { label: copyDone ? '✅ Copied!' : '🔗 Copy Link', bg: '#888', action: () => handleShare('copy') },
            ] as const).map(({ label, bg, action }) => (
              <button key={label} className="mk-btn" onClick={action} style={{ flex: '1 1 calc(50% - 4px)', minWidth: 120, padding: '10px 8px', borderRadius: 5, border: 'none', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div style={{ padding: '10px 16px', background: '#fafafa', fontSize: 9, color: '#aaa', lineHeight: 1.5, borderTop: '1px solid #f0f0f0', fontFamily: 'Rajdhani, sans-serif' }}>
          * இந்த கருத்துக் கணிப்பு ஒரு தேர்தல் கணிப்பு அல்ல. இது மக்களின் கருத்து அறிய மட்டும் நடத்தப்படுகிறது.
          This is a public opinion poll for gauging voter sentiment in Modakkurichi Constituency 100, Erode District. Tamil Nadu Legislative Assembly Election 2026.
        </div>

      </div>
    </div>
  )
}
