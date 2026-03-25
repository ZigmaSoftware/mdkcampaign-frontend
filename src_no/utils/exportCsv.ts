import type { EntryRecord } from '../types/entry.types'

export function exportRecordsToCsv(records: EntryRecord[], moduleName: string): void {
  if (!records.length) return
  const rows: string[][] = [['#', 'Record', 'Details', 'Created']]
  records.forEach((r, i) => {
    rows.push([String(i + 1), r.keyField, r.sub, r.createdAt])
  })
  const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  downloadCsv(csv, `BJP_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`)
}

export function exportReportCsv(): void {
  const rows = [
    ['Metric', 'Value'],
    ['Total Voters', '2,42,185'],
    ['Booth Coverage', '67.9%'],
    ['Favourable', '61.4%'],
    ['Strongly Favourable', '40.2%'],
    ['Undecided', '24.8%'],
    ['Opposition', '13.8%'],
    ['Surveys', '38,420'],
    ['Volunteers', '1,248'],
    ['Modakkurichi', '65%'],
    ['Sivagiri', '54%'],
    ['Erode City', '48%'],
  ]
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  downloadCsv(csv, `BJP_Report_${new Date().toISOString().slice(0, 10)}.csv`)
}

function downloadCsv(csv: string, filename: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
