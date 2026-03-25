import { useCountdown } from '../../hooks/useCountdown'

export default function Countdown() {
  const { d, h, m, s } = useCountdown()

  const cells = [
    { num: d, lbl: 'DAYS'  },
    { num: h, lbl: 'HOURS' },
    { num: m, lbl: 'MINS'  },
    { num: s, lbl: 'SECS'  },
  ]

  return (
    <div className="grid grid-cols-4 gap-[10px]">
      {cells.map(({ num, lbl }) => (
        <div
          key={lbl}
          className="bg-white/[0.07] border border-white/[0.12] rounded-lg py-[10px] px-[6px] text-center"
        >
          <div className="font-inter text-[26px] font-extrabold text-white leading-none tabular-nums w-[2ch] mx-auto">
            {num}
          </div>
          <div className="text-[8px] text-white/60 tracking-[1px] mt-[3px]">{lbl}</div>
        </div>
      ))}
    </div>
  )
}
