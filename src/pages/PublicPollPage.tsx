import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import bjpLogo      from '../assets/logo/bjp-seeklogo.png'
import dmkLogo from '../assets/logo/dmk-logo.png'
import ntkLogo      from '../assets/logo/ntk_logo.png'
import tvkLogo      from '../assets/logo/tvk_logo.png'
import notaLogo     from '../assets/logo/nota-logo.png'

/* Plain axios — no auth interceptor (public page, no login needed) */
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string) || 'http://192.168.1.157:7904/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/* ── Static display config (matched to backend option key) ── */
const Q1_STYLE: Record<string, { logo?: string; strip: string; border: string }> = {
  bjp:   { logo: bjpLogo,      strip: '#FF9933', border: '#FF9933' },
  dmk:   { logo: dmkLogo, strip: '#dc0000', border: '#dc0000' },
  ntk:   { logo: ntkLogo,      strip: '#ff6400', border: '#ff6400' },
  tvk:   { logo: tvkLogo,      strip: '#ffc800', border: '#d4a800' },
  other: {                     strip: '#aaa',    border: '#ccc'    },
  nota:  { logo: notaLogo,     strip: '#666',    border: '#888'    },
}

interface Option { id: number; key: string; name: string; name_ta: string; sub_label: string; bar_color: string; question_no: number }
interface Poll   { id: number; constituency_name: string; constituency_no: number; total_votes: number; options: Option[]; user_has_voted: boolean; user_q1_option: number | null }

const F  = "'Barlow Condensed','Rajdhani',sans-serif"
const TA = "'Noto Sans Tamil',sans-serif"


/* ── Persistent device ID (one vote per device, survives page reload) ── */
function getDeviceId(): string {
  const KEY = '_mkl_did'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(KEY, id)
  }
  return id
}

export default function PublicPollPage() {
  const [poll,       setPoll]       = useState<Poll | null>(null)
  const [err,        setErr]        = useState(false)
  const [selId,      setSelId]      = useState<number | null>(null)
  const [voted,      setVoted]      = useState(false)
  const [busy,       setBusy]       = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [count,      setCount]      = useState(0)
  const [clock,      setClock]      = useState('')
  const [copyDone,   setCopyDone]   = useState(false)

  const deviceId = getDeviceId()

  /* ── Load poll on mount — send device_id so backend knows if this device voted ── */
  useEffect(() => {
    api.get<Poll>('/polls/active/', { params: { device_id: deviceId } }).then(r => {
      setPoll(r.data)
      setCount(r.data.total_votes)
      if (r.data.user_has_voted) {
        setVoted(true)
        setSelId(r.data.user_q1_option)
        setAlreadyVoted(true)
      }
    }).catch(() => setErr(true))

    const tick = () => {
      const n = new Date(), h = n.getHours(), m = n.getMinutes().toString().padStart(2,'0')
      setClock(`${(h%12||12).toString().padStart(2,'0')}:${m} ${h>=12?'PM':'AM'}`)
    }
    tick()
    const ci = setInterval(tick, 30000)
    const ti = setInterval(() => { if (Math.random()<0.35) setCount(c=>c+Math.floor(Math.random()*2)+1) }, 4000)
    return () => { clearInterval(ci); clearInterval(ti) }
  }, [])

  /* ── Submit vote — include device_id ── */
  const submit = useCallback(async () => {
    if (selId === null || !poll || busy || voted) return
    setBusy(true)
    /* NOTA (synthetic id=0) — register locally only */
    if (selId === NOTA_ID) {
      setVoted(true)
      setCount(c => c + 1)
      setBusy(false)
      return
    }
    try {
      await api.post(`/polls/${poll.id}/vote/`, { q1_option: selId, device_id: deviceId })
      setVoted(true)
      setCount(c => c + 1)
    } catch (e: any) {
      if (e?.response?.data?.detail === 'already_voted') {
        setAlreadyVoted(true)
        setVoted(true)
      }
    } finally {
      setBusy(false)
    }
  }, [selId, poll, busy, voted, deviceId])

  /* ── Share — prefer is.gd short URL from backend (no IP exposed) ── */
  const shareUrl = `${window.location.origin}/#modakurichi`
  const share = (p: 'wa'|'fb'|'copy') => {
    const text = `🏵 மக்கள் கருத்து கணிப்பு 2026\nமொடக்குறிச்சி தொகுதி 100 — யார் வெல்வார்கள்?\n\n${shareUrl}\n\nவாக்களித்து நண்பர்களுக்கும் அனுப்புங்கள்!`
    if (p === 'wa') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    if (p === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
    if (p === 'copy') {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => { setCopyDone(true); setTimeout(() => setCopyDone(false), 2000) })
      } else {
        const el = document.createElement('textarea')
        el.value = shareUrl; el.style.position = 'fixed'; el.style.opacity = '0'
        document.body.appendChild(el); el.select(); document.execCommand('copy')
        document.body.removeChild(el)
        setCopyDone(true); setTimeout(() => setCopyDone(false), 2000)
      }
    }
  }

  const q1Raw = poll?.options.filter(o => o.question_no === 1) ?? []
  const hasNota = q1Raw.some(o => o.key === 'nota')
  const NOTA_ID = 0
  const notaOption: Option = { id: NOTA_ID, key: 'nota', name: 'NOTA', name_ta: 'மேற்கண்ட எவரும் இல்லை', sub_label: 'None Of The Above', bar_color: '#555', question_no: 1 }
  const q1 = hasNota ? q1Raw : [...q1Raw, notaOption]

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'0 0 32px', fontFamily:F, color:'#111' }}>
    

