import React, { useEffect } from 'react'

interface ViewRecordModalProps {
  title:     string
  subtitle?: string
  fields:    Array<{ label: string; value: string }>
  onClose:   () => void
}

export default function ViewRecordModal({ title, subtitle, fields, onClose }: ViewRecordModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-card shadow-card w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-navy text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <i className="ph ph-eye text-saffron text-[14px]" />
            <div>
              <div className="text-[12px] font-bold leading-tight">{title}</div>
              {subtitle && (
                <div className="text-[9.5px] text-white/60 mt-[1px] leading-tight">{subtitle}</div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all text-[14px]"
          >
            <i className="ph ph-x" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4">
          {fields.length === 0 ? (
            <p className="text-muted text-[11px] text-center py-4 italic">No details available.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {fields.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-[2px]">
                  <span className="text-[9px] font-bold uppercase tracking-[0.6px] text-muted">
                    {label}
                  </span>
                  <span className="text-[12px] font-semibold text-textMain break-words">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 flex-shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-[6px] rounded-md bg-navy text-white text-[11px] font-bold hover:bg-navy/80 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/** Convert a ref-key or snake_case key to a readable label */
export function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/** Build field list from a Record<string,string>, skipping blank values */
export function entryDataToFields(data: Record<string, string>): Array<{ label: string; value: string }> {
  return Object.entries(data)
    .filter(([, v]) => v && v.trim() !== '')
    .map(([k, v]) => ({ label: formatFieldLabel(k), value: v }))
}
