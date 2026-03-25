import React from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import BarChart from '../components/ui/BarChart'
import DonutChart from '../components/ui/DonutChart'
import { exportReportCsv } from '../utils/exportCsv'
import { useToast } from '../context/ToastContext'

/* ── KPI card ─────────────────────────────────────────────────────── */
function Kpi({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="bg-surface rounded-[10px] px-[14px] py-3 shadow-card text-center">
      <div className="font-inter text-[20px] font-extrabold" style={{ color }}>{value}</div>
      <div className="text-[9px] text-muted uppercase tracking-[0.5px] mt-[3px]">{label}</div>
    </div>
  )
}

/* ── Survey progress row ─────────────────────────────────────────── */
function SurveyRow({
  label, current, total, pct, color,
}: { label: string; current: string; total: string; pct: number; color: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-[11px]">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{current} / {total}</span>
      </div>
      <div className="bg-[#e5e7eb] rounded h-2 overflow-hidden">
        <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { showToast } = useToast()

  const handleExport = () => {
    exportReportCsv()
    showToast('<i class="ph ph-file-csv"></i> Report CSV exported!', '#138808')
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <div className="flex items-center justify-between mb-[14px] flex-wrap gap-2">
        <SectionHeader
          title="Campaign Analytics & Reports"
          subtitle="Based on current data · Constituency 100 · TN Assembly 2026"
        />
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-[6px] px-[14px] py-[6px]
                       bg-kampgreen-light text-kampgreen-dark border border-kampgreen/30
                       rounded-md font-inter text-[10px] font-bold tracking-[0.8px] uppercase
                       cursor-pointer hover:bg-kampgreen hover:text-white transition-all duration-150"
          >
            <i className="ph ph-file-csv" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-[6px] px-[14px] py-[6px]
                       bg-navy-light text-navy border border-navy/20
                       rounded-md font-inter text-[10px] font-bold tracking-[0.8px] uppercase
                       cursor-pointer hover:bg-navy hover:text-white transition-all duration-150"
          >
            <i className="ph ph-printer" /> Print
          </button>
        </div>
      </div>

      {/* KPI Row — 6 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[10px] mb-5">
        <Kpi value="2,42,185" label="Total Voters"    color="#0d2455" />
        <Kpi value="67.9%"    label="Booth Coverage"  color="#138808" />
        <Kpi value="61.4%"    label="Favourable"      color="#FF9933" />
        <Kpi value="24.8%"    label="Undecided"       color="#dc2626" />
        <Kpi value="38,420"   label="Surveys Done"    color="#7c3aed" />
        <Kpi value="1,248"    label="Volunteers"      color="#0d2455" />
      </div>

      {/* Sentiment + Area Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sentiment Distribution */}
        <Card title="Vote Sentiment Distribution" icon="ph ph-chart-pie"
          headerRight={<Badge label="38,420 Surveyed" variant="s" />}
        >
          <div className="flex gap-5 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <BarChart items={[
                { label: 'Strongly Fav.', value: 40.2, pct: 87, display: '40.2%', color: '#138808' },
                { label: 'Favourable',    value: 21.2, pct: 46, display: '21.2%', color: '#22c55e' },
                { label: 'Undecided',     value: 24.8, pct: 54, display: '24.8%', color: '#FF9933' },
                { label: 'Opposition',    value: 13.8, pct: 30, display: '13.8%', color: '#dc2626' },
              ]} height={180} />
            </div>
            <div className="min-w-[130px] flex-shrink-0 pb-[20px]">
              <div className="text-[10px] text-muted mb-2 font-bold">LEGEND</div>
              {[
                { color: '#138808', label: 'Strongly Favourable' },
                { color: '#22c55e', label: 'Favourable' },
                { color: '#FF9933', label: 'Undecided' },
                { color: '#dc2626', label: 'Opposition' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-[6px] text-[10px] mb-[5px]">
                  <span className="inline-block w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ background: color }} />
                  {label}
                </div>
              ))}
              <div className="mt-[14px] p-[10px] bg-kampgreen-light rounded-lg text-[10px] text-kampgreen-dark font-bold">
                <i className="ph ph-crosshair-simple mr-1" />Combined Favourable:<br />61.4% (BJP wins if &gt;50%)
              </div>
            </div>
          </div>
        </Card>

        {/* Area Favourability */}
        <Card title="Area-wise Favourability" icon="ph ph-chart-bar"
          headerRight={<Badge label="3 Areas" variant="s" />}
        >
          <BarChart items={[
            { label: 'Modakkurichi', value: 65,   pct: 95, display: '65%',   color: '#138808' },
            { label: 'Sivagiri',     value: 54,   pct: 79, display: '54%',   color: '#FF9933' },
            { label: 'Erode City',   value: 48,   pct: 70, display: '48%',   color: '#dc2626' },
            { label: 'OVERALL',      value: 61.4, pct: 90, display: '61.4%', color: 'rgba(13,36,85,0.75)' },
          ]} height={180} />
          <div className="mt-[10px]">
            <Alert type="warning">
              <i className="ph ph-x-circle" /> Erode City (48%) is below win threshold. Priority focus needed on booths 028, 035.
            </Alert>
          </div>
        </Card>
      </div>

      {/* Survey Progress + Booth Agent Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Survey Coverage Progress */}
        <Card title="Survey Coverage Progress" icon="ph ph-chart-bar-horizontal"
          headerRight={<Badge label="Target: 65,000" variant="s" />}
        >
          {/* Overall */}
          <div className="mb-[14px]">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] font-bold">Overall Survey Progress</span>
              <span className="text-[11px] text-saffron font-bold">38,420 / 65,000</span>
            </div>
            <div className="bg-[#e5e7eb] rounded-[5px] h-3 overflow-hidden">
              <div className="w-[59%] h-full rounded-[5px]"
                style={{ background: 'linear-gradient(90deg,#138808,#FF9933)' }} />
            </div>
            <div className="text-[9.5px] text-muted mt-[3px]">59% complete · 26,580 remaining</div>
          </div>
          <SurveyRow label="Modakkurichi" current="18,200" total="28,000" pct={65} color="#138808" />
          <SurveyRow label="Sivagiri"     current="11,400" total="22,000" pct={52} color="#FF9933" />
          <SurveyRow label="Erode City"   current="8,820"  total="15,000" pct={59} color="#dc2626" />
        </Card>

        {/* Booth Agent Coverage Report */}
        <Card title="Booth Agent Coverage Report" icon="ph ph-table"
          headerRight={<Badge label="274 Booths" variant="s" />}
        >
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr><th>Area</th><th>Booths</th><th>Ready</th><th>Partial</th><th>Vacant</th><th>Coverage</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Modakkurichi</b></td><td>112</td>
                  <td className="text-kampgreen font-bold">76</td>
                  <td className="text-saffron-dark font-bold">20</td>
                  <td className="text-kampr font-bold">16</td>
                  <td><span className="text-kampgreen font-bold">67.8%</span></td>
                </tr>
                <tr>
                  <td><b>Sivagiri</b></td><td>89</td>
                  <td className="text-kampgreen font-bold">60</td>
                  <td className="text-saffron-dark font-bold">14</td>
                  <td className="text-kampr font-bold">15</td>
                  <td><span className="text-saffron-dark font-bold">67.4%</span></td>
                </tr>
                <tr>
                  <td><b>Erode City</b></td><td>73</td>
                  <td className="text-kampgreen font-bold">50</td>
                  <td className="text-saffron-dark font-bold">8</td>
                  <td className="text-kampr font-bold">15</td>
                  <td><span className="text-kampr font-bold">68.5%</span></td>
                </tr>
                <tr className="bg-saffron-light font-bold">
                  <td>TOTAL</td><td>274</td>
                  <td className="text-kampgreen">186</td>
                  <td className="text-saffron-dark">42</td>
                  <td className="text-kampr">46</td>
                  <td><span className="text-navy">67.9%</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-[14px] text-[10px] flex-wrap">
            <span><span className="inline-block w-[7px] h-[7px] rounded-full bg-kampgreen mr-1" />Ready: 186</span>
            <span><span className="inline-block w-[7px] h-[7px] rounded-full bg-saffron mr-1" />Partial: 42</span>
            <span><span className="inline-block w-[7px] h-[7px] rounded-full bg-kampr mr-1" />Vacant: 46 (FILL NOW)</span>
          </div>
        </Card>
      </div>

      {/* Attendance Analysis */}
      <Card title="Overall Attendance Analysis" icon="ph ph-chart-pie"
        headerRight={<Badge label="1,776 Total" variant="s" />}
      >
        <div className="flex gap-6 items-center flex-wrap">
          <DonutChart
            size={160}
            strokeWidth={24}
            centerValue="1,776"
            centerLabel="Total"
            segments={[
              { value: 186,   color: '#0d2455' },
              { value: 1248,  color: '#138808' },
              { value: 342,   color: '#FF9933' },
            ]}
          />
          <div className="flex-1 min-w-[200px]">
            {[
              { color: '#0d2455', label: 'Booth Agents',   value: 186,   pct: 10.5, sub: '67.9% of 274 booths' },
              { color: '#138808', label: 'Volunteers',      value: 1248,  pct: 70.3, sub: '83% of 1,500 target' },
              { color: '#FF9933', label: 'Field Workers',   value: 342,   pct: 19.2, sub: '76% of 450 target'   },
            ].map(({ color, label, value, pct, sub }) => (
              <div key={label} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[11px] font-bold">{label}</span>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color }}>{value.toLocaleString()} <span className="text-muted font-normal">({pct}%)</span></span>
                </div>
                <div className="bg-[#e5e7eb] rounded h-[6px] overflow-hidden">
                  <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="text-[9px] text-muted mt-[2px]">{sub}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 min-w-[140px]">
            {[
              { label: 'Modakkurichi', agents: 76,  vols: 512, field: 142, total: 730  },
              { label: 'Sivagiri',     agents: 60,  vols: 438, field: 118, total: 616  },
              { label: 'Erode City',   agents: 50,  vols: 298, field: 82,  total: 430  },
            ].map(row => (
              <div key={row.label} className="bg-surface rounded-[8px] px-3 py-2 shadow-card">
                <div className="text-[9px] font-bold text-navy uppercase tracking-[0.5px] mb-1">{row.label}</div>
                <div className="flex gap-2 text-[9px]">
                  <span className="text-navy font-bold">{row.agents} <span className="text-muted font-normal">agents</span></span>
                  <span className="text-kampgreen font-bold">{row.vols} <span className="text-muted font-normal">vols</span></span>
                  <span className="text-saffron-dark font-bold">{row.field} <span className="text-muted font-normal">field</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Arram Impact */}
      <Card title="Arram Charity Trust – Campaign Impact Numbers" icon="ph ph-heartbeat"
        headerRight={<Badge label="Proven Credential" variant="g" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: 'ph ph-bowl-food',           value: '3,40,000+', label: 'Meals Served',              bg: 'bg-saffron-light',   border: 'border-t-saffron',       valColor: 'text-saffron-dark' },
            { icon: 'ph ph-hospital',            value: '86,500+',   label: 'Consultations',             bg: 'bg-kampr-light',     border: 'border-t-kampr',         valColor: 'text-kampr'  },
            { icon: 'ph ph-graduation-cap',      value: '196',       label: 'NEET Students Coached',     bg: 'bg-navy-light',      border: 'border-t-navy',          valColor: 'text-navy'   },
            { icon: 'ph ph-briefcase',           value: '350+',      label: 'Jobs Placed',               bg: 'bg-kampgreen-light', border: 'border-t-kampgreen',     valColor: 'text-kampgreen' },
            { icon: 'ph ph-mosque',              value: '4,500+',    label: 'Pilgrimage Beneficiaries',  bg: 'bg-kampp-light',     border: 'border-t-kampp',         valColor: 'text-kampp'  },
            { icon: 'ph ph-person-simple-dress', value: '1,418',     label: 'Women Skilled',             bg: 'bg-[#fce7f3]',       border: 'border-t-[#db2777]',     valColor: 'text-[#db2777]' },
          ].map(({ icon, value, label, bg, border, valColor }) => (
            <div key={label} className={`text-center p-3 rounded-[10px] border-t-[3px] ${bg} ${border}`}>
              <div className="text-[24px] mb-1"><i className={icon} /></div>
              <div className={`font-inter text-[20px] font-extrabold ${valColor}`}>{value}</div>
              <div className="text-[9.5px] text-muted uppercase tracking-[0.5px]">{label}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className={`text-center p-3 rounded-[10px] border-t-[3px] bg-[#fce7f3] border-t-[#db2777]`}>
            <div className="text-[24px] mb-1"><i className="ph ph-person-simple-dress" /></div>
            <div className="font-inter text-[20px] font-bold text-[#db2777]">1,418</div>
            <div className="text-[9.5px] text-muted uppercase tracking-[0.5px]">Women Skilled</div>
          </div>
          <div className={`text-center p-3 rounded-[10px] border-t-[3px] bg-saffron-light border-t-saffron`}>
            <div className="text-[22px] mb-[6px]"><i className="ph ph-eyedropper" /></div>
            <div className="font-inter text-[20px] font-extrabold text-saffron-dark">50</div>
            <div className="text-[9.5px] text-muted uppercase tracking-[0.5px]">Cataract Surgeries</div>
          </div>
          <div className={`text-center p-3 rounded-[10px] border-t-[3px] bg-navy-light border-t-navy`}>
            <div className="text-[24px] mb-1"><i className="ph ph-graduation-cap" /></div>
            <div className="font-inter text-[20px] font-extrabold text-navy">11</div>
            <div className="text-[9.5px] text-muted uppercase tracking-[0.5px]">Medical College Admissions</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
