import { useRef, useState, useEffect } from 'react'
import apiClient from '../../utils/api'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { VolunteerRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Booth, Ward } from '../../hooks/useMasterAPI'
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

export default function VolunteerEntry() {
  const api = useEntryAPI()
  const masterApi = useMasterAPI()
  const { showToast } = useToast()

  const [volunteers, setVolunteers]         = useState<VolunteerRecord[]>([])
  const [booths, setBooths]                 = useState<Booth[]>([])
  const [wards, setWards]                   = useState<Ward[]>([])
  const [editing, setEditing]               = useState<VolunteerRecord | null>(null)
  const [isFormOpen, setFormOpen]           = useState(false)
  const [showImport, setShowImport]         = useState(false)
  const [search, setSearch]                 = useState('')
  const [boothFilter, setBoothFilter]       = useState<number | undefined>(undefined)
  const [selectedBoothIds, setSelectedBoothIds] = useState<number[]>([])

  useEffect(() => {
    masterApi.fetchBooths().then(d => d && setBooths(d))
    masterApi.fetchWards().then(d => d && setWards(d))
  }, [])

  useEffect(() => {
    api.fetchVolunteers(boothFilter).then(d => d && setVolunteers(d))
  }, [boothFilter])

  const blocks = useBlocks()

  useEffect(() => {
    if (isFormOpen && editing) {
      fillFromRecord(editing)
    }
  }, [editing, isFormOpen, blocks])

  const r = {
    name:    useRef<HTMLInputElement>(null),
    block:   useRef<HTMLSelectElement>(null),
    phone:   useRef<HTMLInputElement>(null),
    phone2:  useRef<HTMLInputElement>(null),
    ward:    useRef<HTMLSelectElement>(null),
    role:    useRef<HTMLSelectElement>(null),
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
    if (r.joined.current) r.joined.current.value = todayISO()
    if (r.status.current) r.status.current.value = 'Active'
    setSelectedBoothIds([])
  }

  const fillFromRecord = (v: VolunteerRecord) => {
    if (r.name.current)   r.name.current.value   = v.user_name || ''
    if (r.block.current)  r.block.current.value  = v.block  || ''
    if (r.ward.current)   r.ward.current.value   = v.ward  ? String(v.ward)   : ''
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
    const wardId    = r.ward.current?.value   ? parseInt(r.ward.current.value)   : null
    const statusVal = STATUS_MAP[r.status.current?.value || 'Active'] || 'active'
    const ageVal    = r.age.current?.value    ? parseInt(r.age.current.value)    : null
    const primaryBoothId = selectedBoothIds[0] ?? null

    const commonFields = {
      name:        r.name.current?.value    || '',
      phone:       phone,
      phone2:      r.phone2.current?.value  || '',
      block:       r.block.current?.value   || '',
      booth:       primaryBoothId,
      booths:      selectedBoothIds,
      ward:        wardId,
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
        setVolunteers(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Volunteer saved!', '#138808')
        setFormOpen(false)
        clear()
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
      setVolunteers(prev => prev.filter(v => v.id !== vol.id))
      showToast('<i class="ph ph-trash"></i> Volunteer deactivated.', '#dc2626')
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
      keyField: name,
      sub: [
        boothLabels.length ? boothLabels.join(', ') : null,
        wardInfo  ? wardInfo.name : null,
        STATUS_REVERSE[v.status || ''] || v.status || 'Active',
      ].filter(Boolean).join(' · '),
      data: {
        phone:          v.phone          || '',
        phone2:         v.phone2         || '',
        block:          v.block          || '',
        booth:          boothLabels.join(', '),
        ward:           wardInfo  ? wardInfo.name : '',
        age:            v.age     != null ? String(v.age) : '',
        gender:         v.gender         || '',
        joined_date:    v.joined_date    || '',
        source:         v.source         || '',
        skills:         v.skills         || '',
        volunteer_type: v.volunteer_type || '',
        role:           v.role           || '',
        status:         v.status         || '',
        notes:          v.notes          || '',
      },
      createdAt: v.created_at || '',
      backendId: v.id,
    }
  }

  const filtered = volunteers
    .filter(v => {
      if (!search.trim()) return true
      return getVolName(v).toLowerCase().includes(search.toLowerCase())
    })
    .map<EntryRecord>(mapVolunteer)

  const allVolunteerRecords = volunteers.map<EntryRecord>(mapVolunteer)

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Volunteer Records"
          icon="ph ph-users-three"
          count={volunteers.length}
          onAddNew={() => { setEditing(null); clear(); setFormOpen(true) }}
          addLabel="Add Volunteer"
          onImport={() => setShowImport(true)}
        />
        {showImport && (
          <BulkImportModal
            config={{
              title: 'Import Volunteers',
              uploadEndpoint: '/volunteers/volunteers/bulk-upload/',
              sampleColumns: ['name', 'phone', 'alt_phone', 'booth_code', 'ward_code', 'role', 'volunteer_type', 'status'],
              sampleRow: {
                name: 'Rajesh Kumar', phone: '9876543210', alt_phone: '',
                booth_code: '1, 2, 3', ward_code: 'W001',
                role: 'Booth Agent', volunteer_type: 'paid_volunteer', status: 'active',
              },
              columnNotes: {
                name: 'Full name of volunteer (required)',
                phone: '10-digit mobile',
                alt_phone: 'Alternate mobile number',
                booth_code: 'Comma-separated booth codes e.g. "1, 2, 3" or "B001,B002"',
                ward_code: 'Ward code from master',
                role: 'Booth Agent / Street Captain / ...',
                volunteer_type: 'paid_volunteer / social_media_volunteer / alliance_volunteer',
                status: 'active / inactive / on_leave',
              },
              onSuccess: () => { api.fetchVolunteers().then(d => d && setVolunteers(d)) },
            }}
            onClose={() => setShowImport(false)}
          />
        )}
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search volunteers..."
            value={search}
            onChange={setSearch}
            onExport={() => exportRecordsToCsv(allVolunteerRecords, 'Volunteers')}
            onPrint={() => printModule(allVolunteerRecords, 'Volunteers')}
          />
          <div className="flex items-center gap-2 mt-2 mb-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">Filter by Booth</label>
            <select
              value={boothFilter ?? ''}
              onChange={e => setBoothFilter(e.target.value ? Number(e.target.value) : undefined)}
              className={`${selectCls} w-[220px]`}
            >
              <option value="">All Booths</option>
              {booths.map(b => (
                <option key={b.id} value={b.id}>{b.number} — {b.name}</option>
              ))}
            </select>
            {boothFilter && (
              <button
                onClick={() => setBoothFilter(undefined)}
                className="text-[11px] text-rose-500 hover:underline"
              >
                Clear
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
            onEdit={handleEdit}
            onDelete={handleDelete}
            filterConfig={[
              { key: 'status', label: 'Status', options: [
                { value: 'active',   label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'on_leave', label: 'Suspended' },
              ]},
              { key: 'volunteer_type', label: 'Type', options: [
                { value: 'paid_volunteer',          label: 'Paid Volunteer' },
                { value: 'social_media_volunteer',  label: 'Social Media' },
                { value: 'alliance_volunteer',      label: 'Alliance' },
              ]},
              { key: 'role', label: 'Role', options: [
                { value: 'Booth Agent',           label: 'Booth Agent' },
                { value: 'Street Captain',        label: 'Street Captain' },
                { value: 'Village Coordinator',   label: 'Village Coordinator' },
                { value: 'WhatsApp Coordinator',  label: 'WhatsApp Coordinator' },
                { value: 'Women Wing Member',     label: 'Women Wing' },
                { value: 'Youth Wing Member',     label: 'Youth Wing' },
                { value: 'Data Entry Operator',   label: 'Data Entry' },
                { value: 'Driver / Vehicle Support', label: 'Driver' },
                { value: 'Event Coordinator',     label: 'Event Coordinator' },
                { value: 'Telecalling',           label: 'Telecalling' },
                { value: 'General Volunteer',     label: 'General' },
              ]},
            ]}
          />
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
        <FormRow cols={1}>
          <FormGroup label="Name" required>
            <input ref={r.name} className={inputCls} placeholder="Volunteer full name" />
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

        <FormRow cols={3}>
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
          <FormGroup label="Role">
            <select ref={r.role} className={selectCls}>
              <option value="">Select</option>
              <option>Booth Agent</option>
              <option>Street Captain</option>
              <option>Village Coordinator</option>
              <option>WhatsApp Coordinator</option>
              <option>Women Wing Member</option>
              <option>Youth Wing Member</option>
              <option>Data Entry Operator</option>
              <option>Driver / Vehicle Support</option>
              <option>Event Coordinator</option>
              <option>Telecalling</option>
              <option>General Volunteer</option>
            </select>
          </FormGroup>
        </FormRow>

        {/* Multi-select Booths */}
        <div className="mb-3">
          <div className="text-[11px] font-semibold text-navy mb-1">
            Booths <span className="text-muted font-normal">(select one or more)</span>
            {selectedBoothIds.length > 0 && (
              <span className="ml-2 text-saffron font-bold">{selectedBoothIds.length} selected</span>
            )}
          </div>
          <div className="border border-border rounded-lg p-2 max-h-[140px] overflow-y-auto bg-white grid grid-cols-2 sm:grid-cols-3 gap-1">
            {booths.map(b => {
              const checked = selectedBoothIds.includes(b.id)
              return (
                <label key={b.id}
                  className={`flex items-center gap-2 px-2 py-[5px] rounded cursor-pointer text-[11px] transition-colors ${checked ? 'bg-[#fff3e0] font-semibold text-navy' : 'hover:bg-[#f8fafc]'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedBoothIds(prev =>
                        prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id]
                      )
                    }
                    className="accent-saffron w-[13px] h-[13px] flex-shrink-0"
                  />
                  <span className="truncate">{b.number} — {b.name}</span>
                </label>
              )
            })}
          </div>
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
          <FormGroup label="Skills / Expertise">
            <input ref={r.skills} className={inputCls} placeholder="Driving, Social media..." />
          </FormGroup>
          <FormGroup label="Volunteer Type">
            <select ref={r.volunteer_type} className={selectCls}>
              <option value="">Select</option>
              <option value="paid_volunteer">Paid Volunteer</option>
              <option value="social_media_volunteer">Social Media Volunteer</option>
              <option value="alliance_volunteer">Alliance Volunteer</option>
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
