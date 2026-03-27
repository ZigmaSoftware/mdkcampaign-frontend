import { useLiveClock } from '../../hooks/useLiveClock'
import { CANDIDATE_NAME, CONSTITUENCY_NO, CONSTITUENCY_NAME, DISTRICT } from '../../constants/app.constants'

export default function TopBar() {
  const clock = useLiveClock()

  return (
    <div
      className="bg-navy sticky top-0 z-[500] flex items-center justify-between px-3 sm:px-6 py-[10px]
                 border-b-2 border-saffron shadow-topbar flex-wrap gap-2"
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <span
          className="text-[28px] leading-none"
          style={{ filter: 'drop-shadow(0 0 8px rgba(255,153,51,0.5))' }}
        >
          <i className="ph ph-flower-lotus text-saffron" />
        </span>
        <div>
          <h1 className="font-inter text-[13px] font-bold tracking-[1.5px] text-white leading-tight uppercase">
            Campaign System
          </h1>
          <p className="font-tamil text-[9px] text-[#9bb0e0] mt-[1px] hidden sm:block">
            பா.ஜ.க. தேர்தல் மேலாண்மை அமைப்பு
          </p>
        </div>
      </div>

      {/* Right info */}
      <div className="text-right">
        <div className="text-[12px] text-saffron font-bold tracking-[1px]" id="live-time">
          {clock}
        </div>
        <div className="text-[9px] text-[#7090c0] mt-[1px] hidden sm:block">
          {CANDIDATE_NAME} · Con. {CONSTITUENCY_NO} – {CONSTITUENCY_NAME} · {DISTRICT}
        </div>
      </div>
    </div>
  )
}
