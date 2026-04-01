import { useRef, useState, useEffect, useCallback } from 'react'
import apiClient from '../../utils/api'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { BeneficiaryRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Booth, Ward, Scheme, Union, Panchayat } from '../../hooks/useMasterAPI'
import EntryListHeader from '../../components/entry/EntryListHeader'
import BulkImportModal from '../../components/entry/BulkImportModal'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import RecordList from '../../components/entry/RecordList'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'
import { exportRecordsToCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'
import { useToast } from '../../context/ToastContext'
import { usePermissions } from '../../context/PermissionContext'
import type { EntryRecord } from '../../types/entry.types'

const FORM_ID = 'beneficiary-form'

const STATUS_MAP: Record<string, string> = {
  Pending: 'pending', Approved: 'approved', Received: 'received', Rejected: 'rejected',
}
const STATUS_REVERSE: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', received: 'Received', rejected: 'Rejected',
}

const GENDER_MAP: Record<string, string>    = { Male: 'm', Female: 'f', Other: 'o' }
const GENDER_REVERSE: Record<string, string> = { m: 'Male', f: 'Female', o: 'Other' }

const isValidPhone = (v: string) => v === '' || /^[6-9]\d{9}$/.test(v)

/* ── cached blocks (same pattern as VolunteerEntry) ─────────────── */
let _benBlocksCache: { id: number; name: string }[] | null = null
let _benBlocksFetch: Promise<{ id: number; name: string }[]> | null = null
function useBlocks() {
  const [blocks, setBlocks] = useState<{ id: number; name: string }[]>(_benBlocksCache ?? [])
  useEffect(() => {
    if (_benBlocksCache) { setBlocks(_benBlocksCache); return }
    if (!_benBlocksFetch) {
      _benBlocksFetch = apiClient.get('/masters/areas/', { params: { limit: 200 } })
        .then(r => { _benBlocksCache = r.data.results ?? []; return _benBlocksCache! })
        .catch(() => { _benBlocksFetch = null; return [] })
    }
    _benBlocksFetch.then(d => setBlocks(d))
  }, [])
  return blocks
}

