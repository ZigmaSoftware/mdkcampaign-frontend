import React from 'react'

interface SectionHeaderProps {
  title:     React.ReactNode
  icon?:     string
  subtitle?: React.ReactNode
}

export default function SectionHeader({ title, icon, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-[14px]">
      <h2
        className="font-inter text-[11.5px] font-extrabold tracking-[1px] text-navy
                   border-l-4 border-saffron pl-[10px] uppercase flex items-center gap-2"
      >
        {icon && <i className={`${icon} opacity-85`} />}
        {title}
      </h2>
      {subtitle && (
        <span className="text-[10px] text-muted">{subtitle}</span>
      )}
    </div>
  )
}
