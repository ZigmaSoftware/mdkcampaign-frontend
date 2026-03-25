import React, { useRef, useState, useEffect } from 'react'
import apiClient from '../../utils/api'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { VolunteerRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Booth, Ward } from '../../hooks/useMasterAPI'
import { useUserAPI } from '../../hooks/usePollAPI'
import type { UserRecord } from '../../hooks/usePollAPI'
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
  const userApi = useUserAPI()
  const { showToast } = useToast()

  const [volunteers, setVolunteers] = useState<VolunteerRecord[]>([])
  const [booths, setBooths]         = useState<Booth[]>([])
  const [wards, setWards]           = useState<Ward[]>([])
  const [users, setUsers]           = useState<UserRecord[]>([])
  const [editing, setEditing]       = useState<VolunteerRecord | null>(null)
  const [isFormOpen, setFormOpen]   = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch]         = useState('')
  useEffect(() => {
    api.fetchVolunteers().then(d => d && setVolunteers(d))
    masterApi.fetchBooths().then(d => d && setBooths(d))
    masterApi.fetchWards().then(d => d && setWards(d))
    userApi.fetchUsers().then(d => d && setUsers(d))
  }, [])

  const blocks = useBlocks()

  useEffect(() => {
    if (isFormOpen && editing) {
      fillFromRecord(editing)
    }
  }, [editing, isFormOpen, blocks])

  const r = {
    user:    useRef<HTMLSelectElement>(null),
    block:   useRef<HTMLSelectElement>(null),
    phone:   useRef<HTMLInputElement>(null),
    phone2:  useRef<HTMLInputElement>(null),
    booth:   useRef<HTMLSelectElement>(null),
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
  }

  const fillFromRecord = (v: VolunteerRecord) => {
    if (r.block.current)  r.block.current.value  = v.block  || ''
    if (r.booth.current)  r.booth.current.value  = v.booth ? String(v.booth)  : ''
    if (r.ward.current)   r.ward.current.value   = v.ward  ? String(v.ward)   : ''
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
    const boothId   = r.booth.current?.value  ? parseInt(r.booth.current.value)  : null
    const wardId    = r.ward.current?.value   ? parseInt(r.ward.current.value)   : null
    const statusVal = STATUS_MAP[r.status.current?.value || 'Active'] || 'active'
    const ageVal    = r.age.current?.value    ? parseInt(r.age.current.value)    : null

    const commonFields = {
      phone:       phone,
      phone2:      r.phone2.current?.value  || '',
      block:       r.block.current?.value   || '',
      booth:       boothId,
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
      const userId = r.user.current?.value ? parseInt(r.user.current.value) : null
      if (!userId) {
        showToast('<i class="ph ph-warning"></i> Select a user!', '#dc2626')
        return
      }
      const created = await api.createVolunteer({
        user: userId,
        ...commonFields,
      } as any)
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

  const assignedUserIds = new Set(volunteers.map(v => v.user).filter(Boolean))
  const availableUsers  = users.filter(u => !assignedUserIds.has(u.id))

  const getVolName = (v: VolunteerRecord) =>
    v.user_name?.trim() || v.username || `Volunteer #${v.id}`

  const mapVolunteer = (v: VolunteerRecord): EntryRecord => {
    const boothInfo = booths.find(b => b.id === v.booth)
    const wardInfo  = wards.find(w => w.id === v.ward)
    const name = getVolName(v)
    return {
      id: String(v.id),
      keyField: name,
      sub: [
        boothInfo ? `Booth ${boothInfo.number}` : null,
        wardInfo  ? wardInfo.name : null,
        STATUS_REVERSE[v.status || ''] || v.status || 'Active',
      ].filter(Boolean).join(' · '),
      data: {
        status:         v.status         || '',
        role:           v.role           || '',
        volunteer_type: v.volunteer_type || '',
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
              sampleColumns: ['username', 'phone', 'booth_code', 'ward_code', 'assignment_type', 'status'],
              sampleRow: {
                username: 'john_volunteer', phone: '9876543210',
                booth_code: 'B001', ward_code: 'W001',
                assignment_type: 'booth', status: 'active',
              },
              columnNotes: {
                username: 'Username of existing user account',
                phone: '10-digit mobile number',
                booth_code: 'Booth code from master',
                ward_code: 'Ward code from master',
                assignment_type: 'booth / ward / constituency',
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
        {/* User selector (create only) or name display (edit) */}
        {editing ? (
          <div className="mb-4 px-3 py-2 rounded-lg bg-[#f0f4ff] border border-border text-[13px] text-navy font-semibold">
            <i className="ph ph-user mr-2" />
            {getVolName(editing)}
          </div>
        ) : (
          <FormRow cols={1}>
            <FormGroup label="User" required>
              <select ref={r.user} className={selectCls}>
                <option value="">Select user to assign as volunteer</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.username} ({u.username})
                  </option>
                ))}
              </select>
            </FormGroup>
          </FormRow>
        )}

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
          <FormGroup label="Booth">
            <select ref={r.booth} className={selectCls}>
              <option value="">Select Booth</option>
              {booths.map(b => <option key={b.id} value={b.id}>{b.number} — {b.name}</option>)}
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
              <option>General Volunteer</option>
            </select>
          </FormGroup>
        </FormRow>

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