export default function BeneficiaryEntry() {
  const api       = useEntryAPI()
  const masterApi = useMasterAPI()
  const { showToast } = useToast()
  const { canAdd, canEdit, canDelete } = usePermissions()

  const [beneficiaries, setBeneficiaries]   = useState<BeneficiaryRecord[]>([])
  const [totalCount,    setTotalCount]      = useState(0)
  const [page,          setPage]            = useState(1)
  const PAGE_SIZE = 10
  const [booths,        setBooths]          = useState<Booth[]>([])
  const [wards,         setWards]           = useState<Ward[]>([])
  const [unions,        setUnions]          = useState<Union[]>([])
  const [panchayats,    setPanchayats]      = useState<Panchayat[]>([])
  const [schemes,       setSchemes]         = useState<Scheme[]>([])
  const [editing,       setEditing]         = useState<BeneficiaryRecord | null>(null)
  const [isFormOpen,    setFormOpen]        = useState(false)
  const [showImport,    setShowImport]      = useState(false)
  const [search,        setSearch]          = useState('')
  const [blockFilter,   setBlockFilter]     = useState('')
  const [unionFilter,   setUnionFilter]     = useState('')
  const [panchayatFilter, setPanchayatFilter] = useState('')
  const [boothFilterLocal, setBoothFilterLocal] = useState<number | ''>('')
  const [wardFilter,    setWardFilter]       = useState<number | ''>('')
  const [isContacted,   setIsContacted]     = useState(false)

  const apiRef = useRef(api)
  apiRef.current = api

  const blocks = useBlocks()

  const loadBeneficiaries = useCallback((p: number, q?: string, boothId?: number, wardId?: number, blk?: string, uni?: string, pan?: string) => {
    apiRef.current.fetchBeneficiaries(
      boothId, q || undefined, wardId, p, PAGE_SIZE, blk || undefined, uni || undefined, pan || undefined
    ).then(d => { setBeneficiaries(d?.results ?? []); setTotalCount(d?.count ?? 0) })
  }, [PAGE_SIZE])

  useEffect(() => {
    loadBeneficiaries(1)
    masterApi.fetchBooths().then(d => d && setBooths(d))
    masterApi.fetchWards().then(d => d && setWards(d))
    masterApi.fetchUnions().then(d => d && setUnions(d))
    masterApi.fetchPanchayats().then(d => d && setPanchayats(d))
    masterApi.fetchSchemes().then(d => d && setSchemes(d))
  }, [loadBeneficiaries])

  const isFirstFilterRender = useRef(true)
  useEffect(() => {
    if (isFirstFilterRender.current) { isFirstFilterRender.current = false; return }
    const t = setTimeout(() => {
      setPage(1)
      loadBeneficiaries(1, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter)
    }, 400)
    return () => clearTimeout(t)
  }, [search, boothFilterLocal, wardFilter, blockFilter, unionFilter, panchayatFilter, loadBeneficiaries])

  const r = {
    name:           useRef<HTMLInputElement>(null),
    voter_id:       useRef<HTMLInputElement>(null),
    phone:          useRef<HTMLInputElement>(null),
    phone2:         useRef<HTMLInputElement>(null),
    age:            useRef<HTMLInputElement>(null),
    gender:         useRef<HTMLSelectElement>(null),
    address:        useRef<HTMLTextAreaElement>(null),
    pincode:        useRef<HTMLInputElement>(null),
    ward:           useRef<HTMLSelectElement>(null),
    booth:          useRef<HTMLSelectElement>(null),
    block:          useRef<HTMLSelectElement>(null),
    scheme:         useRef<HTMLSelectElement>(null),
    scheme_name:    useRef<HTMLInputElement>(null),
    benefit_type:   useRef<HTMLInputElement>(null),
    benefit_status: useRef<HTMLSelectElement>(null),
    benefit_amount: useRef<HTMLInputElement>(null),
    source:         useRef<HTMLSelectElement>(null),
    notes:          useRef<HTMLTextAreaElement>(null),
  }

  const clear = () => {
    Object.values(r).forEach(ref => { if (ref.current) ref.current.value = '' })
    if (r.benefit_status.current) r.benefit_status.current.value = 'Pending'
    setIsContacted(false)
  }

  const fillFromRecord = (v: BeneficiaryRecord) => {
    if (r.name.current)           r.name.current.value           = v.name           || ''
    if (r.voter_id.current)       r.voter_id.current.value       = v.voter_id        || ''
    if (r.phone.current)          r.phone.current.value          = v.phone           || ''
    if (r.phone2.current)         r.phone2.current.value         = v.phone2          || ''
    if (r.age.current)            r.age.current.value            = v.age != null ? String(v.age) : ''
    if (r.gender.current)         r.gender.current.value         = GENDER_REVERSE[v.gender || ''] || ''
    if (r.address.current)        r.address.current.value        = v.address         || ''
    if (r.pincode.current)        r.pincode.current.value        = v.pincode         || ''
    if (r.ward.current)           r.ward.current.value           = v.ward   ? String(v.ward)   : ''
    if (r.booth.current)          r.booth.current.value          = v.booth  ? String(v.booth)  : ''
    if (r.block.current)          r.block.current.value          = v.block           || ''
    if (r.scheme.current)         r.scheme.current.value         = v.scheme ? String(v.scheme) : ''
    if (r.scheme_name.current)    r.scheme_name.current.value    = v.scheme_name     || ''
    if (r.benefit_type.current)   r.benefit_type.current.value   = v.benefit_type    || ''
    if (r.benefit_status.current) r.benefit_status.current.value = STATUS_REVERSE[v.benefit_status || ''] || 'Pending'
    if (r.benefit_amount.current) r.benefit_amount.current.value = v.benefit_amount  || ''
    if (r.source.current)         r.source.current.value         = v.source          || ''
    if (r.notes.current)          r.notes.current.value          = v.notes           || ''
    setIsContacted(!!v.is_contacted)
  }

  const handleEdit = (id: string) => {
    const b = beneficiaries.find(v => String(v.id) === id)
    if (!b) return
    setEditing(b)
    fillFromRecord(b)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this beneficiary record?')) return
    const b = beneficiaries.find(v => String(v.id) === id)
    if (!b) return
    const ok = await api.deleteBeneficiary(b.id)
    if (ok) {
      showToast('<i class="ph ph-trash"></i> Beneficiary removed.', '#dc2626')
      loadBeneficiaries(page, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter)
    }
  }

  const handleSave = async () => {
    const name = r.name.current?.value.trim() || ''
    if (!name) {
      showToast('<i class="ph ph-warning"></i> Name is required!', '#dc2626')
      return
    }
    const phone = r.phone.current?.value || ''
    if (phone && !isValidPhone(phone)) {
      showToast('<i class="ph ph-warning"></i> Phone must be 10 digits starting with 6–9.', '#dc2626')
      return
    }
    const phone2 = r.phone2.current?.value || ''
    if (phone2 && !isValidPhone(phone2)) {
      showToast('<i class="ph ph-warning"></i> Alt phone must be 10 digits starting with 6–9.', '#dc2626')
      return
    }

    const wardId     = r.ward.current?.value   ? parseInt(r.ward.current.value)   : null
    const boothId    = r.booth.current?.value  ? parseInt(r.booth.current.value)  : null
    const schemeId   = r.scheme.current?.value ? parseInt(r.scheme.current.value) : null
    const statusVal  = STATUS_MAP[r.benefit_status.current?.value || 'Pending'] || 'pending'
    const genderVal  = GENDER_MAP[r.gender.current?.value || ''] || undefined
    const ageVal     = r.age.current?.value ? parseInt(r.age.current.value) : null

    const payload: Partial<BeneficiaryRecord> = {
      name,
      voter_id:       r.voter_id.current?.value       || undefined,
      phone:          phone                            || undefined,
      phone2:         phone2                           || undefined,
      age:            ageVal,
      gender:         genderVal,
      address:        r.address.current?.value         || undefined,
      pincode:        r.pincode.current?.value         || undefined,
      ward:           wardId,
      booth:          boothId,
      block:          r.block.current?.value           || undefined,
      scheme:         schemeId,
      scheme_name:    r.scheme_name.current?.value     || undefined,
      benefit_type:   r.benefit_type.current?.value    || undefined,
      benefit_status: statusVal,
      benefit_amount: r.benefit_amount.current?.value  || undefined,
      source:         r.source.current?.value          || undefined,
      is_contacted:   isContacted,
      notes:          r.notes.current?.value           || undefined,
    }

    if (editing) {
      const updated = await api.updateBeneficiary(editing.id, payload)
      if (updated) {
        showToast('<i class="ph ph-check-circle"></i> Beneficiary updated!', '#138808')
        setEditing(null); setFormOpen(false); clear()
        loadBeneficiaries(page, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter)
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update.', '#dc2626')
      }
    } else {
      const created = await api.createBeneficiary(payload)
      if (created) {
        showToast('<i class="ph ph-check-circle"></i> Beneficiary saved!', '#138808')
        setFormOpen(false); clear()
        setPage(1)
        loadBeneficiaries(1, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter)
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save.', '#dc2626')
      }
    }
  }

  const getBenName = (v: BeneficiaryRecord) => v.name || `Beneficiary #${v.id}`

  const mapBeneficiary = (v: BeneficiaryRecord): EntryRecord => {
    const schemeLabel  = v.scheme_display || v.scheme_name || ''
    const boothLabel   = v.booth ? booths.find(b => b.id === v.booth) : undefined
    const wardLabel    = v.ward  ? wards.find(w => w.id === v.ward)   : undefined
    const statusLabel  = STATUS_REVERSE[v.benefit_status || ''] || v.benefit_status || ''
    return {
      id:       String(v.id),
      keyField: [
        v.voter_id                       || '',
        getBenName(v),
        v.age != null ? `Age:${v.age}`  : '',
        v.phone  ? `Ph:${v.phone}`      : '',
        v.phone2 ? `Alt:${v.phone2}`    : '',
      ].filter(Boolean).join(' · '),
      sub: [
        boothLabel  ? `Booth ${boothLabel.number}` : '',
        v.panchayat_name || '',
        v.union_name     || '',
        v.block          || '',
        schemeLabel      ? `Scheme: ${schemeLabel}` : '',
        v.benefit_type   ? `Type: ${v.benefit_type}` : '',
        statusLabel,
      ].filter(Boolean).join(' · '),
      data: {
        name:           getBenName(v),
        voter_id:       v.voter_id        || '',
        phone:          v.phone           || '',
        phone2:         v.phone2          || '',
        age:            v.age != null ? String(v.age) : '',
        gender:         GENDER_REVERSE[v.gender || ''] || v.gender || '',
        block:          v.block           || '',
        panchayat_name: v.panchayat_name  || '',
        union_name:     v.union_name      || '',
        booth:          boothLabel ? `Booth ${boothLabel.number}` : '',
        ward:           wardLabel  ? wardLabel.name : (v.ward_name || ''),
        scheme:         schemeLabel,
        scheme_name:    v.scheme_name     || '',
        benefit_type:   v.benefit_type    || '',
        benefit_status: statusLabel,
        benefit_amount: v.benefit_amount  || '',
        source:         v.source          || '',
        is_contacted:   v.is_contacted    ? 'Yes' : '',
        address:        v.address         || '',
        pincode:        v.pincode         || '',
        notes:          v.notes           || '',
      },
      createdAt: v.created_at || '',
      backendId: v.id,
    }
  }

  const filteredUnions     = unions
  const filteredPanchayats = panchayats
  const filteredBooths     = booths
  const filteredWards      = wards

  const filtered   = beneficiaries.map<EntryRecord>(mapBeneficiary)
  const allRecords = filtered

  const checkCls = 'flex items-center gap-2 cursor-pointer select-none text-[11px] text-body font-medium'
  const checkBoxCls = 'w-4 h-4 rounded border-2 border-border cursor-pointer accent-navy'

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Beneficiary Info"
          icon="ph ph-hand-heart"
          count={totalCount}
          onAddNew={canAdd('beneficiary') ? () => { setEditing(null); clear(); setFormOpen(true) } : undefined}
          addLabel="Add Beneficiary"
          onImport={() => setShowImport(true)}
        />
        {showImport && (
          <BulkImportModal
            config={{
              title: 'Import Beneficiaries',
              uploadEndpoint: '/beneficiaries/beneficiaries/bulk-upload/',
              sampleColumns: ['name', 'voter_id', 'phone', 'phone2', 'booth_code', 'ward_code', 'block', 'scheme_name', 'benefit_type', 'benefit_status', 'benefit_amount', 'source'],
              sampleRow: {
                name: 'Rajesh Kumar', voter_id: 'ABC1234567', phone: '9876543210', phone2: '',
                booth_code: 'B001', ward_code: 'W001', block: 'Modakkurichi',
                scheme_name: 'PM Kisan', benefit_type: 'Cash Transfer',
                benefit_status: 'pending', benefit_amount: '6000', source: 'Government Camp',
              },
              columnNotes: {
                name: 'Full name (required)',
                voter_id: 'Voter ID / EPIC number',
                phone: '10-digit mobile',
                phone2: 'Alternate mobile',
                booth_code: 'Booth code from master',
                ward_code: 'Ward code from master',
                block: 'Block name (text)',
                scheme_name: 'Scheme name',
                benefit_type: 'Type of benefit (text)',
                benefit_status: 'pending / approved / received / rejected',
                benefit_amount: 'Amount (text)',
                source: 'How info was collected',
              },
              onSuccess: () => { setPage(1); loadBeneficiaries(1, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter) },
            }}
            onClose={() => setShowImport(false)}
          />
        )}
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search by name, voter ID, phone, scheme, benefit type…"
            value={search}
            onChange={setSearch}
            onExport={() => exportRecordsToCsv(allRecords, 'Beneficiaries')}
            onPrint={() => printModule(allRecords, 'Beneficiary Info')}
          />

          {/* Location filters: Block → Union → Panchayat → Booth (cascade) */}
          <div className="flex items-center gap-2 mb-2 mt-1 flex-wrap">
            <i className="ph ph-map-pin text-saffron text-[13px]" />

            <select
              value={blockFilter}
              onChange={e => setBlockFilter(e.target.value)}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[130px] w-auto ${blockFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Block</option>
              {blocks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>

            <select
              value={unionFilter}
              onChange={e => setUnionFilter(e.target.value)}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[150px] w-auto ${unionFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Union</option>
              {filteredUnions.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>

            <select
              value={panchayatFilter}
              onChange={e => setPanchayatFilter(e.target.value)}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[150px] w-auto ${panchayatFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Panchayat</option>
              {filteredPanchayats.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>

            <select
              value={boothFilterLocal}
              onChange={e => setBoothFilterLocal(e.target.value ? Number(e.target.value) : '')}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[180px] w-auto ${boothFilterLocal ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Booths</option>
              {filteredBooths.map(b => (
                <option key={b.id} value={b.id}>{b.number} — {b.name}</option>
              ))}
            </select>

            <select
              value={wardFilter}
              onChange={e => setWardFilter(e.target.value ? Number(e.target.value) : '')}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[130px] w-auto ${wardFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Wards</option>
              {filteredWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>

            {(blockFilter || unionFilter || panchayatFilter || boothFilterLocal || wardFilter) && (
              <button
                onClick={() => { setBlockFilter(''); setUnionFilter(''); setPanchayatFilter(''); setBoothFilterLocal(''); setWardFilter('') }}
                className="text-[10px] font-bold text-kampr flex items-center gap-1"
              >
                <i className="ph ph-x-circle" /> Clear Filters
              </button>
            )}
          </div>

          <RecordList
            records={filtered}
            editingId={editing ? String(editing.id) : null}
            emptyMsg='No beneficiary records yet. Click "Add Beneficiary" to begin.'
            icon="ph ph-hand-heart"
            iconBg="#fef3c7"
            iconColor="#b45309"
            onEdit={canEdit('beneficiary') ? handleEdit : undefined}
            onDelete={canDelete('beneficiary') ? handleDelete : undefined}
            itemsPerPage={PAGE_SIZE}
            serverTotal={totalCount}
            startIndex={(page - 1) * PAGE_SIZE}
            filterConfig={[
              { key: 'benefit_status', label: 'Status', options: [
                { value: 'Pending',  label: 'Pending' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Received', label: 'Received' },
                { value: 'Rejected', label: 'Rejected' },
              ]},
              { key: 'gender', label: 'Gender', options: [
                { value: 'Male',   label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other',  label: 'Other' },
              ]},
              { key: 'scheme', label: 'Scheme', options:
                [...new Set(beneficiaries.map(v => v.scheme_display || v.scheme_name).filter(Boolean))]
                  .sort().map(n => ({ value: n!, label: n! }))
              },
              { key: 'source', label: 'Source', options: [
                { value: 'Government Camp',    label: 'Government Camp' },
                { value: 'Door-to-door',       label: 'Door-to-door' },
                { value: 'Party Event',        label: 'Party Event' },
                { value: 'Personal Reference', label: 'Personal Reference' },
                { value: 'Other',              label: 'Other' },
              ]},
            ]}
          />
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-[11px] text-muted">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString('en-IN')}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => { const p = page - 1; setPage(p); loadBeneficiaries(p, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter) }}
                  className="text-[11px] font-bold px-3 py-1 rounded border border-border disabled:opacity-40 cursor-pointer"
                >← Prev</button>
                <span className="text-[11px] text-muted py-1">Page {page} / {Math.ceil(totalCount / PAGE_SIZE)}</span>
                <button
                  disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                  onClick={() => { const p = page + 1; setPage(p); loadBeneficiaries(p, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter) }}
                  className="text-[11px] font-bold px-3 py-1 rounded border border-border disabled:opacity-40 cursor-pointer"
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <EntryFormPanel
        id={FORM_ID}
        title="Beneficiary Info"
        icon="ph ph-hand-heart"
        isOpen={isFormOpen}
        isEditing={!!editing}
        onClose={() => { setFormOpen(false); setEditing(null); clear() }}
      >
        <FormRow cols={2}>
          <FormGroup label="Name" required>
            <input ref={r.name} className={inputCls} placeholder="Full name of beneficiary" />
          </FormGroup>
          <FormGroup label="Voter ID">
            <input ref={r.voter_id} className={inputCls} placeholder="e.g. ABC1234567" />
          </FormGroup>
        </FormRow>

        <FormRow cols={3}>
          <FormGroup label="Phone">
            <input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" />
          </FormGroup>
          <FormGroup label="Alt. Phone">
            <input ref={r.phone2} type="tel" className={inputCls} placeholder="Optional" />
          </FormGroup>
          <FormGroup label="Benefit Status">
            <select ref={r.benefit_status} className={selectCls}>
              <option>Pending</option>
              <option>Approved</option>
              <option>Received</option>
              <option>Rejected</option>
            </select>
          </FormGroup>
        </FormRow>

        <FormRow cols={3}>
          <FormGroup label="Age">
            <input ref={r.age} type="number" className={inputCls} placeholder="Age" min="1" />
          </FormGroup>
          <FormGroup label="Gender">
            <select ref={r.gender} className={selectCls}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </FormGroup>
          <FormGroup label="Block">
            <select ref={r.block} className={selectCls}>
              <option value="">Select Block</option>
              {blocks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>

        <FormRow cols={2}>
          <FormGroup label="Ward">
            <select ref={r.ward} className={selectCls}>
              <option value="">Select Ward</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Booth">
            <select ref={r.booth} className={selectCls}>
              <option value="">Select Booth</option>
              {booths.map(b => <option key={b.id} value={b.id}>{b.number} — {b.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>

        <FormRow cols={2}>
          <FormGroup label="Scheme">
            <select ref={r.scheme} className={selectCls}>
              <option value="">Select Scheme</option>
              {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Scheme Name (Free Text)">
            <input ref={r.scheme_name} className={inputCls} placeholder="e.g. PM Kisan, PMAY…" />
          </FormGroup>
        </FormRow>

        <FormRow cols={2}>
          <FormGroup label="Benefit Type">
            <input ref={r.benefit_type} className={inputCls} placeholder="e.g. Cash Transfer, Housing, Food…" />
          </FormGroup>
          <FormGroup label="Benefit Amount">
            <input ref={r.benefit_amount} className={inputCls} placeholder="e.g. ₹6000 / Year" />
          </FormGroup>
        </FormRow>

        <FormRow cols={2}>
          <FormGroup label="Source">
            <select ref={r.source} className={selectCls}>
              <option value="">Select</option>
              <option>Government Camp</option>
              <option>Door-to-door</option>
              <option>Party Event</option>
              <option>Personal Reference</option>
              <option>Other</option>
            </select>
          </FormGroup>
          <FormGroup label="Pincode">
            <input ref={r.pincode} className={inputCls} placeholder="6-digit pincode" maxLength={10} />
          </FormGroup>
        </FormRow>

        <FormRow cols={1}>
          <FormGroup label="Address">
            <textarea ref={r.address} className={textareaCls} placeholder="Full address…" rows={2} />
          </FormGroup>
        </FormRow>

        {/* Contacted flag */}
        <div className="mb-3 px-1">
          <label className={checkCls}>
            <input
              type="checkbox"
              className={checkBoxCls}
              checked={isContacted}
              onChange={e => setIsContacted(e.target.checked)}
            />
            Beneficiary Contacted
          </label>
        </div>

        <FormRow cols={1}>
          <FormGroup label="Notes">
            <textarea ref={r.notes} className={textareaCls} placeholder="Any notes about this beneficiary…" rows={2} />
          </FormGroup>
        </FormRow>

        <FormActions
          onSave={handleSave}
          onClear={clear}
          saveLabel={editing ? 'Update Beneficiary' : 'Save Beneficiary'}
          isEditing={!!editing}
        />
      </EntryFormPanel>
    </div>
  )
}
