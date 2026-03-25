import React from 'react'

interface CardProps {
  title:        React.ReactNode
  icon?:        string
  headerRight?: React.ReactNode
  children:     React.ReactNode
  className?:   string
  bodyClass?:   string
}

export default function Card({
  title,
  icon,
  headerRight,
  children,
  className  = '',
  bodyClass  = '',
}: CardProps) {
  return (
    <div
      className={`bg-surface rounded-card shadow-card overflow-hidden mb-5 ${className}`}
    >
      {/* Card header */}
      <div className="bg-navy text-white px-[18px] py-[11px] flex items-center justify-between">
        <h3 className="font-inter text-[11px] font-extrabold tracking-[1px] uppercase flex items-center gap-2">
          {icon && <i className={`${icon} opacity-85`} />}
          {title}
        </h3>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      {/* Card body */}
      <div className={`px-[18px] py-[16px] ${bodyClass}`}>
        {children}
      </div>
    </div>
  )
}
