import React, { useRef, useState } from 'react'
import apiClient from '../../utils/api'

// ── types ─────────────────────────────────────────────────────────────────────

export interface BulkImportConfig {
  title:          string            // e.g. "Import Voters"
  uploadEndpoint: string            // e.g. "/voters/voters/bulk-upload/"
  sampleColumns:  string[]          // header row
  sampleRow:      Record<string, string>  // one example data row
  columnNotes:    Record<string, string>  // format hints per column
  onSuccess?:     () => void
}

interface BulkResult {
  created: number
  skipped: number
  errors:  { row: number; reason: string }[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

function generateSampleCsv(config: BulkImportConfig): string {
  const header = config.sampleColumns
  const notes  = header.map(h => config.columnNotes[h] ?? '')
  const data   = header.map(h => config.sampleRow[h]   ?? '')
  const rows   = [header, notes, data]
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadCsv(csv: string, filename: string) {
  const a  = document.createElement('a')
  a.href   = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function parsePreviewCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines   = text.trim().split('\n')
  const headers = parseCsvLine(lines[0] ?? '')
  const rows    = lines.slice(1, 6).map(l => parseCsvLine(l))
  return { headers, rows }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cur.trim()); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur.trim())
  return result
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  config:   BulkImportConfig
  onClose:  () => void
}

type Step = 'idle' | 'preview' | 'uploading' | 'done'

export default function BulkImportModal({ config, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step,        setStep]        = useState<Step>('idle')
  const [fileName,    setFileName]    = useState('')
  const [preview,     setPreview]     = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [rowCount,    setRowCount]    = useState(0)
  const [file,        setFile]        = useState<File | null>(null)
  const [result,      setResult]      = useState<BulkResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // ── sample download ────────────────────────────────────────────────────────
  const handleDownloadSample = () => {
    const csv      = generateSampleCsv(config)
    const safeName = config.title.replace(/\s+/g, '_').toLowerCase()
    downloadCsv(csv, `${safeName}_sample.csv`)
  }

  // ── file selection ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setFileName(f.name)
    setResult(null)
    setUploadError(null)

    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const data = parsePreviewCsv(text)
      // count non-blank data rows (skip header + notes rows from sample)
      const allLines  = text.trim().split('\n')
      const dataLines = allLines.slice(1).filter(l => l.trim() && !l.startsWith('"Format:'))
      setRowCount(dataLines.length)
      setPreview(data)
      setStep('preview')
    }
    reader.readAsText(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) fileRef.current && (fileRef.current.files = e.dataTransfer.files)
    handleFileChange({ target: { files: e.dataTransfer.files } } as any)
  }

  // ── upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return
    setStep('uploading')
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await apiClient.post<BulkResult>(config.uploadEndpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,  // 5 minutes for large files
      })
      setResult(data)
      setStep('done')
      if (data.created > 0) config.onSuccess?.()
    } catch (err: any) {
      const msg = err?.response?.data?.detail
        || JSON.stringify(err?.response?.data)
        || 'Upload failed'
      setUploadError(String(msg))
      setStep('preview')
    }
  }

  const handleErrorDownload = () => {
    if (!result?.errors?.length) return
    const rows = [['Row', 'Reason'], ...result.errors.map(e => [String(e.row), e.reason])]
    const csv  = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadCsv(csv, `${config.title.replace(/\s+/g, '_')}_errors.csv`)
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* header */}
        <div className="bg-navy text-white px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="font-inter text-[13px] font-extrabold tracking-[1px] uppercase flex items-center gap-2">
            <i className="ph ph-upload-simple text-saffron" />
            {config.title}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">
            <i className="ph ph-x" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-5">

          {/* sample download */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-[12px] font-bold text-blue-800">Download Sample Sheet</p>
              <p className="text-[11px] text-blue-600 mt-0.5">
                CSV with correct headers, example row, and format notes
              </p>
            </div>
            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-md hover:bg-blue-700"
            >
              <i className="ph ph-file-csv" />
              Download
            </button>
          </div>

          {/* drop zone */}
          {step === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-navy hover:bg-navy/5 transition-colors"
            >
              <i className="ph ph-cloud-arrow-up text-4xl text-gray-400 block mb-2" />
              <p className="text-[13px] font-semibold text-gray-700">
                Click or drag a file here
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Supports .csv and .xlsx</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* preview */}
          {(step === 'preview' || step === 'uploading') && preview && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="ph ph-file-text text-navy" />
                  <span className="text-[12px] font-semibold text-gray-700">{fileName}</span>
                  <span className="bg-saffron text-navy text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {rowCount} rows
                  </span>
                </div>
                <button
                  onClick={() => { setStep('idle'); setFile(null); setFileName(''); setPreview(null) }}
                  className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <i className="ph ph-trash" /> Remove
                </button>
              </div>

              {/* preview table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="text-[10px] w-full">
                  <thead className="bg-navy text-white">
                    <tr>
                      {preview.headers.map((h, j) => (
                        <th key={j} className="px-3 py-2 text-left font-bold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {preview.headers.map((_, j) => (
                          <td key={j} className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                            {r[j] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.rows.length > 0 && (
                <p className="text-[10px] text-gray-400">Showing first {preview.rows.length} rows preview</p>
              )}

              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] px-4 py-2 rounded-lg">
                  <i className="ph ph-warning-circle mr-1" />
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* result */}
          {step === 'done' && result && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-extrabold text-green-700">{result.created}</p>
                  <p className="text-[11px] text-green-600 font-semibold mt-0.5">Created</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-extrabold text-yellow-700">{result.skipped}</p>
                  <p className="text-[11px] text-yellow-600 font-semibold mt-0.5">Already Existed</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-extrabold text-red-700">{result.errors.length}</p>
                  <p className="text-[11px] text-red-600 font-semibold mt-0.5">Failed</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-red-700">
                      <i className="ph ph-warning-circle mr-1" />
                      {result.errors.length} rows failed
                    </p>
                    <button
                      onClick={handleErrorDownload}
                      className="text-[10px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                    >
                      <i className="ph ph-download" />
                      Download Error Report
                    </button>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <p key={i} className="text-[10px] text-red-600">
                        Row {e.row}: {e.reason}
                      </p>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-[10px] text-red-400">
                        +{result.errors.length - 10} more — download error report
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => { setStep('idle'); setFile(null); setFileName(''); setPreview(null); setResult(null) }}
                className="text-[11px] text-navy underline text-center"
              >
                Import another file
              </button>
            </div>
          )}

        </div>

        {/* footer actions */}
        {(step === 'preview' || step === 'uploading') && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[11px] font-bold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={step === 'uploading'}
              className="flex items-center gap-2 px-5 py-2 bg-navy text-white text-[11px] font-extrabold uppercase tracking-wide rounded-lg hover:bg-navy/90 disabled:opacity-60"
            >
              {step === 'uploading' ? (
                <><i className="ph ph-spinner animate-spin" /> Uploading…</>
              ) : (
                <><i className="ph ph-upload-simple" /> Upload {rowCount} Rows</>
              )}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-navy text-white text-[11px] font-extrabold uppercase tracking-wide rounded-lg hover:bg-navy/90"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
