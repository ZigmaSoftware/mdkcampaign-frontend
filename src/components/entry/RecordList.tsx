import React, { useState } from 'react'
import RecordItem from './RecordItem'
import type { RecordTag } from './RecordItem'
import ViewRecordModal, { entryDataToFields } from './ViewRecordModal'
import type { EntryRecord } from '../../types/entry.types'

const DEFAULT_PAGE_SIZE = 10

export interface FilterOption { value: string; label: string }
export interface FilterConfig { key: string; label: string; options: FilterOption[] }

interface RecordListProps {
  records:        EntryRecord[]
  editingId?:     string | null
  emptyMsg:       string
  icon:           string
  iconBg:         string
  iconColor:      string
  onEdit?:        (id: string) => void
  onDelete?:      (id: string) => void
  filterConfig?:  FilterConfig[]
  itemsPerPage?:  number
  serverTotal?:   number
  startIndex?:    number
  disableView?:   boolean
  getTag?:        (rec: EntryRecord) => RecordTag | undefined
}

export default function RecordList({
  records,
  editingId,
  emptyMsg,
  icon,
  iconBg,
  iconColor,
  onEdit,
  onDelete,
  filterConfig,
  itemsPerPage = DEFAULT_PAGE_SIZE,
  serverTotal,
  startIndex = 0,
  disableView = false,
  getTag,
}: RecordListProps) {
  const [page,       setPage]       = useState(1)
  const [filters,    setFilters]    = useState<Record<string, string>>({})
  const [viewingRec, setViewingRec] = useState<EntryRecord | null>(null)

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  // Apply dropdown filters on top of the (already search-filtered) records
  const visible = filterConfig?.length
    ? records.filter(rec =>
        filterConfig.every(fc => !filters[fc.key] || rec.data[fc.key] === filters[fc.key])
      )
    : records

  const totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage))
  const safePage   = Math.min(page, totalPages)
  const paged      = visible.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage)

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="mt-[14px]">
      {/* ── Filter bar ─────────────────────────────────── */}
      {filterConfig && filterConfig.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-border">
          <span className="text-[10px] font-bold text-muted uppercase tracking-[0.6px] mr-1">
            Filter:
          </span>
          {filterConfig.map(fc => (
            <select
              key={fc.key}
              value={filters[fc.key] || ''}
              onChange={e => handleFilterChange(fc.key, e.target.value)}
              className={`
                form-input text-[11px] py-[4px] pr-7 min-w-[110px] w-auto
                ${filters[fc.key] ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}
              `}
            >
              <option value="">All {fc.label}</option>
              {fc.options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilters({}); setPage(1) }}
              className="text-[10px] font-bold text-kampr hover:text-red-700 flex items-center gap-1 ml-1"
            >
              <i className="ph ph-x-circle" /> Clear
            </button>
          )}
          <span className="ml-auto text-[10px] text-muted">
            {(serverTotal ?? visible.length).toLocaleString('en-IN')} {(serverTotal ?? visible.length) === 1 ? 'record' : 'records'}
          </span>
        </div>
      )}

      {/* ── Record list ────────────────────────────────── */}
      {visible.length === 0 ? (
        <p className="text-muted text-[11px] text-center py-6 italic">
          {activeFilterCount > 0 ? 'No records match the selected filters.' : emptyMsg}
        </p>
      ) : (
        <>
          {paged.map((rec, i) => (
            <RecordItem
              key={rec.id}
              index={startIndex + (safePage - 1) * itemsPerPage + i + 1}
              icon={icon}
              iconBg={iconBg}
              iconColor={iconColor}
              title={rec.keyField}
              sub={rec.sub}
              isEditing={rec.id === editingId}
              tag={getTag?.(rec)}
              onView={disableView ? undefined : () => setViewingRec(rec)}
              onEdit={onEdit ? () => onEdit(rec.id) : undefined}
              onDelete={onDelete ? () => onDelete(rec.id) : undefined}
            />
          ))}

          {/* ── Pagination ─────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <span className="text-muted text-[10px]">
                {(safePage - 1) * itemsPerPage + 1}–{Math.min(safePage * itemsPerPage, visible.length)} of {visible.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all"
                >
                  <i className="ph ph-caret-double-left" />
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all"
                >
                  <i className="ph ph-caret-left" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`ell-${i}`} className="px-1 text-[10px] text-muted">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`px-2 py-1 text-[10px] font-bold rounded border transition-all ${
                          safePage === p
                            ? 'bg-navy border-navy text-white'
                            : 'border-border text-muted hover:border-saffron hover:text-navy'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all"
                >
                  <i className="ph ph-caret-right" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all"
                >
                  <i className="ph ph-caret-double-right" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── View modal ─────────────────────────────────── */}
      {viewingRec && (
        <ViewRecordModal
          title={viewingRec.keyField}
          subtitle={viewingRec.sub}
          fields={entryDataToFields(viewingRec.data)}
          onClose={() => setViewingRec(null)}
        />
      )}
    </div>
  )
}
