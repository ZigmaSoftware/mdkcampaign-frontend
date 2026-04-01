import { useState, useRef, useEffect } from 'react'

export interface SelectOption { value: string; label: string }

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '— Select —',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen]   = useState(false)
  const [query, setQuery]     = useState('')
  const containerRef          = useRef<HTMLDivElement>(null)
  const inputRef              = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const selected = options.find(o => o.value === value)
  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value)
    setIsOpen(false)
    setQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setIsOpen(prev => !prev) }}
        className={`
          form-input w-full text-left flex items-center justify-between min-h-[32px]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-saffron'}
        `}
      >
        <span className={`truncate text-[11px] ${selected ? 'text-navy' : 'text-muted'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 ml-2 shrink-0">
          {value && !disabled && (
            <span
              onMouseDown={handleClear}
              className="text-muted hover:text-kampr text-[10px] leading-none cursor-pointer"
            >
              <i className="ph ph-x" />
            </span>
          )}
          <i className={`ph ${isOpen ? 'ph-caret-up' : 'ph-caret-down'} text-muted text-[10px] leading-none`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-[2px] bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-[6px] border-b border-border bg-surface">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="form-input py-[4px] text-[11px] w-full"
              placeholder="Type to search..."
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <button
              type="button"
              onMouseDown={() => { onChange(''); setIsOpen(false); setQuery('') }}
              className="w-full text-left px-3 py-[7px] text-[11px] text-muted italic hover:bg-navy-light transition-colors border-b border-border"
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-muted text-center italic">No results found</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={() => handleSelect(opt)}
                  className={`
                    w-full text-left px-3 py-[7px] text-[11px] hover:bg-navy-light transition-colors
                    ${opt.value === value ? 'bg-saffron/10 text-navy font-semibold' : 'text-navy'}
                  `}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