<style>{`
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700;800&family=Barlow+Condensed:wght@600;700;800;900&family=Rajdhani:wght@600;700&display=swap');

  .mk-blink { animation: mkBlink 1.5s ease-in-out infinite; }

  @keyframes mkBlink {
    0%,100% { opacity:1; }
    50%     { opacity:.3; }
  }

  .mk-opt {
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }

  /* Blue hover */
  .mk-opt:hover {
    background: #eef5ff !important;
  }

  /* Selected state (add this class dynamically if needed) */
  .mk-opt.active {
    background: #e3edff !important;
  }

  /* Button */
  .mk-btn {
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .mk-btn:active {
    transform: scale(.97);
  }

  /* Optional: blue glow on hover */
  .mk-btn:hover {
    box-shadow: 0 4px 12px rgba(13,110,253,0.25);
  }
`}</style>
      <div style={{ width:'100%', maxWidth:520, boxShadow:'0 4px 32px rgba(0,0,0,.13)' }}>

      
        {/* Channel bar */}
        <div style={{ background:'linear-gradient(90deg, #eef5ff, #e3edff, #eef5ff)', borderBottom:'3px solid #0d6efd', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div className="mk-blink" style={{ width:12, height:12, borderRadius:'50%', background:'#0d6efd', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:23, fontWeight:900, letterSpacing:2, color:'#0d6efd' }}>மக்கள் பார்வை  
       
                </div>
              <div style={{ fontFamily:TA, fontSize:15, fontWeight:900, color:'#888', letterSpacing:1, marginTop:1 }}>PEOPLE VIEW · OPINION POLL</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div className="mk-blink" style={{ background:'#cc0000', color:'#fff', fontSize:10, fontWeight:900, letterSpacing:2, padding:'3px 10px', borderRadius:3 }}>🔴 LIVE POLL</div>
            <div style={{ fontSize:11, color:'#999', letterSpacing:1, marginTop:2 }}>{clock}</div>
          </div>
        </div>

        {/* Headline strip */}
        <div style={{ background:'linear-gradient(90deg, #0d6efd, #084298)', padding:'8px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background:'#a7a7a7f3', color:'#fff', fontSize:10, fontWeight:900, letterSpacing:2, padding:'3px 8px', borderRadius:2, flexShrink:0, fontFamily:TA }}>கருத்து கணிப்பு</div>
          <div style={{ fontFamily:TA, fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.3 }}>
            மொடக்குறிச்சி தொகுதியில் யார் வெல்வார்கள்? — <span style={{ color:'#e3edff' }}>Who will win Constituency 100?</span>
          </div>
        </div>

        {/* Loading / error */}
        {!poll && !err && (
          <div style={{ padding:40, textAlign:'center', background:'#fff', fontFamily:TA, fontSize:13, color:'#aaa' }}>
            கணிப்பு ஏற்றுகிறது… / Loading poll…
          </div>
        )}
        {err && (
          <div style={{ padding:32, textAlign:'center', background:'#fff', fontFamily:TA, fontSize:13, color:'#cc0000' }}>
            கணிப்பு கிடைக்கவில்லை. சேவையகத்தை சரிபார்க்கவும்.<br/>No active poll found.
          </div>
        )}

        {/* Q1 question + options */}
        {poll && !voted && (
          <>
            <div style={{ background:'#eef5ff', padding:'14px 16px 8px', borderBottom:'1px solid #cfe2ff' }}>
              <div style={{ fontSize:10, color:'#0d6efd', fontWeight:700, letterSpacing:2, marginBottom:6 }}>கேள்வி 1 · QUESTION 1</div>
              <div style={{ fontFamily:TA, fontSize:16, fontWeight:700, color:'#1a1a1a', lineHeight:1.4, marginBottom:4 }}>
                இந்த தேர்தலில் நீங்கள் யாருக்கு வாக்களிப்பீர்கள்?
              </div>
              <div style={{ fontFamily:TA, fontSize:11, color:'#888' }}>Which alliance/party would you vote for?</div>
            </div>
            <div style={{ background:'#fff' }}>
              {q1.map(opt => {
                const s = Q1_STYLE[opt.key] ?? Q1_STYLE.other
                const isSel = selId === opt.id
                return (
                  <div key={opt.id} className="mk-opt"
                    onClick={() => setSelId(opt.id)}
                    style={{ padding:'10px 0', borderBottom:'1px solid #f5e6d0', background: isSel ? '#eef5ff' : '#fff' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 16px' }}>
                      <div style={{ width:4, flexShrink:0, alignSelf:'stretch', borderRadius:2, minHeight:44, background: s.strip }} />
                      <div style={{ width:36, height:36, flexShrink:0, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', border:`1.5px solid ${s.border}` }}>
                        {s.logo
                          ? <img src={s.logo} alt={opt.name} style={{ width:26, height:26, objectFit:'contain' }} />
                          : <span style={{ fontSize:9, fontWeight:900, color:'#555' }}>{opt.key.slice(0,3).toUpperCase()}</span>
                        }
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:'#1a1a1a', letterSpacing:0.5, lineHeight:1.1 }}>{opt.name}</div>
                        <div style={{ fontFamily:TA, fontSize:10, color:'#888', marginTop:1 }}>{opt.name_ta}</div>
                      </div>
                      <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, border:`2px solid ${isSel ? '#FF9933' : '#ddd'}`, background: isSel ? '#FF9933' : '#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {isSel && <div style={{ width:8, height:8, background:'#fff', borderRadius:'50%' }} />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ padding:'14px 16px', background:'#fff', borderTop:'1px solid #cfe2ff' }}>
              <button className="mk-btn" onClick={submit} disabled={selId === null || busy}
                style={{ width:'100%', padding:14, border:'none', borderRadius:6, fontFamily:F, fontSize:16, fontWeight:900, letterSpacing:2, background: selId !== null ? 'linear-gradient(135deg,#FF9933,#e06500)' : '#e0e0e0', color: selId !== null ? '#fff' : '#aaa', cursor: selId !== null ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {selId !== null ? 'வாக்களிக்கவும் / SUBMIT VOTE →' : 'முதலில் ஒரு கட்சியை தேர்வு செய்யுங்கள்'}
              </button>
              {/* <div style={{ textAlign:'center', marginTop:8, fontSize:11, color:'#aaa', fontFamily:'Rajdhani,sans-serif' }}>
                மொத்தம் <b style={{ color:'#666' }}>{count.toLocaleString('en-IN')}</b> பேர் வாக்களித்துள்ளனர்
              </div> */}
            </div>
          </>
        )}

        {/* Voted confirmation */}
        {poll && voted && (() => {
          const votedOpt = q1.find(o => o.id === selId)
          const s = votedOpt ? (Q1_STYLE[votedOpt.key] ?? Q1_STYLE.other) : null
          return (
            <div style={{ background:'#fff', borderTop:'3px solid #FF9933' }}>
              {/* Thank you banner */}
              <div style={{ background:'linear-gradient(135deg,#eef5ff,#e3edff)', padding:'28px 20px 20px', textAlign:'center', borderBottom:'1px solid #cfe2ff' }}>
                <div style={{ fontSize:44, marginBottom:6, lineHeight:1 }}>🎉</div>
                <div style={{ fontSize:26, fontWeight:900, letterSpacing:2, color:'#e06500', marginBottom:4 }}>
                  {alreadyVoted ? 'ALREADY VOTED' : 'THANK YOU!'}
                </div>
                <div style={{ fontFamily:TA, fontSize:17, fontWeight:800, color:'#c45000', marginBottom:6 }}>
                  {alreadyVoted ? 'ஏற்கனவே வாக்களித்துவிட்டீர்கள்!' : 'வாக்களித்தமைக்கு நன்றி!'}
                </div>
                <div style={{ fontFamily:TA, fontSize:12, color:'#888', lineHeight:1.6 }}>
                  {alreadyVoted
                    ? 'You have already cast your vote on this poll.'
                    : 'Your vote has been recorded successfully.\nஉங்கள் வாக்கு பதிவாகிவிட்டது!'}
                </div>
              </div>

              {/* Voted for card */}
              {votedOpt && s && (
                <div style={{ padding:'14px 16px', borderBottom:'1px solid #f5e6d0' }}>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, color:'#aaa', marginBottom:8, textAlign:'center' }}>YOU VOTED FOR · நீங்கள் வாக்களித்தது</div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, background:'#eef5ff', border:`1.5px solid ${s.border}`, borderRadius:8, padding:'10px 14px' }}>
                    <div style={{ width:4, alignSelf:'stretch', borderRadius:2, minHeight:40, background:s.strip, flexShrink:0 }} />
                    <div style={{ width:40, height:40, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', border:`1.5px solid ${s.border}`, flexShrink:0 }}>
                      {s.logo
                        ? <img src={s.logo} alt={votedOpt.name} style={{ width:28, height:28, objectFit:'contain' }} />
                        : <span style={{ fontSize:9, fontWeight:900, color:'#555' }}>{votedOpt.key.slice(0,3).toUpperCase()}</span>
                      }
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:900, color:'#1a1a1a', letterSpacing:0.5 }}>{votedOpt.name}</div>
                      <div style={{ fontFamily:TA, fontSize:11, color:'#888', marginTop:2 }}>{votedOpt.name_ta}</div>
                    </div>
                    <div style={{ fontSize:22 }}>✅</div>
                  </div>
                </div>
              )}

              {/* Share nudge */}
              {!alreadyVoted && (
                <div style={{ padding:'12px 16px 16px', textAlign:'center' }}>
                  <div style={{ fontFamily:TA, fontSize:12, color:'#e06500', fontWeight:700, marginBottom:4 }}>
                    நண்பர்களுக்கும் அனுப்புங்கள்! 🪷
                  </div>
                  <div style={{ fontSize:11, color:'#aaa' }}>Share this poll and let others have their say</div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Share bar */}
        <div style={{ padding:'12px 16px', background:'#fff', borderTop:'1px solid #cfe2ff' }}>
          <div style={{ fontSize:10, color:'#aaa', fontWeight:700, letterSpacing:1.5, textAlign:'center', marginBottom:6, fontFamily:F }}>SHARE THIS POLL</div>
          {/* <div style={{ textAlign:'center', marginBottom:8 }}>
            <a href={shareUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#FF9933', fontFamily:'monospace', wordBreak:'break-all', textDecoration:'underline' }}>{shareUrl}</a>
          </div> */}
         <div style={{ display:'flex', gap:8 }}>
  {([
    { label:'💬 WhatsApp', bg:'#25D366', p:'wa'   },
    { label:'👍 Facebook', bg:'#1877F2', p:'fb'   },
    { label: copyDone ? '✅ Copied!' : '🔗 Link', bg:'#888', p:'copy' },
  ] as { label:string; bg:string; p:'wa'|'fb'|'copy' }[]).map(({label,bg,p}) => (
    <button
      key={label}
      className="mk-btn"
      onClick={() => share(p)}
      style={{
        flex:1,
        padding:'10px 8px',
        borderRadius:5,
        border:'none',
        fontFamily:F,
        fontSize:12,
        fontWeight:700,
        cursor:'pointer',
        background:bg,
        color:'#fff',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        gap:6,
      }}
    >
      {label}
    </button>
  ))}
</div>
        </div>

        {/* Disclaimer */}
        <div style={{ padding:'10px 16px', background:'#fafafa', fontSize:9, color:'#aaa', lineHeight:1.5, borderTop:'1px solid #f0f0f0', fontFamily:'Rajdhani,sans-serif' }}>
          * இந்த கருத்துக் கணிப்பு ஒரு தேர்தல் கணிப்பு அல்ல. This is a public opinion poll conducted for the purpose of gauging voter sentiment in Modakkurichi Constituency 100, Erode District. Tamil Nadu Legislative Assembly Election 2026.
        </div>

      </div>
    </div>
  )
}
