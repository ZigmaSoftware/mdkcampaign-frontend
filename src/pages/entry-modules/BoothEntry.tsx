import React, { useRef, useState, useEffect } from 'react'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Booth, Ward, Panchayat } from '../../hooks/useMasterAPI'
import EntryListHeader from '../../components/entry/EntryListHeader'
import BulkImportModal from '../../components/entry/BulkImportModal'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'
import { useToast } from '../../context/ToastContext'
import type { EntryRecord } from '../../types/entry.types'
import RecordList from '../../components/entry/RecordList'
import { exportRecordsToCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'

const FORM_ID = 'booth-form'

const SENTIMENT_MAP: Record<string, string> = {
  'Favourable': 'positive',
  'Neutral':    'neutral',
  'Challenging': 'negative',
}
const SENTIMENT_REVERSE: Record<string, string> = {
  positive: 'Favourable',
  neutral:  'Neutral',
  negative: 'Challenging',
}
const STATUS_MAP: Record<string, string> = {
  'Assigned & Ready': 'assigned',
  'Pending':          'pending',
  'Working':          'working',
  'Completed':        'completed',
  'Issue Flagged':    'issue',
}
const STATUS_REVERSE: Record<string, string> = {
  assigned:  'Assigned & Ready',
  pending:   'Pending',
  working:   'Working',
  completed: 'Completed',
  issue:     'Issue Flagged',
}

interface VolunteerOption { id: number; user_name: string; phone: string }

export default function BoothEntry() {
  const api = useMasterAPI()
  const { showToast } = useToast()

  const [booths,     setBooths]     = useState<Booth[]>([])
  const [wards,      setWards]      = useState<Ward[]>([])
  const [panchayats, setPanchayats] = useState<Panchayat[]>([])
  const [wardFilter, setWardFilter] = useState('')
  const [volunteers, setVolunteers] = useState<VolunteerOption[]>([])
  const [editing, setEditing] = useState<Booth | null>(null)
  const [isFormOpen, setFormOpen] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')
  const pendingFill = useRef<Booth | null>(null)

  // Agent multiselect state
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([])
  const [agentDropOpen, setAgentDropOpen] = useState(false)
  const [agentSearch, setAgentSearch] = useState('')
  const agentDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.fetchBooths().then(d => d && setBooths(d))
    api.fetchWards().then(d => d && setWards(d))
    api.fetchPanchayats().then(d => d && setPanchayats(d))
    api.fetchVolunteerNames().then(d => d && setVolunteers(d))
  }, [])

  // Close agent dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (agentDropRef.current && !agentDropRef.current.contains(e.target as Node)) {
        setAgentDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fill refs after the panel mounts (refs are null while isOpen=false)
  useEffect(() => {
    if (isFormOpen && pendingFill.current) {
      fill(pendingFill.current)
      pendingFill.current = null
    }
  }, [isFormOpen])

  const r = {
    num:       useRef<HTMLInputElement>(null),
    name:      useRef<HTMLInputElement>(null),
    ward:      useRef<HTMLSelectElement>(null),
    panchayat: useRef<HTMLSelectElement>(null),
    address:   useRef<HTMLInputElement>(null),
    voters:    useRef<HTMLInputElement>(null),
    male:      useRef<HTMLInputElement>(null),
    female:    useRef<HTMLInputElement>(null),
    agentph:   useRef<HTMLInputElement>(null),
    status:    useRef<HTMLSelectElement>(null),
    sentiment: useRef<HTMLSelectElement>(null),
    notes:     useRef<HTMLTextAreaElement>(null),
  }

  const fill = (booth: Booth) => {
    if (r.num.current)       r.num.current.value       = booth.number
    if (r.name.current)      r.name.current.value      = booth.name
    if (r.ward.current)      r.ward.current.value      = String(booth.ward)
    if (r.panchayat.current) r.panchayat.current.value = booth.panchayat ? String(booth.panchayat) : ''
    if (r.address.current)   r.address.current.value   = booth.address || ''
    setWardFilter(String(booth.ward))
    if (r.voters.current)    r.voters.current.value    = String(booth.total_voters || '')
    if (r.male.current)      r.male.current.value      = String(booth.male_voters || '')
    if (r.female.current)    r.female.current.value    = String(booth.female_voters || '')
    setSelectedAgentIds(booth.agent_ids || [])
    if (r.notes.current)     r.notes.current.value     = booth.notes || ''
    if (r.status.current)    r.status.current.value    = STATUS_REVERSE[booth.status || ''] || ''
    if (r.sentiment.current) r.sentiment.current.value = SENTIMENT_REVERSE[booth.sentiment || ''] || ''
  }

  const clear = () => {
    Object.values(r).forEach(ref => { if (ref.current) ref.current.value = '' })
    setSelectedAgentIds([])
    setAgentSearch('')
    setWardFilter('')
  }

  const handleSave = async () => {
    const num  = r.num.current?.value.trim() ?? ''
    const name = r.name.current?.value.trim() ?? ''
    if (!num) { showToast('<i class="ph ph-warning"></i> Booth number is required!', '#dc2626'); return }

    const wardId      = r.ward.current?.value      ? parseInt(r.ward.current.value)      : undefined
    const panchayatId = r.panchayat.current?.value ? parseInt(r.panchayat.current.value) : null
    // Derive village text from selected ward name (keeps booth.village in sync with booth.ward)
    const selectedWard = wards.find(w => w.id === wardId)
    const payload: Partial<Booth> = {
      number: num,
      name: name || `Booth ${num}`,
      total_voters: r.voters.current?.value ? parseInt(r.voters.current.value) : 0,
      male_voters:  r.male.current?.value   ? parseInt(r.male.current.value)   : undefined,
      female_voters: r.female.current?.value ? parseInt(r.female.current.value) : undefined,
      address:   r.address.current?.value  || undefined,
      village:   selectedWard?.name        || undefined,
      panchayat: panchayatId,
      notes:     r.notes.current?.value    || undefined,
      sentiment: SENTIMENT_MAP[r.sentiment.current?.value || ''] || undefined,
      status:    STATUS_MAP[r.status.current?.value || ''] || undefined,
      agent_ids: selectedAgentIds.length ? selectedAgentIds : undefined,
    }

    if (editing) {
      const updated = await api.updateBooth(editing.id, { ...payload, ...(wardId ? { ward: wardId } : {}) })
      if (updated) {
        setBooths(prev => prev.map(b => b.id === editing.id ? { ...b, ...updated } : b))
        showToast('<i class="ph ph-check-circle"></i> Booth updated!', '#138808')
        setEditing(null)
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update booth. Please check all required fields.', '#dc2626')
      }
    } else {
      const created = await api.createBooth({
        ...payload, ...(wardId ? { ward: wardId } : {}), code: `B${String(Date.now() % 10000).padStart(4, '0')}`,
      })
      if (created) {
        setBooths(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Booth saved!', '#138808')
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save booth. Please check all required fields.', '#dc2626')
      }
    }
  }

  const handleEdit = (id: string) => {
    const booth = booths.find(b => String(b.id) === id)
    if (!booth) return
    pendingFill.current = booth
    setEditing(booth)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    const booth = booths.find(b => String(b.id) === id)
    if (!booth || !window.confirm('Delete this booth?')) return
    const ok = await api.deleteBooth(booth.id)
    if (ok) {
      setBooths(prev => prev.filter(b => b.id !== booth.id))
      showToast('<i class="ph ph-trash"></i> Booth deleted.', '#dc2626')
    }
  }

  const mapBooth = (b: Booth): EntryRecord => ({
    id: String(b.id),
    keyField: `Booth ${b.number}${b.name !== `Booth ${b.number}` ? ' – ' + b.name : ''}`,
    sub: `${b.ward_name || '—'} · ${b.total_voters} voters · ${b.sentiment || ''} · ${b.status || ''}`.replace(/ · $/, ''),
    data: {
      booth_number:   b.number,
      booth_name:     b.name,
      ward:           b.ward_name           || '',
      constituency:   b.constituency_name   || '',
      address:        b.address             || '',
      total_voters:   String(b.total_voters || 0),
      male_voters:    b.male_voters    != null ? String(b.male_voters)   : '',
      female_voters:  b.female_voters  != null ? String(b.female_voters) : '',
      status:         b.status              || '',
      sentiment:      b.sentiment           || '',
      primary_agent:  b.agent_name          || '',
      notes:          b.notes               || '',
    },
    createdAt: '',
    backendId: b.id,
  })

  const filtered = booths
    .filter(b => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return b.number.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || (b.ward_name || '').toLowerCase().includes(q)
    })
    .map<EntryRecord>(mapBooth)

  const allBoothRecords = booths.map<EntryRecord>(mapBooth)

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Booth Records"
          icon="ph ph-map-pin"
          count={booths.length}
          onAddNew={() => { setEditing(null); clear(); setFormOpen(true) }}
          addLabel="Add Booth"
          onImport={() => setShowImport(true)}
        />
        {showImport && (
          <BulkImportModal
            config={{
              title: 'Import Booths',
              uploadEndpoint: '/masters/booths/bulk-upload/',
              sampleColumns: ['code', 'number', 'name', 'ward_code', 'address', 'village', 'total_voters', 'male_voters', 'female_voters', 'status', 'sentiment'],
              sampleRow: {
                code: 'B001', number: '1', name: 'Primary School Booth',
                ward_code: 'W001', address: 'Main Road, Erode',
                village: 'Erode Town', total_voters: '500',
                male_voters: '250', female_voters: '250',
                status: 'pending', sentiment: 'neutral',
              },
              columnNotes: {
                code: 'Unique booth code (required)',
                number: 'Booth number',
                name: 'Booth name / location',
                ward_code: 'Ward code from master',
                address: 'Full address',
                village: 'Village or locality name',
                total_voters: 'Total registered voters',
                male_voters: 'Male voter count',
                female_voters: 'Female voter count',
                status: 'pending / assigned / working / completed / issue',
                sentiment: 'positive / neutral / negative',
              },
              onSuccess: () => { api.fetchBooths().then(d => d && setBooths(d)) },
            }}
            onClose={() => setShowImport(false)}
          />
        )}
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search booths..."
            value={search}
            onChange={setSearch}
            onExport={() => exportRecordsToCsv(allBoothRecords, 'Booth_Info')}
            onPrint={() => printModule(allBoothRecords, 'Booth Info')}
          />
          <RecordList
            records={filtered}
            editingId={editing ? String(editing.id) : null}
            emptyMsg='No booth records yet. Click "Add Booth" to begin.'
            icon="ph ph-map-pin"
            iconBg="#dbeafe"
            iconColor="#0d2455"
            onEdit={handleEdit}
            onDelete={handleDelete}
            filterConfig={[
              { key: 'ward_name', label: 'Ward', options: [...new Set(booths.map(b => b.ward_name || '').filter(Boolean))].map(w => ({ value: w, label: w })) },
              { key: 'status',    label: 'Status', options: [
                { value: 'assigned',  label: 'Assigned & Ready' },
                { value: 'pending',   label: 'Pending' },
                { value: 'working',   label: 'Working' },
                { value: 'completed', label: 'Completed' },
                { value: 'issue',     label: 'Issue Flagged' },
              ]},
              { key: 'sentiment', label: 'Sentiment', options: [
                { value: 'positive', label: 'Favourable' },
                { value: 'neutral',  label: 'Neutral' },
                { value: 'negative', label: 'Challenging' },
              ]},
            ]}
          />
        </div>
      </div>

      <EntryFormPanel
        id={FORM_ID}
        title="Booth Info"
        icon="ph ph-map-pin"
        isOpen={isFormOpen}
        isEditing={!!editing}
        onClose={() => { setFormOpen(false); setEditing(null); clear() }}
      >
        <FormRow cols={2}>
          <FormGroup label="Booth No." required>
            <input ref={r.num} className={inputCls} placeholder="001" />
          </FormGroup>
          <FormGroup label="Booth Name / Location">
            <input ref={r.name} className={inputCls} placeholder="School name or landmark" />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Ward" required>
            <select ref={r.ward} className={selectCls} onChange={e => {
              setWardFilter(e.target.value)
              if (r.panchayat.current) r.panchayat.current.value = ''
            }}>
              <option value="">Select Ward</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Panchayat">
            <select ref={r.panchayat} className={selectCls}>
              <option value="">Select Panchayat</option>
              {(wardFilter
                ? panchayats.filter(p => String(p.ward) === wardFilter)
                : panchayats
              ).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Address">
            <input ref={r.address} className={inputCls} placeholder="Full address" />
          </FormGroup>
          <FormGroup label="Total Voters">
            <input ref={r.voters} type="number" className={inputCls} placeholder="Count" />
          </FormGroup>
          <FormGroup label="Male Voters">
            <input ref={r.male} type="number" className={inputCls} placeholder="Count" />
          </FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Female Voters">
            <input ref={r.female} type="number" className={inputCls} placeholder="Count" />
          </FormGroup>
          <FormGroup label="Booth Agent Name">
            <div className="relative" ref={agentDropRef}>
              <button
                type="button"
                onClick={() => setAgentDropOpen(o => !o)}
                className={`${inputCls} w-full text-left flex justify-between items-center`}
              >
                <span className={selectedAgentIds.length ? 'text-inherit' : 'text-[#9ca3af]'}>
                  {selectedAgentIds.length
                    ? volunteers.filter(v => selectedAgentIds.includes(v.id)).map(v => v.user_name).join(', ')
                    : 'Select agents'}
                </span>
                <i className="ph ph-caret-down text-xs ml-1 shrink-0" />
              </button>
              {agentDropOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e7eb] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 border-b border-[#e5e7eb]">
                    <input
                      className={inputCls}
                      placeholder="Search volunteers..."
                      value={agentSearch}
                      onChange={e => setAgentSearch(e.target.value)}
                    />
                  </div>
                  {volunteers
                    .filter(v => v.user_name.toLowerCase().includes(agentSearch.toLowerCase()))
                    .map(v => (
                      <label key={v.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#f3f4f6] cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.includes(v.id)}
                          onChange={() => setSelectedAgentIds(prev =>
                            prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                          )}
                          className="accent-[#0d2455]"
                        />
                        <span className="flex-1">{v.user_name}</span>
                        {v.phone && <span className="text-[#9ca3af] text-xs">{v.phone}</span>}
                      </label>
                    ))}
                  {volunteers.filter(v => v.user_name.toLowerCase().includes(agentSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-sm text-[#9ca3af]">No volunteers found</div>
                  )}
                </div>
              )}
            </div>
          </FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Agent Phone">
            <input ref={r.agentph} type="tel" className={inputCls} placeholder="9XXXXXXXXX" />
          </FormGroup>
          <FormGroup label="Agent Status">
            <select ref={r.status} className={selectCls}>
              <option value="">Select</option>
              <option>Assigned &amp; Ready</option>
              <option>Pending</option>
              <option>Working</option>
              <option>Completed</option>
              <option>Issue Flagged</option>
            </select>
          </FormGroup>
          <FormGroup label="Booth Sentiment">
            <select ref={r.sentiment} className={selectCls}>
              <option value="">Select</option>
              <option>Favourable</option>
              <option>Neutral</option>
              <option>Challenging</option>
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Notes">
            <textarea ref={r.notes} className={textareaCls} placeholder="Any notes about this booth..." />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={clear}
          saveLabel="Save Booth"
          isEditing={!!editing}
        />
      </EntryFormPanel>
    </div>
  )
}
