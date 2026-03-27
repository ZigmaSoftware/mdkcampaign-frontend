import React, { useState } from 'react'
import Badge from '../ui/Badge'
import MasterRow from './MasterRow'
import ViewRecordModal from '../entry/ViewRecordModal'
import type { MasterRecord } from '../../types/master.types'

function exportMasterCsv(records: MasterRecord[], title: string) {
  if (!records.length) return
  const rows = [['#', 'Name', 'Details'], ...records.map((r, i) => [String(i + 1), r.key, r.meta || ''])]
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `BJP_${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

const PAGE_SIZE = 10

interface MasterListCardProps {
  title:     string
  icon:      string
  records:   MasterRecord[]
  onEdit:    (id: string, currentKey: string) => void
  onDelete:  (id: string) => void
  onImport?: () => void
}

export default function MasterListCard({
  title,
  icon,
  records,
  onEdit,
  onDelete,
  onImport,
}: MasterListCardProps) {
  const [page,       setPage]       = useState(1)
  const [search,     setSearch]     = useState('')
  const [viewingRec, setViewingRec] = useState<MasterRecord | null>(null)

  const visible    = search.trim()
    ? records.filter(r => r.key.toLowerCase().includes(search.toLowerCase()) || (r.meta || '').toLowerCase().includes(search.toLowerCase()))
    : records
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="bg-surface rounded-card shadow-card overflow-hidden">
      <div className="bg-navy text-white px-[18px] py-[11px] flex items-center justify-between">
        <h3 className="font-inter text-[11px] font-extrabold tracking-[1px] uppercase flex items-center gap-2">
          <i className={`${icon}`} />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <Badge label={search.trim() ? `${visible.length}/${records.length}` : String(records.length)} variant="s" />
          {onImport && (
            <button
              onClick={onImport}
              title="Import from CSV / Excel"
              className="flex items-center gap-1 px-2 py-[3px] rounded text-[9px] font-bold tracking-[0.6px] uppercase bg-white/10 hover:bg-white/20 text-white/80 border border-white/20 transition-all"
            >
              <i className="ph ph-upload-simple text-[12px]" />
              Import
            </button>
          )}
          {records.length > 0 && (
            <button
              onClick={() => exportMasterCsv(records, title)}
              title="Export all to Excel/CSV"
              className="flex items-center gap-1 px-2 py-[3px] rounded text-[9px] font-bold tracking-[0.6px] uppercase bg-white/10 hover:bg-saffron hover:text-navy text-white/80 transition-all"
            >
              <i className="ph ph-microsoft-excel-logo text-[12px]" />
              Export
            </button>
          )}
        </div>
      </div>
      <div className="px-[18px] py-[16px]">
        {records.length > 0 && (
          <div className="relative mb-3">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[13px] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search..."
              className="form-input pl-8 py-[5px] text-[11px] w-full"
            />
          </div>
        )}
        {visible.length === 0 ? (
          <p className="text-muted text-[11px] text-center py-6 italic">
            {search.trim() ? 'No records match your search.' : 'No entries yet.'}
          </p>
        ) : (
          <>
            {paged.map(rec => (
              <MasterRow
                key={rec.id}
                id={rec.id}
                label={rec.key}
                meta={rec.meta}
                onView={id => setViewingRec(records.find(r => r.id === id) ?? null)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-muted text-[10px]">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length}
                </span>
                <div className="flex items-center gap-1">
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
                        <span key={`ellipsis-${i}`} className="px-1 text-[10px] text-muted">…</span>
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
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── View modal ─────────────────────────────────── */}
      {viewingRec && (
        <ViewRecordModal
          title={viewingRec.key}
          subtitle={viewingRec.meta}
          fields={
            viewingRec.extra
              ? [
                  { label: 'Name', value: viewingRec.key },
                  ...Object.entries(viewingRec.extra)
                    .filter(([, v]) => v && v.trim() !== '')
                    .map(([k, v]) => ({ label: k, value: v })),
                ]
              : [
                  { label: 'Name', value: viewingRec.key },
                  ...(viewingRec.meta ? [{ label: 'Details', value: viewingRec.meta }] : []),
                ]
          }
          onClose={() => setViewingRec(null)}
        />
      )}
    </div>
  )
}
