import React from 'react'

export interface BarChartItem {
  label:  string
  value:  number      // raw number
  pct:    number      // 0-100 for bar height
  color:  string      // tailwind bg class or hex
  display: string     // label shown inside bar
}

interface BarChartProps {
  items:   BarChartItem[]
  height?: number
}

export default function BarChart({ items, height = 180 }: BarChartProps) {
  return (
    <div
      className="flex items-end gap-[10px] w-full"
      style={{ height }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center gap-0 flex-1 h-full justify-end"
        >
          <div
            className="w-full rounded-t-[6px] min-h-[4px] relative flex items-start
                       justify-center pt-[6px] transition-all duration-500"
            style={{
              height:     `${item.pct}%`,
              background: item.color,
            }}
          >
            <span
              className="text-[11px] font-extrabold text-white whitespace-nowrap leading-none"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
            >
              {item.display}
            </span>
          </div>
          <div className="text-[10px] text-muted tracking-[0.3px] text-center mt-[7px] whitespace-nowrap">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  )
}
