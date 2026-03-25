import type { EntryRecord } from '../types/entry.types'

export function printModule(records: EntryRecord[], moduleName: string): void {
  if (!records.length) return
  const rows = records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escHtml(r.keyField)}</td>
      <td>${escHtml(r.sub)}</td>
    </tr>`).join('')

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`
    <html>
    <head>
      <title>BJP – ${moduleName}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
        h2   { color: #0d2455; border-bottom: 2px solid #FF9933; padding-bottom: 6px; margin-bottom: 8px; }
        p    { font-size: 9px; color: #64748b; margin-bottom: 14px; }
        table{ width: 100%; border-collapse: collapse; }
        th   { background: #0d2455; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
        td   { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
        tr:nth-child(even) td { background: #f8faff; }
      </style>
    </head>
    <body>
      <h2>BJP Campaign · ${moduleName}</h2>
      <p>
        Constituency 100 · Modakkurichi · Mrs. Kirthika Shivkumar
        · CONFIDENTIAL · Printed: ${new Date().toLocaleString('en-IN')}
      </p>
      <table>
        <thead><tr><th>#</th><th>Record</th><th>Details</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>`)
  w.document.close()
  w.print()
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
