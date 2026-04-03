import { useRef, useState, useEffect, useCallback } from 'react'
import apiClient from '../../utils/api'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { VolunteerRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Booth, Ward, VolunteerRole, VolunteerType, Panchayat, Union } from '../../hooks/useMasterAPI'
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
import { todayISO } from '../../utils/formatters'
import { useToast } from '../../context/ToastContext'
import { usePermissions } from '../../context/PermissionContext'
import type { EntryRecord } from '../../types/entry.types'

const FORM_ID = 'volunteer-form'

let _volBlocksCache: { id: number; name: string }[] | null = null
let _volBlocksFetch: Promise<{ id: number; name: string }[]> | null = null
function useBlocks() {
  const [blocks, setBlocks] = useState<{ id: number; name: string }[]>(_volBlocksCache ?? [])
  useEffect(() => {
    if (_volBlocksCache) { setBlocks(_volBlocksCache); return }
    if (!_volBlocksFetch) {
      _volBlocksFetch = apiClient.get('/masters/areas/', { params: { limit: 200 } })
        .then(r => { _volBlocksCache = r.data.results ?? []; return _volBlocksCache! })
        .catch(() => { _volBlocksFetch = null; return [] })
    }
    _volBlocksFetch.then(d => setBlocks(d))
  }, [])
  return blocks
}

const isValidPhone = (v: string) => v === '' || /^[6-9]\d{9}$/.test(v)

const STATUS_MAP: Record<string, string> = {
  Active: 'active', Inactive: 'inactive', Suspended: 'on_leave',
}
const STATUS_REVERSE: Record<string, string> = {
  active: 'Active', inactive: 'Inactive', on_leave: 'Suspended',
}

