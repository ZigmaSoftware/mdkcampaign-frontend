import React from 'react'

interface ProgressBarProps {
  value:   number   // 0-100
  color?:  'g' | 's' | 'r' | 'p' | 'n'
  height?: number
}

const colorMap: Record<string, string> = {
  g: 'bg-kampgreen',
  s: 'bg-saffron',
  r: 'bg-kampr',
  p: 'bg-kampp',
  n: 'bg-navy',
}

export default function ProgressBar({ value, color = 'g', height = 4 }: ProgressBarProps) {
  return (
    <div
      className="w-full bg-[#e5e7eb] rounded-[3px] overflow-hidden mt-[6px]"
      style={{ height }}
    >
      <div
        className={`h-full rounded-[3px] transition-all duration-[600ms] ease-in-out ${colorMap[color]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
