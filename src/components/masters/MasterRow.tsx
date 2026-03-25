import React from 'react'

interface MasterRowProps {
  id:        string
  label:     string
  meta?:     string
  onEdit:    (id: string, currentKey: string) => void
  onDelete:  (id: string) => void
}

export default function MasterRow({ id, label, meta, onEdit, onDelete }: MasterRowProps) {
  return (
    <div className="master-row">
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-bold text-textMain">{label}</span>
        {meta && (
          <span className="ml-2 text-[9.5px] text-muted">{meta}</span>
        )}
      </div>
      <div className="flex gap-[6px] flex-shrink-0">
        <button
          onClick={() => onEdit(id, label)}
          title="Edit"
          className="
            w-[28px] h-[28px] rounded-md flex items-center justify-center
            bg-navy-light text-navy border-none cursor-pointer text-[13px]
            hover:bg-navy hover:text-white transition-all duration-150
          "
        >
          <i className="ph ph-pencil-simple" />
        </button>
        <button
          onClick={() => onDelete(id)}
          title="Delete"
          className="
            w-[28px] h-[28px] rounded-md flex items-center justify-center
            bg-kampr-light text-kampr border-none cursor-pointer text-[13px]
            hover:bg-kampr hover:text-white transition-all duration-150
          "
        >
          <i className="ph ph-trash" />
        </button>
      </div>
    </div>
  )
}
