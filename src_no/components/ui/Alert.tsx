import React from 'react'
import type { AlertType } from '../../types/ui.types'

interface AlertProps {
  type:     AlertType
  children: React.ReactNode
}

const cfg: Record<AlertType, { bg: string; text: string; border: string; icon: string }> = {
  warning: {
    bg:     'bg-[#fef3c7]',
    text:   'text-[#92400e]',
    border: 'border-l-[#f59e0b]',
    icon:   'ph ph-clock',
  },
  success: {
    bg:     'bg-kampgreen-light',
    text:   'text-kampgreen-dark',
    border: 'border-l-kampgreen',
    icon:   'ph ph-check-circle',
  },
  danger: {
    bg:     'bg-kampr-light',
    text:   'text-[#991b1b]',
    border: 'border-l-kampr',
    icon:   'ph ph-warning',
  },
}

export default function Alert({ type, children }: AlertProps) {
  const c = cfg[type]
  return (
    <div
      className={`
        flex items-start gap-2 px-[14px] py-[10px] rounded-lg
        border-l-[3px] text-[11px] font-semibold mb-[10px]
        ${c.bg} ${c.text} ${c.border}
      `}
    >
      <i className={`${c.icon} text-[13px] mt-[1px] flex-shrink-0`} />
      <span>{children}</span>
    </div>
  )
}
