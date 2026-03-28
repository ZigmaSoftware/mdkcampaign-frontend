import { useState, useMemo } from 'react'
import Countdown from '../components/ui/Countdown'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import bjpLogo from '../assets/logo/logo.png'
import profile from '../assets//pictures/kirthika.JPG.jpeg'
import {
  useDashboardData,
  getEventTypeBadge,
  getEventStatusDisplay,
  formatEventDate,
  getTaskStatusDisplay,
  formatTaskDateTime,
} from '../hooks/useDashboardData'

/* ── Arram pillar card ────────────────────────────────────────────── */
interface PillarProps {
  icon: string; value: string; label: string; sub: string
  bg: string; border: string; valColor: string
}
function PillarCard({ icon, value, label, sub, bg, border, valColor }: PillarProps) {
  return (
    <div className={`rounded-[10px] p-[14px] border-t-[3px] ${bg} ${border}`}>
      <div className="text-[22px]"><i className={icon} /></div>
      <div className="font-inter text-[11px] font-bold text-navy mt-[6px]">{label}</div>
      <div className={`font-inter text-[18px] font-bold ${valColor}`}>{value}</div>
      <div className="text-[9px] text-muted">{sub}</div>
    </div>
  )
}


export default function DashboardPage() {
  const { tasks, events, analytics } = useDashboardData()

  /* ── Task filters ── */
  const [taskStatusFilter,   setTaskStatusFilter]   = useState('')
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('')

  /* ── Event filters ── */
  const today = new Date().toISOString().split('T')[0]
  const [eventTypeFilter,   setEventTypeFilter]   = useState('')
  const [eventStatusFilter, setEventStatusFilter] = useState('')

  /* ── Unique task categories from data ── */
  const taskCategories = useMemo(() => {
    const seen = new Set<string>()
    const cats: { name: string; color?: string }[] = []
    tasks.forEach(t => {
      if (t.task_category_name && !seen.has(t.task_category_name)) {
        seen.add(t.task_category_name)
        cats.push({ name: t.task_category_name, color: t.task_category_color })
      }
    })
    return cats
  }, [tasks])

  /* ── Filtered tasks (recent — sorted newest first) ── */
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => !taskStatusFilter   || t.status === taskStatusFilter)
      .filter(t => !taskCategoryFilter || t.task_category_name === taskCategoryFilter)
      .sort((a, b) => new Date(b.expected_datetime).getTime() - new Date(a.expected_datetime).getTime())
      .slice(0, 20)
  }, [tasks, taskStatusFilter, taskCategoryFilter])

  /* ── Filtered events ── */
  const filteredEvents = useMemo(() => {
    return events
      .filter(e => !eventTypeFilter   || e.event_type === eventTypeFilter)
      .filter(e => !eventStatusFilter || e.status    === eventStatusFilter)
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
  }, [events, eventTypeFilter, eventStatusFilter])

  /* ── Stat values from API only ── */
  const totalVoters      = analytics?.total_voters       ?? 0
  const totalBooths      = analytics?.total_booths       ?? 0
  const boothsAssigned   = analytics?.booths_assigned    ?? 0
  const activeVolunteers = analytics?.active_volunteers  ?? 0
  const totalEvents      = analytics?.total_events       ?? 0
  const votersContacted  = analytics?.voters_contacted   ?? 0

  const coverageProgress = totalBooths > 0 ? (boothsAssigned / totalBooths) * 100 : 0
  const coverageStat     = coverageProgress.toFixed(1) + '%'

  const sentiments       = analytics?.voters_by_sentiment ?? {}
  const positiveVoters   = sentiments['positive'] ?? 0
  const neutralVoters    = sentiments['neutral']  ?? 0
  const favourablePct    = totalVoters > 0 ? ((positiveVoters / totalVoters) * 100).toFixed(1) + '%' : '0%'
  const undecidedPct     = totalVoters > 0 ? ((neutralVoters  / totalVoters) * 100).toFixed(1) + '%' : '0%'
  const favourableProgress = totalVoters > 0 ? (positiveVoters / totalVoters) * 100 : 0

  return (
    <div>
      {/* ── CANDIDATE PROFILE BANNER ────────────────────────────────── */}
      <div
        className="border-b-[3px] border-saffron relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0a183e 0%,#0d2455 60%,#0a183e 100%)' }}
      >
        {/* Watermark */}
        <i className="ph ph-flower-lotus absolute right-[-20px] top-1/2 -translate-y-1/2
                       text-[220px] opacity-[0.04] text-white pointer-events-none z-0" />

        <div className="max-w-[1440px] mx-auto px-6 py-5 relative z-[1]">
          <div className="flex flex-wrap items-start gap-5">

            {/* ── Photo + Name block ── */}
            <div className="flex items-start gap-4 flex-shrink-0">
              {/* Candidate Photo */}
              <div
                className="w-[90px] h-[106px] rounded-xl border-2 border-saffron overflow-hidden flex-shrink-0"
                style={{ boxShadow: '0 0 20px rgba(255,153,51,0.25)' }}
              >
                <img src={profile} alt="Kirthika Shivkumar" className="w-full h-full object-cover object-top" />
              </div>

              {/* Name + roles */}
              <div className="pt-1">
                <div className="font-inter text-[18px] text-white font-black tracking-[-0.4px] leading-tight">
                  S Kirthika
                </div>
                <div className="font-tamil text-[11px] text-saffron/80 mt-[2px]">
                  S கிருத்திகா 
                </div>
                <div className="mt-[6px] flex flex-wrap gap-[5px]">
                  <span className="text-[9px] font-bold tracking-[0.6px] px-2 py-[3px] rounded-md text-saffron"
                    style={{ background: 'rgba(255,153,51,0.15)', border: '1px solid rgba(255,153,51,0.3)' }}>
                    BJP CANDIDATE
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.6px] px-2 py-[3px] rounded-md text-white/70"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    CON. 100 – MODAKKURICHI
                  </span>
                  <span className="text-[9px] font-bold tracking-[0.6px] px-2 py-[3px] rounded-md text-white/70"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    ERODE DISTRICT
                  </span>
                </div>

                {/* Role pills */}
                <div className="mt-[8px] flex flex-col gap-[4px]">
                  {[
                    { icon: 'ph-shield-star',      label: 'BJP State Secretary – Tamil Nadu NGO Wing' },
                    { icon: 'ph-heartbeat',         label: 'Co-Founder & Managing Trustee – Arram Charity Trust' },
                    { icon: 'ph-graduation-cap',    label: 'Executive Director – The Indian Public School (Erode · Salem · Trichy)' },
                    { icon: 'ph-users-three',       label: 'Former Chairwoman – CII Indian Women Network, Tamil Nadu' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-[6px]">
                      <i className={`ph ${r.icon} text-saffron text-[11px] flex-shrink-0`} />
                      <span className="text-[10px] text-white/60 leading-tight">{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="w-px self-stretch bg-white/10 mx-1 hidden lg:block" />

            {/* ── Education + tagline ── */}
            <div className="flex-1 min-w-[200px] pt-1 hidden md:block">
              <div className="text-[9px] text-white/30 uppercase tracking-[1.5px] mb-[6px]">Profile</div>
              <p className="text-[11px] text-white/55 leading-[1.6] mb-3">
                Visionary Educationist · Social Impact Leader · Advocate for Women-Led Development
              </p>
              <div className="text-[9px] text-white/30 uppercase tracking-[1.5px] mb-[5px]">Education</div>
              <div className="flex flex-col gap-[3px]">
                <div className="flex items-center gap-[6px]">
                  <i className="ph ph-certificate text-saffron/60 text-[11px]" />
                  <span className="text-[10px] text-white/55">B.E. – Sathyabama University</span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <i className="ph ph-certificate text-saffron/60 text-[11px]" />
                  <span className="text-[10px] text-white/55">MBA – GRG School of Management Studies</span>
                </div>
              </div>
              {/* Social */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[10px] text-white/30 flex items-center gap-1">
                  <i className="ph ph-instagram-logo text-[12px]" /> @kirthika_shivkumar
                </span>
                <span className="text-[10px] text-white/30 flex items-center gap-1">
                  <i className="ph ph-globe text-[12px]" /> arramsei.org
                </span>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="w-px self-stretch bg-white/10 mx-1 hidden lg:block" />

            {/* ── Countdown + Election day ── */}
            <div className="flex flex-col gap-4 min-w-[200px]">
              <div>
                <div className="text-[9px] text-white/40 uppercase tracking-[1.5px] mb-2">
                  <i className="ph ph-timer mr-1" />Countdown to Election Day
                </div>
                <Countdown />
              </div>
              <div
                className="rounded-lg px-4 py-3 text-center"
                style={{ background: 'rgba(255,153,51,0.10)', border: '1px solid rgba(255,153,51,0.22)' }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <img src={bjpLogo} alt="BJP" className="w-[18px] h-[18px] object-contain" />
                  <span className="font-inter text-[22px] font-black text-saffron leading-none">APR 23</span>
                </div>
                <div className="text-[9px] text-white/40 tracking-[1.5px]">ELECTION DAY 2026</div>
                <div className="mt-[6px] text-[9px] text-saffron/80 font-bold tracking-[0.8px]">
                  290 POLLING STATIONS · 7 AM
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">

        {/* 8-stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-[10px] mb-5">
          <StatCard label="Electorate"  value={totalVoters.toLocaleString('en-IN')}       sub="Registered voters"   color="n" />
          <StatCard label="Booths"      value={String(totalBooths)}                        sub="Total booths"        color="s" />
          <StatCard label="Coverage"    value={coverageStat}                               sub="Booths assigned"     color="g" progress={coverageProgress} />
          <StatCard label="Volunteers"  value={activeVolunteers.toLocaleString('en-IN')}   sub="Active on ground"    color="n" />
          <StatCard label="Contacted"   value={votersContacted.toLocaleString('en-IN')}    sub="Voters reached"      color="s" />
          <StatCard label="Favourable"  value={favourablePct}                              sub="Win threshold: 50%"  color="g" progress={favourableProgress} />
          <StatCard label="Undecided"   value={undecidedPct}                               sub="Persuadable"         color="r" />
          <StatCard label="Campaign"      value={String(totalEvents)}                        sub="Total planned"       color="p" />
        </div>

        {/* 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent Activity — Task Management entries */}
          <Card
            title="Recent Activity"
            icon="ph ph-check-square"
            headerRight={<Badge label={`${filteredTasks.length} Tasks`} variant="s" />}
          >
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border">
              <select
                value={taskStatusFilter}
                onChange={e => setTaskStatusFilter(e.target.value)}
                className={`form-input text-[10px] py-[3px] pr-6 w-auto ${taskStatusFilter ? 'border-saffron bg-[#fffbeb] font-semibold' : ''}`}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={taskCategoryFilter}
                onChange={e => setTaskCategoryFilter(e.target.value)}
                className={`form-input text-[10px] py-[3px] pr-6 w-auto ${taskCategoryFilter ? 'border-saffron bg-[#fffbeb] font-semibold' : ''}`}
              >
                <option value="">All Categories</option>
                {taskCategories.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              {(taskStatusFilter || taskCategoryFilter) && (
                <button
                  onClick={() => { setTaskStatusFilter(''); setTaskCategoryFilter('') }}
                  className="text-[10px] font-bold text-kampr flex items-center gap-1"
                >
                  <i className="ph ph-x-circle" /> Clear
                </button>
              )}
            </div>
            {/* Task list */}
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredTasks.length > 0
                ? filteredTasks.map(t => {
                    const st = getTaskStatusDisplay(t.status)
                    return (
                      <div key={t.id} className="flex items-start gap-3 px-3 py-2 rounded-lg border border-border bg-white hover:shadow-sm transition-all">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: t.task_category_color ? t.task_category_color + '22' : '#f3f4f6' }}>
                          <i className="ph ph-check-square text-[14px]"
                            style={{ color: t.task_category_color || '#6b7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[12px] font-semibold text-navy truncate">{t.title}</p>
                            {t.task_category_name && (
                              <span className="text-[9px] font-bold px-2 py-[1px] rounded-full"
                                style={{ background: t.task_category_color ? t.task_category_color + '22' : '#f3f4f6', color: t.task_category_color || '#6b7280' }}>
                                {t.task_category_name}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted mt-[2px]">
                            {formatTaskDateTime(t.expected_datetime)}
                            {t.venue ? ` · ${t.venue}` : ''}
                            {t.delivery_incharge_name ? ` · ${t.delivery_incharge_name}` : ''}
                          </p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-[2px] rounded-full flex-shrink-0"
                          style={{ background: st.bg, color: st.color }}>
                          {st.text}
                        </span>
                      </div>
                    )
                  })
                : (
                    <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
                      <i className="ph ph-check-square text-[28px] opacity-30" />
                      <p className="text-[12px]">No tasks found.</p>
                    </div>
                  )
              }
            </div>
          </Card>

          {/* Upcoming Events — Campaign entries */}
          <Card
            title="Upcoming Events"
            icon="ph ph-calendar-check"
            headerRight={<Badge label={`${filteredEvents.length} Events`} variant="s" />}
          >
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border">
              <select
                value={eventTypeFilter}
                onChange={e => setEventTypeFilter(e.target.value)}
                className={`form-input text-[10px] py-[3px] pr-6 w-auto ${eventTypeFilter ? 'border-saffron bg-[#fffbeb] font-semibold' : ''}`}
              >
                <option value="">All Types</option>
                <option value="rally">Rally</option>
                <option value="meeting">Meeting</option>
                <option value="training">Training</option>
                <option value="door_door">Door-to-Door</option>
                <option value="nagar_kirtan">Nagar Kirtan</option>
                <option value="stage_show">Stage Show</option>
              </select>
              <select
                value={eventStatusFilter}
                onChange={e => setEventStatusFilter(e.target.value)}
                className={`form-input text-[10px] py-[3px] pr-6 w-auto ${eventStatusFilter ? 'border-saffron bg-[#fffbeb] font-semibold' : ''}`}
              >
                <option value="">All Status</option>
                <option value="planned">Planned</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {(eventTypeFilter || eventStatusFilter) && (
                <button
                  onClick={() => { setEventTypeFilter(''); setEventStatusFilter('') }}
                  className="text-[10px] font-bold text-kampr flex items-center gap-1"
                >
                  <i className="ph ph-x-circle" /> Clear
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr><th>Date</th><th>Event</th><th>Type</th><th>Status</th></tr>
                </thead>
                <tbody>
                
                  {filteredEvents.length > 0
                    ? filteredEvents.map(ev => {
                        const badge = getEventTypeBadge(ev.event_type)
                        const statusDisp = getEventStatusDisplay(ev.status)
                        return (
                          <tr key={ev.id}>
                            <td><b>{formatEventDate(ev.scheduled_date)}</b></td>
                            <td>{ev.title}</td>
                            <td><Badge label={badge.label} variant={badge.variant} /></td>
                            <td className={statusDisp.className}>{statusDisp.text}</td>
                          </tr>
                        )
                      })
                    : (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-8 text-[12px]">
                            No events found.
                          </td>
                        </tr>
                      )
                  }
                  {/* Election Day – always shown */}
                  {/* <tr className="bg-kampgreen-light">
                    <td><b className="text-kampgreen">Apr 23</b></td>
                    <td className="text-kampgreen font-bold">ELECTION DAY</td>
                    <td><Badge label="POLLING" variant="g" /></td>
                    <td className="text-kampgreen font-black text-[12px]">VOTE DAY</td>
                  </tr> */}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Arram Trust Pillars */}
        <Card title="Arram Charity Trust – 6 Campaign Pillars" icon="ph ph-heartbeat"
          headerRight={<Badge label="Founded 2019" variant="g" />}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <PillarCard icon="ph ph-bowl-food"           value="3.4L+"   label="Arram Unavagam"      sub="Meals Served · ₹20 daily"                    bg="bg-saffron-light"      border="border-t-saffron"   valColor="text-saffron-dark" />
            <PillarCard icon="ph ph-hospital"            value="86,500+" label="Arram Clinics"       sub="Consultations · 50 Cataract Surgeries"        bg="bg-kampr-light"        border="border-t-kampr"     valColor="text-kampr" />
            <PillarCard icon="ph ph-graduation-cap"      value="196 NEET" label="Education"          sub="Students · 11 Medical Admissions"             bg="bg-navy-light"         border="border-t-navy"      valColor="text-navy" />
            <PillarCard icon="ph ph-briefcase"           value="350+"    label="Arram Jobs"          sub="Individuals Placed in Jobs"                   bg="bg-kampgreen-light"    border="border-t-kampgreen" valColor="text-kampgreen" />
            <PillarCard icon="ph ph-mosque"              value="4,500+"  label="Arram Yathirai"      sub="Pilgrimage Beneficiaries · 39 Trips"          bg="bg-kampp-light"        border="border-t-kampp"     valColor="text-kampp" />
            <PillarCard icon="ph ph-person-simple-dress" value="1,418"   label="Women Empowerment"  sub="Beneficiaries · Skill Development"            bg="bg-[#fce7f3]"          border="border-t-[#db2777]" valColor="text-[#db2777]" />
          </div>
        </Card>
      </div>
    </div>
  )
}
