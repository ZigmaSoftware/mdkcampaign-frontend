import React from 'react'

interface RingRowProps {
  label:   React.ReactNode
  sub?:    string
  value:   number   // 0-100
  pct:     string   // display string e.g. "67.9%"
  color?:  'g' | 's' | 'r' | 'p' | 'n'
}

const fillColor: Record<string, string> = {
  g: 'bg-kampgreen',
  s: 'bg-saffron',
  r: 'bg-kampr',
  p: 'bg-kampp',
  n: 'bg-navy',
}

const pctColor: Record<string, string> = {
  g: 'text-kampgreen',
  s: 'text-saffron',
  r: 'text-kampr',
  p: 'text-kampp',
  n: 'text-navy',
}

export default function RingRow({ label, sub, value, pct, color = 'g' }: RingRowProps) {
  return (
    <div className="flex items-center gap-[14px] mb-3">
      <div className="flex-1">
        <div className="text-[11px] font-bold text-textMain flex items-center gap-1">
          {label}
        </div>
        {sub && <div className="text-[9.5px] text-muted">{sub}</div>}
        <div className="bg-[#e5e7eb] rounded h-2 mt-[5px] overflow-hidden">
          <div
            className={`h-full rounded transition-all duration-500 ${fillColor[color]}`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
      <div className={`font-inter text-[14px] font-extrabold min-w-[38px] text-right ${pctColor[color]}`}>
        {pct}
      </div>
    </div>
  )
}
