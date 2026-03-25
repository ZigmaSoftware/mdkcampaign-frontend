import React from 'react'

interface EntrySearchToolbarProps {
  placeholder: string
  value:       string
  onChange:    (q: string) => void
  onExport?:   () => void
  onPrint?:    () => void
}

export default function EntrySearchToolbar({
  placeholder,
  value,
  onChange,
  onExport,
  onPrint,
}: EntrySearchToolbarProps) {
  return (
    <div className="flex items-center gap-[10px] mb-[14px] flex-wrap">
      <input
        type="text"
        className="form-input"
        style={{ width: 220 }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {onExport && (
        <button
          onClick={onExport}
          className="
            inline-flex items-center gap-[6px] px-[14px] py-[6px]
            bg-kampgreen-light text-kampgreen-dark border border-kampgreen/30
            rounded-md font-inter text-[10px] font-bold tracking-[0.8px] uppercase
            cursor-pointer hover:bg-kampgreen hover:text-white transition-all duration-150
          "
        >
          <i className="ph ph-file-csv text-[12px]" />
          Export CSV
        </button>
      )}
      {onPrint && (
        <button
          onClick={onPrint}
          className="
            inline-flex items-center gap-[6px] px-[14px] py-[6px]
            bg-navy-light text-navy border border-navy/20
            rounded-md font-inter text-[10px] font-bold tracking-[0.8px] uppercase
            cursor-pointer hover:bg-navy hover:text-white transition-all duration-150
          "
        >
          <i className="ph ph-printer text-[12px]" />
          Print
        </button>
      )}
    </div>
  )
}
