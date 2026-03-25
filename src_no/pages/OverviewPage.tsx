import React from 'react'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import AreaCard from '../components/ui/AreaCard'
import RingRow from '../components/ui/RingRow'
import TimelineItem from '../components/ui/TimelineItem'
import BarChart from '../components/ui/BarChart'
import DonutChart from '../components/ui/DonutChart'
import SectionHeader from '../components/ui/SectionHeader'

export default function OverviewPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <SectionHeader
        title="Master Overview"
        icon="ph ph-chart-bar"
        subtitle="Constituency 100 · All 3 Areas · Live Aggregated Data"
      />

      {/* 8-stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-[10px] mb-5">
        <StatCard label="Total Voters"   value="2,42,185" sub="Registered Electorate"  color="n" />
        <StatCard label="Total Booths"   value="274"      sub="Across 3 areas"         color="s" />
        <StatCard label="Booth Agents"   value="186"      sub="67.9% coverage"         color="g" progress={67.9} />
        <StatCard label="Volunteers"     value="1,248"    sub="Active on ground"        color="n" />
        <StatCard label="Surveys Done"   value="38,420"   sub="59% of 65K target"      color="s" progress={59} />
        <StatCard label="Favourable"     value="61.4%"    sub="Survey sentiment"        color="g" progress={61.4} />
        <StatCard label="Undecided"      value="24.8%"    sub="Persuadable target"      color="r" />
        <StatCard label="Events"         value="42"       sub="Planned · 30 days"       color="p" />
      </div>

      {/* Alerts */}
      <Alert type="danger">
        <strong>URGENT:</strong> 46 booths still have no agent assigned! Deadline: March 25. Fill vacancies immediately.
      </Alert>
      <Alert type="warning">
        <strong>Election Day:</strong> April 23, 2026 · Nomination Filing: April 15 · Silent Day: April 22
      </Alert>
      <Alert type="success">
        Voter list reconciliation complete for Modakkurichi (88,420 verified). Sivagiri survey in progress.
      </Alert>

      {/* Area Strength + Booth Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Area Strength */}
        <Card title="Area-wise Strength" icon="ph ph-map-pin-area"
          headerRight={<Badge label="3 Areas" variant="s" />}
        >
          <div className="flex flex-col gap-[10px]">
            <AreaCard name="Modakkurichi"   icon="ph ph-city"      voters="88,420" sub="112 Booths · 68 Agents · 60.7% Coverage" favorableLabel="65% Favourable"              favorablePct={65} accentColor="g" />
            <AreaCard name="Sivagiri"       icon="ph ph-mountains" voters="74,315" sub="89 Booths · 58 Agents · 65.2% Coverage"  favorableLabel="54% Favourable"              favorablePct={54} accentColor="s" />
            <AreaCard name="Erode City (Part)" icon="ph ph-buildings" voters="79,450" sub="73 Booths · 60 Agents · 82.2% Coverage" favorableLabel="48% Favourable — Needs Focus" favorablePct={48} accentColor="r" />
          </div>
        </Card>

        {/* Right column: booth coverage + open tasks */}
        <div className="flex flex-col gap-4">
          <Card title="Booth Coverage" icon="ph ph-check-circle"
            headerRight={<Badge label="274 Booths" variant="s" />}
          >
            <RingRow label={<><span className="inline-block w-[7px] h-[7px] rounded-full bg-kampgreen mr-[5px]" />Ready (186)</>}  value={67.9} pct="67.9%" color="g" />
            <RingRow label={<><span className="inline-block w-[7px] h-[7px] rounded-full bg-saffron mr-[5px]" />Partial (42)</>}   value={15.3} pct="15.3%" color="s" />
            <RingRow label={<><span className="inline-block w-[7px] h-[7px] rounded-full bg-kampr mr-[5px]" />No Agent (46)</>}    value={16.8} pct="16.8%" color="r" />
            <div className="mt-[10px] px-[10px] py-[10px] bg-saffron-light rounded-lg text-[11px] text-saffron-dark font-bold">
              <i className="ph ph-crosshair-simple mr-1" />Target: 274/274 booths (100%) by Apr 15
            </div>
          </Card>

          <Card title="Open Tasks" icon="ph ph-list-checks"
            headerRight={<Badge label="3 Urgent" variant="r" />}
          >
            <div className="text-[12px]">
              {[
                { color: 'bg-kampr',    text: 'Fill 46 vacant booth agent slots',           due: 'Due Mar 25', dv: 'r' },
                { color: 'bg-[#f59e0b]', text: 'Complete household survey – Sivagiri',       due: 'Due Apr 5',  dv: 's' },
                { color: 'bg-[#f59e0b]', text: 'Women Voters Sabha – Sivagiri',              due: 'Apr 3',      dv: 's' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2 py-[7px] border-b border-border">
                  <div className={`w-[14px] h-[14px] rounded-[3px] ${t.color} flex items-center justify-center text-white text-[8px] flex-shrink-0`}>!</div>
                  <div className="flex-1">{t.text}</div>
                  <Badge label={t.due} variant={t.dv as 'r' | 's'} />
                </div>
              ))}
              <div className="flex items-center gap-2 py-[7px]">
                <div className="w-[14px] h-[14px] rounded-[3px] bg-kampgreen flex items-center justify-center flex-shrink-0">
                  <i className="ph ph-check text-white text-[8px]" />
                </div>
                <div className="flex-1 line-through text-muted">Booth agent list – Modakkurichi area</div>
                <span className="text-[9px] text-kampgreen font-bold">DONE</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Campaign Timeline */}
      <Card title="Campaign Timeline" icon="ph ph-calendar-dots"
        headerRight={<Badge label="Mar 21 – Apr 23" variant="s" />}
      >
        <div className="relative pl-[22px] tl-line">
          <TimelineItem date="Mar 25"    title="Volunteer Training Camp"                  sub={<>Modakkurichi Town Hall · Campaign HQ · <span className="text-kampgreen font-bold"><i className="ph ph-check" /> Confirmed</span></>} />
          <TimelineItem date="Apr 1–3"   title="Voter ID Awareness Drive"                 sub={<>Erode City Wards 4,7,9,12 · Ward volunteers · <span className="text-kampgreen font-bold"><i className="ph ph-check" /> Confirmed</span></>} />
          <TimelineItem date="Apr 3"     title="மகளிர் வாக்காளர் சபை (Women Voters Sabha)" sub="Sivagiri Town Hall · Candidate + SHG leads · Planning" />
          <TimelineItem date="Apr 8"     title="Youth Connect Rally"                       sub="Modakkurichi Ground · Youth wing · Planning" />
          <TimelineItem date="Apr 10"    title="Arram Free Health Camp – Sivagiri"         sub="Sivagiri Town · Arram Clinics · Planning" />
          <TimelineItem date={<><i className="ph ph-file-dashed" /> Apr 15</>} title="Nomination Filing" sub={<>Erode Collectorate · Candidate + Legal team · <span className="text-kampr font-bold">Awaiting</span></>} />
          <TimelineItem date="Apr 18"    title="Grand Constituency Rally"                  sub="Modakkurichi · Sivagiri · Erode · Candidate + BJP leaders · TBD" />
          <TimelineItem date={<><i className="ph ph-check-square text-kampgreen" /> Apr 23</>} title="ELECTION DAY" sub="274 Polling Stations · 7 AM start · All 274 booth agents deployed" isElection />
        </div>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Area Favourability bar chart */}
        <Card title="Area-wise Favourability" icon="ph ph-chart-bar"
          headerRight={<Badge label="3 Areas" variant="s" />}
        >
          <BarChart items={[
            { label: 'Modakkurichi', value: 65, pct: 95, display: '65%', color: '#138808' },
            { label: 'Sivagiri',     value: 54, pct: 79, display: '54%', color: '#FF9933' },
            { label: 'Erode City',   value: 48, pct: 70, display: '48%', color: '#dc2626' },
            { label: 'OVERALL',      value: 61, pct: 90, display: '61.4%', color: 'rgba(13,36,85,0.75)' },
          ]} />
        </Card>

        {/* Donut sentiment */}
        <Card title="Voter Sentiment" icon="ph ph-chart-pie"
          headerRight={<Badge label="38,420 Surveyed" variant="s" />}
        >
          <div className="flex gap-5 items-center flex-wrap">
            <DonutChart
              segments={[
                { value: 40.2, color: '#138808' },
                { value: 21.2, color: '#22c55e' },
                { value: 24.8, color: '#FF9933' },
                { value: 13.8, color: '#dc2626' },
              ]}
              centerValue="61.4%"
              centerLabel="Favourable"
            />
            <div className="flex-1 min-w-[140px]">
              {[
                { color: '#138808', label: 'Strongly Favourable', val: '40.2%' },
                { color: '#22c55e', label: 'Favourable',          val: '21.2%' },
                { color: '#FF9933', label: 'Undecided',           val: '24.8%' },
                { color: '#dc2626', label: 'Opposition',          val: '13.8%' },
              ].map(({ color, label, val }) => (
                <div key={label} className="flex items-center justify-between mb-[8px]">
                  <div className="flex items-center gap-[6px] text-[11px]">
                    <span className="inline-block w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ background: color }} />
                    {label}
                  </div>
                  <span className="font-bold text-[11px] text-navy">{val}</span>
                </div>
              ))}
              <div className="mt-[14px] p-[10px] bg-kampgreen-light rounded-lg text-[10px] text-kampgreen-dark font-bold">
                <i className="ph ph-crosshair-simple mr-1" />Combined Favourable:<br />61.4% (BJP wins if &gt;50%)
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
