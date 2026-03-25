import React from 'react'
import Badge from '../ui/Badge'

interface EntryListHeaderProps {
  title:         React.ReactNode
  icon:          string
  count:         number
  badgeVariant?: 'bs' | 'br' | 's' | 'r'
  onAddNew?:     () => void
  addLabel?:     string
  onImport?:     () => void
}

export default function EntryListHeader({
  title,
  icon,
  count,
  badgeVariant = 's',
  onAddNew,
  addLabel,
  onImport,
}: EntryListHeaderProps) {
  return (
    <div className="bg-navy text-white px-[18px] py-3 flex items-center justify-between gap-[10px]">
      <h3 className="font-inter text-[11px] font-extrabold tracking-[1px] uppercase flex items-center gap-2">
        <i className={icon} />
        {title}
      </h3>
      <div className="flex items-center gap-[10px]">
        <Badge
          label={String(count)}
          variant={badgeVariant === 'br' ? 'r' : 's'}
        />
        {onImport && (
          <button
            onClick={onImport}
            className="
              inline-flex items-center gap-[6px] px-[14px] py-2
              bg-white/10 text-white border border-white/20 rounded-[7px]
              font-inter text-[11px] font-extrabold tracking-[0.8px] uppercase
              cursor-pointer transition-all duration-150 hover:bg-white/20
            "
          >
            <i className="ph ph-upload-simple" />
            Import
          </button>
        )}
        {onAddNew && (
          <button
            onClick={onAddNew}
            className="
              inline-flex items-center gap-[6px] px-[18px] py-2
              bg-saffron text-navy border-none rounded-[7px]
              font-inter text-[11px] font-extrabold tracking-[0.8px] uppercase
              cursor-pointer transition-all duration-150 hover:bg-saffron-dark
            "
          >
            <i className="ph ph-plus" />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  )
}
