import React from 'react'
import type { BadgeVariant } from '../../types/ui.types'

interface BadgeProps {
  label:    React.ReactNode
  variant?: BadgeVariant
  className?: string
  style?:   React.CSSProperties
}

const variantClasses: Record<BadgeVariant, string> = {
  s:      'bg-saffron text-navy',
  g:      'bg-kampgreen text-white',
  r:      'bg-kampr text-white',
  p:      'bg-kampp text-white',
  n:      'bg-navy text-white',
  blue:   'bg-navy-light text-navy',
  pink:   'bg-[#fce7f3] text-[#9d174d]',
  custom: '',
}

export default function Badge({ label, variant = 's', className = '', style }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        text-[9px] font-bold px-[9px] py-[3px] rounded-[10px] tracking-[0.5px]
        ${variantClasses[variant]} ${className}
      `}
      style={style}
    >
      {label}
    </span>
  )
}
