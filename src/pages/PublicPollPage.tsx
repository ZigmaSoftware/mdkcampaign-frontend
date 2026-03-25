import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

/* Plain axios — no auth interceptor (public page, no login needed) */
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string) || 'http://192.168.1.157:7904/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/* ── Static display config (matched to backend option key) ── */
const Q1_STYLE: Record<string, { flag: string; flagBg: string; flagColor: string; strip: string }> = {
  bjp:   { flag: '🪷',        flagBg: '#FF9933', flagColor: '#fff',    strip: '#FF9933' },
  dmk:   { flag: 'INC\nDMK', flagBg: '#dc0000', flagColor: '#fff',    strip: '#dc0000' },
  ntk:   { flag: 'NTK',      flagBg: '#ff6400', flagColor: '#fff',    strip: '#ff6400' },
  tvk:   { flag: 'TVK',      flagBg: '#ffc800', flagColor: '#0a0a14', strip: '#ffc800' },
  other: { flag: 'OTH',      flagBg: '#888',    flagColor: '#fff',    strip: '#aaa'    },
  nota:  { flag: '✗',        flagBg: '#555',    flagColor: '#fff',    strip: '#666'    },
}

interface Option { id: number; key: string; name: string; name_ta: string; sub_label: string; bar_color: string; question_no: number }
interface Poll   { id: number; constituency_name: string; constituency_no: number; total_votes: number; options: Option[]; user_has_voted: boolean; user_q1_option: number | null }

const F  = "'Barlow Condensed','Rajdhani',sans-serif"
const TA = "'Noto Sans Tamil',sans-serif"

