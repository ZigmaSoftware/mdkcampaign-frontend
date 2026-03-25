import React from 'react'

interface RecordItemProps {
  index:      number
  icon:       string
  iconBg:     string
  iconColor:  string
  title:      string
  sub:        string
  isEditing?: boolean
  onEdit:     () => void
  onDelete:   () => void
}

export default function RecordItem({
  index,
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  isEditing,
  onEdit,
  onDelete,
}: RecordItemProps) {
  return (
    <div className="rec-item">
      {/* index number */}
      <div className="font-inter text-[16px] font-bold text-navy min-w-[32px] text-center">
        {index}
      </div>

      {/* icon */}
      <div
        className="w-8 h-8 rounded-[7px] flex items-center justify-center text-[14px] flex-shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        <i className={icon} />
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-textMain flex items-center gap-1 flex-wrap">
          {title}
          {isEditing && (
            <span
              className="inline-flex items-center gap-1 ml-[10px] bg-saffron text-navy
                         text-[9px] font-bold px-2 py-[2px] rounded-[10px] tracking-[0.5px]"
            >
              <i className="ph ph-pencil-simple text-[9px]" />
              EDITING
            </span>
          )}
        </div>
        <div className="text-[9.5px] text-muted mt-[1px] truncate">{sub}</div>
      </div>

      {/* action buttons */}
      <div className="flex gap-[6px] ml-auto flex-shrink-0">
        <button
          onClick={onEdit}
          title="Edit"
          className="
            w-[30px] h-[30px] rounded-md flex items-center justify-center
            bg-navy-light text-navy border-none cursor-pointer text-[14px]
            transition-all duration-150 hover:bg-navy hover:text-white
          "
        >
          <i className="ph ph-pencil-simple" />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="
            w-[30px] h-[30px] rounded-md flex items-center justify-center
            bg-kampr-light text-kampr border-none cursor-pointer text-[14px]
            transition-all duration-150 hover:bg-kampr hover:text-white
          "
        >
          <i className="ph ph-trash" />
        </button>
      </div>
    </div>
  )
}
