import { useEffect, useMemo, useState } from 'react'

import Badge from '../../../components/ui/Badge'
import Card from '../../../components/ui/Card'
import type { BoothRankingRow } from '../services/dashboardApi'

interface BoothTableProps {
  rows: BoothRankingRow[]
}

type SortKey =
  | 'booth_number'
  | 'total_voters'
  | 'surveyed_voters'
  | 'coverage_pct'
  | 'positive_pct'
  | 'negative_pct'
  | 'followup_pct'
  | 'score'

type SortDirection = 'desc' | 'asc'

function pctClass(value: number) {
  if (value >= 70) return 'text-kampgreen'
  if (value >= 40) return 'text-saffron-dark'
  return 'text-kampr'
}

export default function BoothTable({ rows }: BoothTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null)

  useEffect(() => {
    setPage(1)
  }, [rows, pageSize, sortConfig])

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows

    const { key, direction } = sortConfig
    const multiplier = direction === 'desc' ? -1 : 1
    return [...rows].sort((left, right) => {
      const leftValue = left[key]
      const rightValue = right[key]

      if (typeof leftValue === 'string' || typeof rightValue === 'string') {
        return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        }) * multiplier
      }

      return ((Number(leftValue ?? 0) - Number(rightValue ?? 0)) * multiplier)
    })
  }, [rows, sortConfig])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const pagedRows = useMemo(
    () => sortedRows.slice((page - 1) * pageSize, page * pageSize),
    [sortedRows, page, pageSize],
  )

  const toggleSort = (key: SortKey) => {
    setSortConfig(current => {
      if (!current || current.key !== key) return { key, direction: 'desc' }
      return { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
    })
  }

  const renderSortableHeader = (label: string, key: SortKey, align: 'left' | 'right' = 'left') => {
    const isActive = sortConfig?.key === key
    const direction = isActive ? sortConfig?.direction : null
    const icon = !isActive
      ? 'ph-caret-up-down'
      : direction === 'desc'
        ? 'ph-sort-descending'
        : 'ph-sort-ascending'

    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`inline-flex w-full items-center gap-1.5 font-inherit uppercase tracking-wide ${align === 'right' ? 'justify-end' : 'justify-start'} hover:text-navy transition-colors`}
      >
        <span>{label}</span>
        <i className={`ph ${icon} text-[11px] ${isActive ? 'text-navy' : 'text-muted'}`} />
      </button>
    )
  }

  return (
    <Card
      title="Booth Ranking"
      icon="ph ph-map-pin-area"
      headerRight={<Badge label={`Top ${rows.length}`} variant="s" />}
      bodyClass="p-0"
      className="mb-0"
    >
      {rows.length === 0 ? (
        <div className="px-[18px] py-[18px] text-[11px] text-muted italic">
          No booth ranking data for the current filter scope.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-[11px]">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{renderSortableHeader('Booth', 'booth_number')}</th>
                  <th className="text-right">{renderSortableHeader('Voters', 'total_voters', 'right')}</th>
                  <th className="text-right">{renderSortableHeader('Surveyed', 'surveyed_voters', 'right')}</th>
                  <th className="text-right">{renderSortableHeader('Coverage', 'coverage_pct', 'right')}</th>
                  <th className="text-right">{renderSortableHeader('Positive', 'positive_pct', 'right')}</th>
                  <th className="text-right">{renderSortableHeader('Negative', 'negative_pct', 'right')}</th>
                  <th className="text-right">{renderSortableHeader('Follow-up', 'followup_pct', 'right')}</th>
                  <th className="text-right">{renderSortableHeader('Score', 'score', 'right')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-navy/10 text-navy font-bold">
                        {(page - 1) * pageSize + index + 1}
                      </span>
                    </td>
                    <td>
                      <div className="font-bold text-navy">{row.booth_number || '—'} {row.booth_name ? `· ${row.booth_name}` : ''}</div>
                      <div className="text-[10px] text-muted">{row.union || '—'} {row.block ? `· ${row.block}` : ''}</div>
                    </td>
                    <td className="text-right">{row.total_voters.toLocaleString('en-IN')}</td>
                    <td className="text-right">{row.surveyed_voters.toLocaleString('en-IN')}</td>
                    <td className={`text-right font-bold ${pctClass(row.coverage_pct)}`}>{row.coverage_pct}%</td>
                    <td className={`text-right font-bold ${pctClass(row.positive_pct)}`}>{row.positive_pct}%</td>
                    <td className={`text-right font-bold ${pctClass(row.negative_pct)}`}>{row.negative_pct}%</td>
                    <td className="text-right">{row.followup_pct}%</td>
                    <td className="text-right font-extrabold text-navy">{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-[18px] py-[12px]">
            <span className="text-[10px] text-muted">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={String(pageSize)}
                onChange={e => setPageSize(parseInt(e.target.value, 10))}
                className="form-input py-[4px] text-[10px] min-w-[88px]"
              >
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
              </select>
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-2 py-[4px] text-[10px] font-bold rounded border border-border text-muted disabled:opacity-40 hover:text-navy hover:border-saffron transition-all"
              >
                Prev
              </button>
              <span className="text-[10px] font-semibold text-navy">
                {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-2 py-[4px] text-[10px] font-bold rounded border border-border text-muted disabled:opacity-40 hover:text-navy hover:border-saffron transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
