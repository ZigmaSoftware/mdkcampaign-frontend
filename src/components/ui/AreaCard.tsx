import React from 'react'
import ProgressBar from './ProgressBar'
import type { ColorToken } from '../../types/ui.types'

interface AreaCardProps {
  name:           string
  icon:           string
  voters:         string
  sub:            string
  favorableLabel: string
  favorablePct:   number
  accentColor:    ColorToken
  className?:     string
}

const borderMap: Record<string, string> = {
  g: 'border-l-kampgreen',
  s: 'border-l-saffron',
  r: 'border-l-kampr',
  p: 'border-l-kampp',
  n: 'border-l-navy',
}

const favColorMap: Record<string, string> = {
  g: 'text-kampgreen',
  s: 'text-saffron-dark',
  r: 'text-kampr',
  p: 'text-kampp',
  n: 'text-navy',
}

export default function AreaCard({
  name,
  icon,
  voters,
  sub,
  favorableLabel,
  favorablePct,
  accentColor,
  className = '',
}: AreaCardProps) {
  return (
    <div
      className={`
        bg-surface rounded-[10px] border border-border p-[14px] shadow-card
        border-l-4 ${borderMap[accentColor]} ${className}
      `}
    >
      <div className="text-[13px] font-bold text-navy mb-1 flex items-center gap-1">
        <i className={icon} />
        {name}
      </div>
      <div className="font-inter text-[20px] text-saffron font-extrabold">{voters}</div>
      <div className="text-[9.5px] text-muted mt-[1px] mb-2">{sub}</div>
      <div className={`text-[11px] font-bold ${favColorMap[accentColor]}`}>{favorableLabel}</div>
      <ProgressBar value={favorablePct} color={accentColor} />
    </div>
  )
}
