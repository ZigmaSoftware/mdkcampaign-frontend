import React from 'react'
import type { BtnVariant } from '../../types/ui.types'

interface BtnProps {
  variant?:  BtnVariant
  size?:     'sm' | 'md'
  onClick?:  () => void
  type?:     'button' | 'submit' | 'reset'
  children:  React.ReactNode
  className?: string
  disabled?: boolean
}

const variantClasses: Record<BtnVariant, string> = {
  primary:   'bg-saffron text-navy hover:bg-saffron-dark',
  secondary: 'bg-navy text-white hover:bg-navy-mid',
  success:   'bg-kampgreen text-white hover:bg-kampgreen-dark',
  danger:    'bg-kampr text-white hover:bg-red-700',
}

export default function Btn({
  variant = 'primary',
  size    = 'md',
  onClick,
  type    = 'button',
  children,
  className = '',
  disabled = false,
}: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-[6px]
        font-inter font-bold tracking-[1px] uppercase transition-all duration-150
        border-none cursor-pointer rounded-md disabled:opacity-60 disabled:cursor-not-allowed
        ${size === 'sm' ? 'px-[14px] py-[6px] text-[10px]' : 'px-[22px] py-[10px] text-[12px]'}
        ${variantClasses[variant]} ${className}
      `}
    >
      {children}
    </button>
  )
}