/* ── Searchable multi-select for booths ────────────────────────── */
function BoothMultiSelect({
  booths,
  selected,
  onChange,
}: {
  booths: Booth[]
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const containerRef          = useRef<HTMLDivElement>(null)

  const filtered = booths.filter(b =>
    `${b.number} ${b.name}`.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = useCallback((id: number) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }, [selected, onChange])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedBooths = booths.filter(b => selected.includes(b.id))

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        onClick={() => setOpen(v => !v)}
        className={`${inputCls} flex items-center justify-between gap-2 cursor-pointer min-h-[34px] flex-wrap`}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedBooths.length === 0 ? (
            <span className="text-muted text-[11px]">Select booths…</span>
          ) : (
            selectedBooths.map(b => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 bg-saffron/15 text-navy text-[10px] font-semibold px-[6px] py-[2px] rounded-full"
              >
                {b.number} — {b.name}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); toggle(b.id) }}
                  className="text-navy/50 hover:text-kampr leading-none"
                >
                  <i className="ph ph-x text-[9px]" />
                </button>
              </span>
            ))
          )}
        </div>
        <i className={`ph ${open ? 'ph-caret-up' : 'ph-caret-down'} text-muted text-[12px] flex-shrink-0`} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <i className="ph ph-magnifying-glass absolute left-2 top-1/2 -translate-y-1/2 text-muted text-[12px] pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search booth number or name…"
                className="w-full pl-7 pr-2 py-[5px] text-[11px] border border-border rounded focus:outline-none focus:border-saffron"
              />
            </div>
          </div>
          {/* List */}
          <div className="max-h-[200px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-muted text-[11px] text-center py-4 italic">No booths found.</p>
            ) : (
              filtered.map(b => {
                const checked = selected.includes(b.id)
                return (
                  <div
                    key={b.id}
                    onClick={() => toggle(b.id)}
                    className={`flex items-center gap-2 px-3 py-[7px] cursor-pointer text-[11px] transition-colors
                      ${checked ? 'bg-saffron/10 font-semibold text-navy' : 'hover:bg-[#f8fafc] text-textMain'}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${checked ? 'bg-saffron border-saffron' : 'border-border'}`}>
                      {checked && <i className="ph ph-check text-[9px] text-white font-bold" />}
                    </div>
                    <span>{b.number} — {b.name}</span>
                  </div>
                )
              })
            )}
          </div>
          {/* Footer */}
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-border bg-[#f7f9fc] flex items-center justify-between">
              <span className="text-[10px] text-muted">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-kampr hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function VolunteerEntry() {
  const api = useEntryAPI()
  const masterApi = useMasterAPI()
  const { showToast } = useToast()
  const { canAdd, canEdit, canDelete } = usePermissions()

  const [volunteers, setVolunteers]         = useState<VolunteerRecord[]>([])
  const [totalCount, setTotalCount]         = useState(0)
  const [page, setPage]                     = useState(1)
  const PAGE_SIZE = 10
  const [booths, setBooths]                 = useState<Booth[]>([])
  const [wards, setWards]                   = useState<Ward[]>([])
  const [unions, setUnions]                 = useState<Union[]>([])
  const [panchayats, setPanchayats]         = useState<Panchayat[]>([])
  const [volunteerRoles, setVolunteerRoles] = useState<VolunteerRole[]>([])
  const [volunteerTypes, setVolunteerTypes] = useState<VolunteerType[]>([])
  const [editing, setEditing]               = useState<VolunteerRecord | null>(null)
  const [isFormOpen, setFormOpen]           = useState(false)
  const [showImport, setShowImport]         = useState(false)
  const [search, setSearch]                 = useState('')
  const [blockFilter, setBlockFilter]           = useState('')
  const [unionFilter, setUnionFilter]           = useState('')
  const [panchayatFilter, setPanchayatFilter]   = useState('')
  const [boothFilterLocal, setBoothFilterLocal] = useState<number | ''>('')
  const [wardFilter, setWardFilter]             = useState<number | ''>('')
  const [selectedBoothIds, setSelectedBoothIds] = useState<number[]>([])
  const [ageGroupFilter, setAgeGroupFilter]       = useState('')
  const [voterIdStatusFilter, setVoterIdStatusFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [volunteerTypeFilter, setVolunteerTypeFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const ageGroupFilterRef = useRef('')
  const voterIdStatusFilterRef = useRef('')
  const statusFilterRef = useRef('')
  const roleFilterRef = useRef('')
  const volunteerTypeFilterRef = useRef('')
  const genderFilterRef = useRef('')
  const sourceFilterRef = useRef('')

  const apiRef = useRef(api)
  apiRef.current = api

  ageGroupFilterRef.current = ageGroupFilter
  voterIdStatusFilterRef.current = voterIdStatusFilter
  statusFilterRef.current = statusFilter
  roleFilterRef.current = roleFilter
  volunteerTypeFilterRef.current = volunteerTypeFilter
  genderFilterRef.current = genderFilter
  sourceFilterRef.current = sourceFilter

  const loadVolunteers = useCallback((p: number, q: string, boothId?: number, wardId?: number, blk?: string, uni?: string, pan?: string) => {
    apiRef.current.fetchVolunteers(
      boothId,
      q || undefined,
      wardId,
      p,
      PAGE_SIZE,
      blk || undefined,
      uni || undefined,
      pan || undefined,
      ageGroupFilterRef.current || undefined,
      voterIdStatusFilterRef.current || undefined,
      roleFilterRef.current || undefined,
      statusFilterRef.current || undefined,
      volunteerTypeFilterRef.current || undefined,
      genderFilterRef.current || undefined,
      sourceFilterRef.current || undefined,
    ).then(d => { setVolunteers(d?.results ?? []); setTotalCount(d?.count ?? 0) })
  }, [PAGE_SIZE])

  useEffect(() => {
    loadVolunteers(1, '')
    masterApi.fetchBooths().then(d => d && setBooths(d))
    masterApi.fetchWards().then(d => d && setWards(d))
    masterApi.fetchUnions().then(d => d && setUnions(d))
    masterApi.fetchPanchayats().then(d => d && setPanchayats(d))
    masterApi.fetchVolunteerRoles().then(d => d && setVolunteerRoles(d))
    masterApi.fetchVolunteerTypes().then(d => d && setVolunteerTypes(d))
  }, [loadVolunteers])

  const isFirstFilterRender = useRef(true)
  useEffect(() => {
    if (isFirstFilterRender.current) { isFirstFilterRender.current = false; return }
    const t = setTimeout(() => {
      setPage(1)
      loadVolunteers(1, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter)
    }, 400)
    return () => clearTimeout(t)
  }, [search, boothFilterLocal, wardFilter, blockFilter, unionFilter, panchayatFilter, ageGroupFilter, voterIdStatusFilter, statusFilter, roleFilter, volunteerTypeFilter, genderFilter, sourceFilter, loadVolunteers])

  const blocks = useBlocks()

  useEffect(() => {
    if (isFormOpen && editing) {
      fillFromRecord(editing)
    }
  }, [editing, isFormOpen, blocks])

  const r = {
    name:      useRef<HTMLInputElement>(null),
    voter_id:  useRef<HTMLInputElement>(null),
    block:     useRef<HTMLSelectElement>(null),
    phone:     useRef<HTMLInputElement>(null),
    phone2:    useRef<HTMLInputElement>(null),
    ward:      useRef<HTMLSelectElement>(null),
    panchayat: useRef<HTMLSelectElement>(null),
    role:      useRef<HTMLSelectElement>(null),
    status:  useRef<HTMLSelectElement>(null),
    age:     useRef<HTMLInputElement>(null),
    gender:  useRef<HTMLSelectElement>(null),
    joined:  useRef<HTMLInputElement>(null),
    source:         useRef<HTMLSelectElement>(null),
    skills:         useRef<HTMLInputElement>(null),
    volunteer_type: useRef<HTMLSelectElement>(null),
    notes:          useRef<HTMLTextAreaElement>(null),
  }

  const clear = () => {
    Object.values(r).forEach(ref => { if (ref.current) ref.current.value = '' })
    if (r.joined.current)    r.joined.current.value    = todayISO()
    if (r.status.current)    r.status.current.value    = 'Active'
    if (r.panchayat.current) r.panchayat.current.value = ''
    setSelectedBoothIds([])
  }

  const fillFromRecord = (v: VolunteerRecord) => {
    if (r.name.current)     r.name.current.value     = v.user_name || ''
    if (r.voter_id.current) r.voter_id.current.value = v.voter_id  || ''
    if (r.block.current)    r.block.current.value    = v.block      || ''
    if (r.ward.current)      r.ward.current.value      = v.ward      ? String(v.ward)      : ''
    if (r.panchayat.current) r.panchayat.current.value = v.panchayat ? String(v.panchayat) : ''
    // Restore multi-selected booths (prefer M2M list, fall back to primary FK)
    setSelectedBoothIds(v.booths?.length ? v.booths : v.booth ? [v.booth] : [])
    if (r.status.current) r.status.current.value = STATUS_REVERSE[v.status || ''] || 'Active'
    if (r.phone.current)  r.phone.current.value  = v.phone  || ''
    if (r.phone2.current) r.phone2.current.value = v.phone2 || ''
    if (r.role.current)   r.role.current.value   = v.role   || ''
    if (r.age.current)    r.age.current.value     = v.age    != null ? String(v.age) : ''
    if (r.gender.current) r.gender.current.value  = v.gender || ''
    if (r.joined.current) r.joined.current.value  = v.joined_date || ''
    if (r.source.current) r.source.current.value  = v.source  || ''
    if (r.skills.current)         r.skills.current.value         = v.skills         || ''
    if (r.volunteer_type.current) r.volunteer_type.current.value = v.volunteer_type || ''
    if (r.notes.current)          r.notes.current.value          = v.notes          || ''
  }

  const handleSave = async () => {
    const phone = r.phone.current?.value || ''
    if (phone && !isValidPhone(phone)) {
      showToast('<i class="ph ph-warning"></i> Phone must be 10 digits starting with 6–9.', '#dc2626')
      return
    }
    const wardId       = r.ward.current?.value      ? parseInt(r.ward.current.value)      : null
    const panchayatId  = r.panchayat.current?.value ? parseInt(r.panchayat.current.value) : null
    const statusVal = STATUS_MAP[r.status.current?.value || 'Active'] || 'active'
    const ageVal    = r.age.current?.value    ? parseInt(r.age.current.value)    : null
    const primaryBoothId = selectedBoothIds[0] ?? null

    const commonFields = {
      name:        r.name.current?.value     || '',
      voter_id:    r.voter_id.current?.value || '',
      phone:       phone,
      phone2:      r.phone2.current?.value  || '',
      block:       r.block.current?.value   || '',
      booth:       primaryBoothId,
      booths:      selectedBoothIds,
      ward:        wardId,
      panchayat:   panchayatId,
      status:      statusVal,
      role:        r.role.current?.value    || '',
      age:         ageVal,
      gender:      r.gender.current?.value  || '',
      joined_date: r.joined.current?.value  || null,
      source:         r.source.current?.value         || '',
      skills:         r.skills.current?.value         || '',
      volunteer_type: r.volunteer_type.current?.value || '',
      notes:          r.notes.current?.value          || '',
    }

    if (editing) {
      const updated = await api.updateVolunteer(editing.id, commonFields as any)
      if (updated) {
        setVolunteers(prev => prev.map(v => v.id === editing.id ? { ...v, ...updated } : v))
        showToast('<i class="ph ph-check-circle"></i> Volunteer updated!', '#138808')
        setEditing(null)
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update volunteer. Please check all required fields.', '#dc2626')
      }
    } else {
      const created = await api.createVolunteer({ ...commonFields } as any)
      if (created) {
        showToast('<i class="ph ph-check-circle"></i> Volunteer saved!', '#138808')
        setFormOpen(false)
        clear()
        setPage(1)
        loadVolunteers(1, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter)
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save volunteer. Please check all required fields.', '#dc2626')
      }
    }
  }

  const handleEdit = (id: string) => {
    const vol = volunteers.find(v => String(v.id) === id)
    if (!vol) return
    setEditing(vol)
    setFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this volunteer?')) return
    const vol = volunteers.find(v => String(v.id) === id)
    if (!vol) return
    const updated = await api.updateVolunteer(vol.id, { status: 'inactive' } as any)
    if (updated) {
      showToast('<i class="ph ph-trash"></i> Volunteer deactivated.', '#dc2626')
      loadVolunteers(page, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter)
    }
  }

  const getVolName = (v: VolunteerRecord) =>
    v.name || v.user_name?.trim() || v.username || `Volunteer #${v.id}`

  const mapVolunteer = (v: VolunteerRecord): EntryRecord => {
    const wardInfo  = wards.find(w => w.id === v.ward)
    const name = getVolName(v)
    // Use M2M booth_names if available, else fall back to primary FK booth
    const boothLabels = v.booth_names?.length
      ? v.booth_names.map(n => `Booth ${n}`)
      : v.booth ? [`Booth ${booths.find(b => b.id === v.booth)?.number ?? v.booth}`] : []
    return {
      id: String(v.id),
      keyField: [
        v.voter_id                    || '',
        name,
        v.age != null ? `Age:${v.age}` : '',
        v.phone  ? `Ph:${v.phone}`   : '',
        v.phone2 ? `Alt:${v.phone2}` : '',
      ].filter(Boolean).join(' · '),
      sub: [
        boothLabels.length ? boothLabels.join(', ') : '',
        v.panchayat_name || '',
        v.union_name     || '',
        v.block          || '',
        v.role           ? `Role: ${v.role}`                 : '',
        v.volunteer_type ? `Designation: ${v.volunteer_type}` : '',
        STATUS_REVERSE[v.status || ''] || v.status || 'Active',
      ].filter(Boolean).join(' · '),
      data: {
        name:           name,
        voter_id:       v.voter_id       || '',
        phone:          v.phone          || '',
        phone_2:        v.phone2         || '',
        block:          v.block          || '',
        panchayat_name: v.panchayat_name || '',
        union_name:     v.union_name     || '',
        booth:          boothLabels.join(', '),
        ward:           wardInfo  ? wardInfo.name : '',
        age:            v.age     != null ? String(v.age) : '',
        gender:         v.gender         || '',
        role:           v.role           || '',
        volunteer_type: v.volunteer_type || '',
        status:         STATUS_REVERSE[v.status || ''] || v.status || 'Active',
        joined_date:    v.joined_date    || '',
        source:         v.source         || '',
        skills:         v.skills         || '',
        notes:          v.notes          || '',
      },
      createdAt: v.created_at || '',
      backendId: v.id,
    }
  }

  const filteredUnions     = unions
  const filteredPanchayats = panchayats
  const filteredBooths     = booths
  const filteredWards      = wards

  const filtered = volunteers.map<EntryRecord>(mapVolunteer)
  const allVolunteerRecords = filtered
  const listFilters = {
    status: statusFilter,
    role: roleFilter,
    volunteer_type: volunteerTypeFilter,
    gender: genderFilter,
    source: sourceFilter,
  }

  const handleListFilterChange = useCallback((key: string, value: string) => {
    setPage(1)
    switch (key) {
      case 'status':
        setStatusFilter(value)
        break
      case 'role':
        setRoleFilter(value)
        break
      case 'volunteer_type':
        setVolunteerTypeFilter(value)
        break
      case 'gender':
        setGenderFilter(value)
        break
      case 'source':
        setSourceFilter(value)
        break
    }
  }, [])

  const clearListFilters = useCallback(() => {
    setPage(1)
    setStatusFilter('')
    setRoleFilter('')
    setVolunteerTypeFilter('')
    setGenderFilter('')
    setSourceFilter('')
  }, [])

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Volunteer Records"
          icon="ph ph-users-three"
          count={totalCount}
          onAddNew={canAdd('volunteer') ? () => { setEditing(null); clear(); setFormOpen(true) } : undefined}
          addLabel="Add Volunteer"
          onImport={() => setShowImport(true)}
        />
        {showImport && (
          <BulkImportModal
            config={{
              title: 'Import Volunteers',
              uploadEndpoint: '/volunteers/volunteers/bulk-upload/',
              sampleColumns: ['name', 'voter_id', 'phone', 'alt_phone', 'booth_code', 'ward_code', 'role', 'volunteer_type', 'status'],
              sampleRow: {
                name: 'Rajesh Kumar', voter_id: 'ABC1234567', phone: '9876543210', alt_phone: '',
                booth_code: '1, 2, 3', ward_code: 'W001',
                role: 'Booth Agent', volunteer_type: 'paid_volunteer', status: 'active',
              },
              columnNotes: {
                name: 'Full name of volunteer (required)',
                voter_id: 'Voter ID / EPIC number',
                phone: '10-digit mobile',
                alt_phone: 'Alternate mobile number',
                booth_code: 'Comma-separated booth codes e.g. "1, 2, 3" or "B001,B002"',
                ward_code: 'Ward code from master',
                role: 'Booth Agent / Street Captain / ...',
                volunteer_type: 'paid_volunteer / social_media_volunteer / alliance_volunteer',
                status: 'active / inactive / on_leave',
              },
              onSuccess: () => { setPage(1); loadVolunteers(1, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter) },
            }}
            onClose={() => setShowImport(false)}
          />
        )}
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search by name, voter ID, phone, role, panchayat, union, block…"
            value={search}
            onChange={setSearch}
            onExport={() => exportRecordsToCsv(allVolunteerRecords, 'Volunteers')}
            onPrint={() => printModule(allVolunteerRecords, 'Volunteers')}
          />
          {/* Location filters: Block / Union / Panchayat / Booth — all independent */}
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

            {/* Age Group filter */}
            <select
              value={ageGroupFilter}
              onChange={e => { setAgeGroupFilter(e.target.value); setPage(1) }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[130px] w-auto ${ageGroupFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Ages</option>
              <option value="Below 18">Below 18</option>
              <option value="18-25">18–25</option>
              <option value="26-35">26–35</option>
              <option value="36-45">36–45</option>
              <option value="46-60">46–60</option>
              <option value="60+">60+</option>
            </select>

            <select
              value={voterIdStatusFilter}
              onChange={e => { setVoterIdStatusFilter(e.target.value); setPage(1) }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[150px] w-auto ${voterIdStatusFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Voter IDs</option>
              <option value="with">With Voter ID</option>
              <option value="without">Without Voter ID</option>
            </select>

            {(blockFilter || unionFilter || panchayatFilter || boothFilterLocal || wardFilter || ageGroupFilter || voterIdStatusFilter) && (
              <button
                onClick={() => {
                  setBlockFilter('')
                  setUnionFilter('')
                  setPanchayatFilter('')
                  setBoothFilterLocal('')
                  setWardFilter('')
                  setAgeGroupFilter('')
                  setVoterIdStatusFilter('')
                }}
                className="text-[10px] font-bold text-kampr flex items-center gap-1"
              >
                <i className="ph ph-x-circle" /> Clear Filters
              </button>
            )}
          </div>
          <RecordList
            records={filtered}
            editingId={editing ? String(editing.id) : null}
            emptyMsg='No volunteer records yet.'
            icon="ph ph-users-three"
            iconBg="#dcfce7"
            iconColor="#0d6606"
            onEdit={canEdit('volunteer') ? handleEdit : undefined}
            onDelete={canDelete('volunteer') ? handleDelete : undefined}
            itemsPerPage={PAGE_SIZE}
            serverTotal={totalCount}
            startIndex={(page - 1) * PAGE_SIZE}
            filterValues={listFilters}
            onFilterChange={handleListFilterChange}
            onClearFilters={clearListFilters}
            filterConfig={[
              { key: 'status', label: 'Status', options: [
                { value: 'active',     label: 'Active' },
                { value: 'inactive',   label: 'Inactive' },
                { value: 'on_leave',   label: 'Suspended' },
              ]},
              { key: 'role', label: 'Role', options:
                volunteerRoles.map(r => ({ value: r.name, label: r.name }))
              },
              { key: 'volunteer_type', label: 'Type', options:
                volunteerTypes.map(t => ({ value: t.name, label: t.name }))
              },
              { key: 'gender', label: 'Gender', options: [
                { value: 'Male',   label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other',  label: 'Other' },
              ]},
              { key: 'source', label: 'Source', options: [
                { value: 'WhatsApp Drive',       label: 'WhatsApp Drive' },
                { value: 'Door-to-door',         label: 'Door-to-door' },
                { value: 'Party Event',          label: 'Party Event' },
                { value: 'Personal Reference',   label: 'Personal Reference' },
                { value: 'Social Media',         label: 'Social Media' },
                { value: 'NaMo App',             label: 'NaMo App' },
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
                  onClick={() => { const p = page - 1; setPage(p); loadVolunteers(p, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter) }}
                  className="text-[11px] font-bold px-3 py-1 rounded border border-border disabled:opacity-40 cursor-pointer"
                >← Prev</button>
                <span className="text-[11px] text-muted py-1">Page {page} / {Math.ceil(totalCount / PAGE_SIZE)}</span>
                <button
                  disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                  onClick={() => { const p = page + 1; setPage(p); loadVolunteers(p, search, boothFilterLocal || undefined, wardFilter || undefined, blockFilter, unionFilter, panchayatFilter) }}
                  className="text-[11px] font-bold px-3 py-1 rounded border border-border disabled:opacity-40 cursor-pointer"
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <EntryFormPanel
        id={FORM_ID}
        title="Volunteer"
        icon="ph ph-users-three"
        isOpen={isFormOpen}
        isEditing={!!editing}
        onClose={() => { setFormOpen(false); setEditing(null); clear() }}
      >
        <FormRow cols={2}>
          <FormGroup label="Name" required>
            <input ref={r.name} className={inputCls} placeholder="Volunteer full name" />
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
          <FormGroup label="Status">
            <select ref={r.status} className={selectCls}>
              <option>Active</option>
              <option>Inactive</option>
              <option>Suspended</option>
            </select>
          </FormGroup>
        </FormRow>

        <FormRow cols={4}>
          <FormGroup label="Block">
            <select ref={r.block} className={selectCls}>
              <option value="">Select Block</option>
              {blocks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Ward">
            <select ref={r.ward} className={selectCls}>
              <option value="">Select Ward</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Panchayat">
            <select ref={r.panchayat} className={selectCls}>
              <option value="">Select Panchayat</option>
              {panchayats.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Role">
            <select ref={r.role} className={selectCls}>
              <option value="">Select</option>
              {volunteerRoles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </FormGroup>
        </FormRow>

        {/* Multi-select Booths */}
        <div className="mb-3">
          <div className="text-[11px] font-semibold text-navy mb-1">
            Booths <span className="text-muted font-normal">(select one or more)</span>
          </div>
          <BoothMultiSelect
            booths={booths}
            selected={selectedBoothIds}
            onChange={setSelectedBoothIds}
          />
        </div>

        <FormRow cols={4}>
          <FormGroup label="Age">
            <input ref={r.age} type="number" className={inputCls} placeholder="Age" min="18" />
          </FormGroup>
          <FormGroup label="Gender">
            <select ref={r.gender} className={selectCls}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </FormGroup>
          <FormGroup label="Joined Date">
            <input ref={r.joined} type="date" className={inputCls} defaultValue={todayISO()} />
          </FormGroup>
          <FormGroup label="Source">
            <select ref={r.source} className={selectCls}>
              <option value="">Select</option>
              <option>WhatsApp Drive</option>
              <option>Door-to-door</option>
              <option>Party Event</option>
              <option>Personal Reference</option>
              <option>Social Media</option>
              <option>NaMo App</option>
            </select>
          </FormGroup>
        </FormRow>

        <FormRow cols={2}>
          <FormGroup label="Designation">
            <input ref={r.skills} className={inputCls} />
          </FormGroup>
          <FormGroup label="Volunteer Type">
            <select ref={r.volunteer_type} className={selectCls}>
              <option value="">Select</option>
              {volunteerTypes.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </FormGroup>
        </FormRow>

        <FormRow cols={1}>
          <FormGroup label="Notes">
            <textarea ref={r.notes} className={textareaCls} placeholder="Any notes about this volunteer..." />
          </FormGroup>
        </FormRow>

        <FormActions
          onSave={handleSave}
          onClear={clear}
          saveLabel={editing ? 'Update Volunteer' : 'Save Volunteer'}
          isEditing={!!editing}
        />
      </EntryFormPanel>
    </div>
  )
}