const TICKER = 'BREAKING: மொடக்குறிச்சி தொகுதி 100 — மக்கள் கருத்துக் கணிப்பு 2026 || தமிழ்நாடு சட்டமன்றத் தேர்தல் — 23 ஏப்ரல் 2026 || ADMK + BJP · DMK + INC · TVK · NTK · NOTA || உங்கள் கருத்து பதிவு செய்யுங்கள் — CAST YOUR OPINION VOTE NOW   '

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

  /* ── Load poll on mount ── */
  useEffect(() => {
    api.get<Poll>('/polls/active/').then(r => {
      setPoll(r.data)
      setCount(r.data.total_votes)
      if (r.data.user_has_voted) {
        setVoted(true)
        setSelId(r.data.user_q1_option)
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

  /* ── Submit vote ── */
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
      await api.post(`/polls/${poll.id}/vote/`, { q1_option: selId })
      setVoted(true)
      setCount(c => c + 1)
    } catch (e: any) {
      if (e?.response?.data?.detail === 'already_voted') setAlreadyVoted(true)
    } finally {
      setBusy(false)
    }
  }, [selId, poll, busy, voted])

  /* ── Share ── */
  const shareUrl = `${window.location.origin}${window.location.pathname}#poll`
  const share = (p: 'wa'|'fb'|'copy') => {
    const text = `🏵 மக்கள் கருத்து கணிப்பு 2026\nமொடக்குறிச்சி தொகுதி 100 — யார் வெல்வார்கள்?\n\n${shareUrl}\n\nவாக்களித்து நண்பர்களுக்கும் அனுப்புங்கள்! 🪷`
    if (p === 'wa')   window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    if (p === 'fb')   window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
    if (p === 'copy') navigator.clipboard?.writeText(shareUrl).then(()=>{ setCopyDone(true); setTimeout(()=>setCopyDone(false),2000) })
  }

  const q1Raw = poll?.options.filter(o => o.question_no === 1) ?? []
  const hasNota = q1Raw.some(o => o.key === 'nota')
  const NOTA_ID = 0
  const notaOption: Option = { id: NOTA_ID, key: 'nota', name: 'NOTA', name_ta: 'மேற்கண்ட எவரும் இல்லை', sub_label: 'None Of The Above', bar_color: '#555', question_no: 1 }
  const q1 = hasNota ? q1Raw : [...q1Raw, notaOption]

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'0 0 32px', fontFamily:F, color:'#111' }}>
    

      <div style={{ width:'100%', maxWidth:520, boxShadow:'0 4px 32px rgba(0,0,0,.13)' }}>

      

        {/* Channel bar */}
        <div style={{ background:'linear-gradient(90deg,#fff7ee,#fff3e0,#fff7ee)', borderBottom:'3px solid #FF9933', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div className="mk-blink" style={{ width:12, height:12, borderRadius:'50%', background:'#FF9933', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900, letterSpacing:2, color:'#e06500' }}>MAKKAL KURAL</div>
              <div style={{ fontFamily:TA, fontSize:9, color:'#888', letterSpacing:1, marginTop:1 }}>மக்கள் குரல் · OPINION POLL</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div className="mk-blink" style={{ background:'#cc0000', color:'#fff', fontSize:10, fontWeight:900, letterSpacing:2, padding:'3px 10px', borderRadius:3 }}>🔴 LIVE POLL</div>
            <div style={{ fontSize:11, color:'#999', letterSpacing:1, marginTop:2 }}>{clock}</div>
          </div>
        </div>

        {/* Headline strip */}
        <div style={{ background:'linear-gradient(90deg,#FF9933,#e06500)', padding:'8px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background:'#cc0000', color:'#fff', fontSize:10, fontWeight:900, letterSpacing:2, padding:'3px 8px', borderRadius:2, flexShrink:0, fontFamily:TA }}>கருத்து கணிப்பு</div>
          <div style={{ fontFamily:TA, fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.3 }}>
            மொடக்குறிச்சி தொகுதியில் யார் வெல்வார்கள்? — <span style={{ color:'#fff3e0' }}>Who will win Constituency 100?</span>
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

        {poll && (
          <>
            {/* Constituency info */}
            <div style={{ background:'#fff', padding:'14px 16px', borderBottom:'1px solid #ffe0b2' }}>
              <div style={{ fontSize:10, color:'#FF9933', fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>TAMIL NADU ASSEMBLY ELECTION 2026</div>
              <div style={{ fontSize:26, fontWeight:900, color:'#1a1a1a', letterSpacing:1, lineHeight:1 }}>
                {(poll.constituency_name || 'MODAKKURICHI').toUpperCase()}
              </div>
              <div style={{ fontFamily:TA, fontSize:14, color:'#666', marginTop:2 }}>
                மொடக்குறிச்சி — தொகுதி எண் {poll.constituency_no || 100} — ஈரோடு மாவட்டம்
              </div>
              <div style={{ display:'flex', gap:20, marginTop:8, flexWrap:'wrap' }}>
                {[
                  { v:'2,42,185',                     l:'வாக்காளர்கள் / VOTERS' },
                  { v:'274',                           l:'வாக்கு சாவடிகள் / BOOTHS' },
                  { v:count.toLocaleString('en-IN'),   l:'வாக்குகள் / VOTES CAST' },
                ].map(({v,l}) => (
                  <div key={l}>
                    <div style={{ fontSize:16, fontWeight:800, color:'#e06500' }}>{v}</div>
                    <div style={{ fontFamily:TA, fontSize:9, color:'#999', letterSpacing:.5 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Q1 label */}
            <div style={{ background:'#fff8f0', padding:'14px 16px 8px', borderBottom:'1px solid #ffe0b2' }}>
              
              <div style={{ fontFamily:TA, fontSize:16, fontWeight:700, color:'#1a1a1a', lineHeight:1.4, marginBottom:4 }}>
                இந்த தேர்தலில் நீங்கள் யாருக்கு வாக்களிப்பீர்கள்?
              </div>
              <div style={{ fontFamily:TA, fontSize:11, color:'#888' }}>If elections were held today, which alliance/party would you vote for?</div>
            </div>

            {/* Q1 options */}
            <div className={voted ? 'mk-voted' : ''} style={{ background:'#fff' }}>
              {q1.map(opt => {
                const s = Q1_STYLE[opt.key] ?? { flag:opt.key.slice(0,3).toUpperCase(), flagBg: opt.bar_color||'#888', flagColor:'#fff', strip: opt.bar_color||'#888' }
                const sel = selId === opt.id
                return (
                  <div
                    key={opt.id}
                    className="mk-opt"
                    onClick={() => !voted && setSelId(opt.id)}
                    style={{ padding:'10px 0', borderBottom:'1px solid #f5e6d0', background: sel && !voted ? '#fff8f0' : '#fff' }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 16px' }}>
                      <div style={{ width:4, flexShrink:0, alignSelf:'stretch', borderRadius:2, minHeight:44, background:s.strip }} />
                      <div style={{ width:36, height:36, flexShrink:0, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:s.flagBg, color:s.flagColor, fontSize: opt.key==='bjp'?18:11, fontWeight:900, lineHeight:1.1, whiteSpace:'pre', textAlign:'center', fontFamily:F }}>
                        {s.flag}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:'#1a1a1a', letterSpacing:.5, lineHeight:1.1 }}>{opt.name}</div>
                        <div style={{ fontFamily:TA, fontSize:10, color:'#888', marginTop:1 }}>{opt.name_ta}</div>

                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {voted && sel && (
                          <div style={{ fontFamily:TA, fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:2, background:'#FF9933', color:'#fff' }}>உங்கள் வாக்கு</div>
                        )}
                        <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, border:`2px solid ${sel?'#FF9933':'#ddd'}`, background:sel?'#FF9933':'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {sel && <div style={{ width:8, height:8, background:'#fff', borderRadius:'50%' }} />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Already voted notice */}
            {alreadyVoted && (
              <div style={{ padding:'10px 16px', background:'#fff3cd', borderTop:'1px solid #ffc107', fontFamily:TA, fontSize:12, color:'#856404', textAlign:'center' }}>
                இந்த சாதனத்திலிருந்து ஏற்கனவே வாக்களிக்கப்பட்டுள்ளது. / Already voted from this device.
              </div>
            )}

            {/* Submit button */}
            {!voted && (
              <div style={{ padding:'14px 16px', background:'#fff', borderTop:'1px solid #ffe0b2' }}>
                <button
                  className="mk-btn"
                  onClick={submit}
                  disabled={selId === null || busy}
                  style={{ width:'100%', padding:14, border:'none', borderRadius:6, fontFamily:F, fontSize:16, fontWeight:900, letterSpacing:2, background: selId !== null ? 'linear-gradient(135deg,#FF9933,#e06500)' : '#e0e0e0', color: selId !== null ? '#fff' : '#aaa', cursor: selId !== null ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
                >
                  {busy ? 'சமர்ப்பிக்கிறது…' : selId !== null ? 'வாக்களிக்கவும் / SUBMIT VOTE ✓' : 'ஒரு கட்சியை தேர்வு செய்யுங்கள்'}
                </button>
              </div>
            )}

            {/* Voted confirmation */}
            {voted && (
              <div style={{ textAlign:'center', padding:'16px', background:'#fff8f0', borderTop:'1px solid #ffe0b2' }}>
                <div style={{ fontSize:30, marginBottom:6 }}>✅</div>
                <div style={{ fontFamily:TA, fontSize:14, fontWeight:700, color:'#e06500', marginBottom:4 }}>உங்கள் வாக்கு பதிவாகிவிட்டது!</div>
                <div style={{ fontFamily:TA, fontSize:12, color:'#666' }}>Your vote has been recorded. Share with friends!</div>
              </div>
            )}
          </>
        )}

        {/* Share bar */}
        <div style={{ padding:'12px 16px', background:'#fff', borderTop:'1px solid #ffe0b2' }}>
          <div style={{ fontSize:10, color:'#aaa', fontWeight:700, letterSpacing:1.5, textAlign:'center', marginBottom:8, fontFamily:F }}>SHARE THIS POLL</div>
          <div style={{ display:'flex', gap:8 }}>
            {[
              { label:'💬 WhatsApp', bg:'#25D366', fn: ()=>share('wa') },
              { label:'👍 Facebook', bg:'#1877F2', fn: ()=>share('fb') },
              { label: copyDone ? '✅ Copied!' : '🔗 Link', bg:'#888', fn: ()=>share('copy') },
            ].map(({label,bg,fn}) => (
              <button key={label} className="mk-btn" onClick={fn} style={{ flex:1, padding:'10px 8px', borderRadius:5, border:'none', fontFamily:F, fontSize:12, fontWeight:700, cursor:'pointer', background:bg, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
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
