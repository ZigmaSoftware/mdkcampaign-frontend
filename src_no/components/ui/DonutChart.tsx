import React from 'react'

export interface DonutSegment {
  value:  number
  color:  string
}

interface DonutChartProps {
  segments:   DonutSegment[]
  centerValue: string
  centerLabel: string
  size?:       number
  strokeWidth?: number
}

export default function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size        = 120,
  strokeWidth = 18,
}: DonutChartProps) {
  const r      = (size - strokeWidth) / 2
  const circ   = 2 * Math.PI * r
  const cx     = size / 2
  const cy     = size / 2
  const total  = segments.reduce((a, b) => a + b.value, 0)

  let offset = 0
  const arcs = segments.map((seg) => {
    const dash  = (seg.value / total) * circ
    const gap   = circ - dash
    const el = (
      <circle
        key={offset}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
      />
    )
    offset += dash
    return el
  })

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="donut-svg"
      >
        {/* track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {arcs}
      </svg>
      {/* center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-inter text-[20px] font-extrabold text-navy leading-none">
          {centerValue}
        </span>
        <span className="text-[8.5px] text-muted mt-[1px]">{centerLabel}</span>
      </div>
    </div>
  )
}
