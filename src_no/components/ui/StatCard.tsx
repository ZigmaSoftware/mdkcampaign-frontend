import React from 'react'
import ProgressBar from './ProgressBar'
import type { ColorToken } from '../../types/ui.types'

interface StatCardProps {
  label:     string
  value:     React.ReactNode
  sub?:      string
  color?:    ColorToken
  progress?: number   // 0-100, omit to hide bar
}

const topBorderMap: Record<ColorToken, string> = {
  s: 'border-t-saffron',
  g: 'border-t-kampgreen',
  r: 'border-t-kampr',
  p: 'border-t-kampp',
  n: 'border-t-navy',
}

const valueColorMap: Record<ColorToken, string> = {
  s: 'text-saffron',
  g: 'text-kampgreen',
  r: 'text-kampr',
  p: 'text-kampp',
  n: 'text-navy',
}

export default function StatCard({ label, value, sub, color = 'n', progress }: StatCardProps) {
  return (
    <div
      className={`
        bg-surface rounded-[10px] px-[16px] py-[14px] shadow-card
        border-t-[3px] relative overflow-hidden
        ${topBorderMap[color]}
      `}
    >
      <div className="text-[9px] text-muted tracking-[0.5px] uppercase mb-1">{label}</div>
      <div className={`font-inter text-[22px] font-extrabold leading-none ${valueColorMap[color]}`}>
        {value}
      </div>
      {sub && <div className="text-[9.5px] text-muted mt-[3px]">{sub}</div>}
      {progress !== undefined && (
        <ProgressBar value={progress} color={color === 'n' ? 'g' : color} />
      )}
    </div>
  )
}
