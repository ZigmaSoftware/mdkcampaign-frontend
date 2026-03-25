import React from 'react'

interface ActivityFeedItemProps {
  icon:      string
  iconBg:    string
  iconColor: string
  title:     React.ReactNode
  meta:      string
  isLast?:   boolean
}

export default function ActivityFeedItem({
  icon,
  iconBg,
  iconColor,
  title,
  meta,
  isLast,
}: ActivityFeedItemProps) {
  return (
    <div
      className={`flex gap-[10px] py-2 items-start ${!isLast ? 'border-b border-border' : ''}`}
    >
      <div
        className="w-8 h-8 rounded-[7px] flex items-center justify-center text-[14px] flex-shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        <i className={icon} />
      </div>
      <div>
        <div className="text-[12px] font-semibold text-textMain leading-snug">{title}</div>
        <div className="text-[9.5px] text-muted mt-[1px]">{meta}</div>
      </div>
    </div>
  )
}
