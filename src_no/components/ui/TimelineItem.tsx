import React from 'react'

interface TimelineItemProps {
  date:       React.ReactNode
  title:      React.ReactNode
  sub?:       React.ReactNode
  isElection?: boolean
}

export default function TimelineItem({ date, title, sub, isElection }: TimelineItemProps) {
  return (
    <div className="relative mb-4 pl-[14px] tl-dot">
      <div
        className={`
          text-[10px] font-bold mb-[2px] flex items-center gap-1
          ${isElection ? 'text-kampgreen' : 'text-saffron-dark'}
        `}
      >
        {date}
      </div>
      <div
        className={`text-[12px] font-bold ${isElection ? 'text-kampgreen' : 'text-textMain'}`}
      >
        {title}
      </div>
      {sub && (
        <div className="text-[9.5px] text-muted mt-[2px]">{sub}</div>
      )}
    </div>
  )
}
