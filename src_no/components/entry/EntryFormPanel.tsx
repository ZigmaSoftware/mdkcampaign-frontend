import React from 'react'

interface EntryFormPanelProps {
  id:         string
  title:      string
  icon:       string
  isOpen:     boolean
  isEditing?: boolean
  onClose:    () => void
  children:   React.ReactNode
}

export default function EntryFormPanel({
  title,
  icon,
  isOpen,
  isEditing,
  onClose,
  children,
}: EntryFormPanelProps) {
  if (!isOpen) return null

  return (
    <div
      className="
        bg-surface rounded-card shadow-card2 overflow-hidden mb-[22px]
        border-t-[3px] border-t-saffron page-enter
      "
    >
      {/* form header */}
      <div className="bg-navy text-white px-[18px] py-3 flex items-center justify-between">
        <h3 className="font-inter text-[11px] font-extrabold tracking-[1px] uppercase flex items-center gap-2">
          <i className={icon} />
          {isEditing ? 'Edit' : 'Add /'} {title}
          {isEditing && (
            <span
              className="ml-2 bg-saffron text-navy text-[9px] font-bold
                         px-2 py-[2px] rounded-[10px] tracking-[0.5px]"
            >
              EDITING
            </span>
          )}
        </h3>
        <button
          onClick={onClose}
          className="
            flex items-center gap-1 bg-white/[0.12] border-none text-white
            rounded-md px-[10px] py-[5px] cursor-pointer text-[12px] font-bold
            hover:bg-white/[0.22] transition-all duration-150
          "
        >
          <i className="ph ph-x" /> Close
        </button>
      </div>

      {/* form body */}
      <div className="px-[18px] py-5 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
