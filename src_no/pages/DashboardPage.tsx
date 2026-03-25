import React from 'react'
import Countdown from '../components/ui/Countdown'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import ActivityFeedItem from '../components/ui/ActivityFeedItem'
import TimelineItem from '../components/ui/TimelineItem'
import bjpLogo from '../assets/logo/logo.png'
import profile from '../assets//pictures/kirthika.JPG.jpeg'

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
                  Mrs. Kirthika Shivkumar
                </div>
                <div className="font-tamil text-[11px] text-saffron/80 mt-[2px]">
                  கிருத்திகா சிவ்குமார்
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
                  274 POLLING STATIONS · 7 AM
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
          <StatCard label="Electorate"  value="2,42,185" sub="Registered voters" color="n" />
          <StatCard label="Booths"      value="274"      sub="3 areas"           color="s" />
          <StatCard label="Coverage"    value="67.9%"    sub="186 agents ready"  color="g" progress={67.9} />
          <StatCard label="Volunteers"  value="1,248"    sub="On ground"         color="n" />
          <StatCard label="Surveys"     value="38,420"   sub="59% of target"     color="s" progress={59} />
          <StatCard label="Favourable"  value="61.4%"    sub="Win threshold: 50%" color="g" progress={61.4} />
          <StatCard label="Undecided"   value="24.8%"    sub="Persuadable"       color="r" />
          <StatCard label="Events"      value="42"       sub="Planned"           color="p" />
        </div>

        {/* 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Live Activity Feed */}
          <Card
            title="Recent Activity"
            icon="ph ph-lightning"
            headerRight={
              <Badge
                label={<><span className="live-dot mr-1" />&nbsp;LIVE</>}
                variant="s"
              />
            }
          >
            <ActivityFeedItem icon="ph ph-clipboard-text" iconBg="#dcfce7" iconColor="#138808"
              title="420 survey forms submitted – Sivagiri North"
              meta="Today 09:14 AM · Volunteer Team Alpha" />
            <ActivityFeedItem icon="ph ph-users-three" iconBg="#dbeafe" iconColor="#0d2455"
              title="18 new volunteers enrolled via WhatsApp"
              meta="Today 08:30 AM · Digital Cell" />
            <ActivityFeedItem icon="ph ph-megaphone" iconBg="#fff3e0" iconColor="#e07010"
              title="Door-to-door – Modakkurichi Ward 3 complete"
              meta="Yesterday · 340 houses covered" />
            <ActivityFeedItem icon="ph ph-warning" iconBg="#fee2e2" iconColor="#dc2626"
              title="Booths 003 & 028 still vacant – URGENT"
              meta="Mar 19 · Action needed" />
            <ActivityFeedItem icon="ph ph-check-square" iconBg="#dcfce7" iconColor="#138808"
              title={<>Voter list reconciliation – Modakkurichi <i className="ph ph-check" /></>}
              meta="Mar 18 · 88,420 verified"
              isLast />
          </Card>

          {/* Upcoming Events */}
          <Card title="Upcoming Events" icon="ph ph-calendar-check"
            headerRight={<Badge label="42 Total" variant="s" />}
          >
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr><th>Date</th><th>Event</th><th>Type</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Mar 25</b></td>
                    <td>Volunteer Training Camp</td>
                    <td><Badge label="Org" variant="g" /></td>
                    <td className="text-kampgreen font-bold text-[12px]"><i className="ph ph-check" /> Confirmed</td>
                  </tr>
                  <tr>
                    <td><b>Apr 1–3</b></td>
                    <td>Voter ID Awareness Drive</td>
                    <td><Badge label="Outreach" variant="blue" /></td>
                    <td className="text-kampgreen font-bold text-[12px]"><i className="ph ph-check" /> Confirmed</td>
                  </tr>
                  <tr>
                    <td><b>Apr 3</b></td>
                    <td className="font-tamil">மகளிர் வாக்காளர் சபை</td>
                    <td><Badge label="Women" variant="pink" /></td>
                    <td className="text-saffron-dark font-bold text-[12px]">Planning</td>
                  </tr>
                  <tr>
                    <td><b>Apr 8</b></td>
                    <td>Youth Connect Rally</td>
                    <td><Badge label="Rally" variant="s" /></td>
                    <td className="text-saffron-dark font-bold text-[12px]">Planning</td>
                  </tr>
                  <tr>
                    <td><b>Apr 10</b></td>
                    <td>Arram Health Camp</td>
                    <td><Badge label="Health" variant="g" /></td>
                    <td className="text-saffron-dark font-bold text-[12px]">Planning</td>
                  </tr>
                  <tr>
                    <td><b>Apr 15</b></td>
                    <td>Nomination Filing</td>
                    <td><Badge label="Official" variant="r" /></td>
                    <td className="text-kampr font-bold text-[12px]">Awaiting</td>
                  </tr>
                  <tr className="bg-kampgreen-light">
                    <td><b className="text-kampgreen">Apr 23</b></td>
                    <td className="text-kampgreen font-bold">ELECTION DAY</td>
                    <td><Badge label="POLLING" variant="g" /></td>
                    <td className="text-kampgreen font-black text-[12px]">VOTE DAY</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Overall Attendance */}
        {/* <Card title="Overall Attendance" icon="ph ph-identification-badge"
          headerRight={<Badge label="1,776 Total" variant="s" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"> */}
            {/* Booth Agents */}
            {/* <div className="rounded-[10px] p-4 bg-navy-light border-t-[3px] border-t-navy">
              <div className="flex items-center gap-2 mb-2">
                <i className="ph ph-identification-card text-navy text-[20px]" />
                <span className="font-inter text-[11px] font-bold text-navy uppercase tracking-[0.6px]">Booth Agents</span>
              </div>
              <div className="font-inter text-[28px] font-black text-navy leading-none">186</div>
              <div className="text-[9.5px] text-muted mt-1">out of 274 booths assigned</div>
              <div className="mt-2 bg-white/60 rounded h-[6px] overflow-hidden">
                <div className="h-full rounded" style={{ width: '67.9%', background: '#0d2455' }} />
              </div>
              <div className="text-[9px] text-navy font-bold mt-[4px]">67.9% coverage</div>
            </div> */}

            {/* Volunteers */}
            {/* <div className="rounded-[10px] p-4 bg-kampgreen-light border-t-[3px] border-t-kampgreen">
              <div className="flex items-center gap-2 mb-2">
                <i className="ph ph-users-three text-kampgreen text-[20px]" />
                <span className="font-inter text-[11px] font-bold text-kampgreen uppercase tracking-[0.6px]">Volunteers</span>
              </div>
              <div className="font-inter text-[28px] font-black text-kampgreen leading-none">1,248</div>
              <div className="text-[9.5px] text-muted mt-1">active on ground</div>
              <div className="mt-2 bg-white/60 rounded h-[6px] overflow-hidden">
                <div className="h-full rounded" style={{ width: '83%', background: '#138808' }} />
              </div>
              <div className="text-[9px] text-kampgreen font-bold mt-[4px]">83% of target (1,500)</div>
            </div> */}

            {/* Field Workers */}
            {/* <div className="rounded-[10px] p-4 bg-saffron-light border-t-[3px] border-t-saffron">
              <div className="flex items-center gap-2 mb-2">
                <i className="ph ph-map-trifold text-saffron-dark text-[20px]" />
                <span className="font-inter text-[11px] font-bold text-saffron-dark uppercase tracking-[0.6px]">Field Workers</span>
              </div>
              <div className="font-inter text-[28px] font-black text-saffron-dark leading-none">342</div>
              <div className="text-[9.5px] text-muted mt-1">deployed across 3 blocks</div>
              <div className="mt-2 bg-white/60 rounded h-[6px] overflow-hidden">
                <div className="h-full rounded" style={{ width: '76%', background: '#FF9933' }} />
              </div>
              <div className="text-[9px] text-saffron-dark font-bold mt-[4px]">76% of target (450)</div>
            </div>
          </div> */}

          {/* Block-wise breakdown table */}
          {/* <div className="overflow-x-auto mt-4">
            <table className="data-table w-full">
              <thead>
                <tr><th>Block</th><th>Booth Agents</th><th>Volunteers</th><th>Field Workers</th><th>Total</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Modakkurichi</b></td>
                  <td className="text-navy font-bold">76</td>
                  <td className="text-kampgreen font-bold">512</td>
                  <td className="text-saffron-dark font-bold">142</td>
                  <td className="font-bold">730</td>
                </tr>
                <tr>
                  <td><b>Sivagiri</b></td>
                  <td className="text-navy font-bold">60</td>
                  <td className="text-kampgreen font-bold">438</td>
                  <td className="text-saffron-dark font-bold">118</td>
                  <td className="font-bold">616</td>
                </tr>
                <tr>
                  <td><b>Erode City</b></td>
                  <td className="text-navy font-bold">50</td>
                  <td className="text-kampgreen font-bold">298</td>
                  <td className="text-saffron-dark font-bold">82</td>
                  <td className="font-bold">430</td>
                </tr>
                <tr className="bg-saffron-light font-bold">
                  <td>TOTAL</td>
                  <td className="text-navy">186</td>
                  <td className="text-kampgreen">1,248</td>
                  <td className="text-saffron-dark">342</td>
                  <td className="text-navy">1,776</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card> */}

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
