import React, { useRef, useState, useEffect } from 'react'
import BulkImportModal from '../../components/entry/BulkImportModal'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Area, Booth, Ward, Scheme, Achievement, Constituency, District, State, Party, TaskType, TaskCategory, CampaignActivityType, VolunteerRole, VolunteerType, Panchayat, Union } from '../../hooks/useMasterAPI'
import type { MasterRecord } from '../../types/master.types'
import MasterListCard from '../../components/masters/MasterListCard'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'
import { useToast } from '../../context/ToastContext'

/* ── shared form section wrapper ── */
function FormSection({ title, icon, badge, children }: {
  title: string; icon: string; badge?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-card shadow-card overflow-hidden">
      <div className="bg-navy text-white px-[18px] py-3 flex items-center justify-between">
        <h3 className="font-inter text-[11px] font-extrabold tracking-[1px] uppercase flex items-center gap-2">
          <i className={icon} />{title}
        </h3>
        {badge}
      </div>
      <div className="px-[18px] py-5">{children}</div>
    </div>
  )
}

/* ── helper: map any API record to MasterRecord for display ── */
function toRecs<T extends { id: number; name: string }>(
  items: T[],
  metaFn?: (item: T) => string,
  extraFn?: (item: T) => Record<string, string>,
): MasterRecord[] {
  return items.map(item => ({
    id:       String(item.id),
    key:      item.name,
    meta:     metaFn?.(item) ?? '',
    extra:    extraFn?.(item),
    backendId: item.id,
  }))
}

/* ── DISTRICT MASTER ─────────────────────────────────────────────── */
export function DistrictMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef  = useRef<HTMLInputElement>(null)
  const codeRef  = useRef<HTMLInputElement>(null)
  const stateRef = useRef<HTMLSelectElement>(null)
  const [districts, setDistricts] = useState<District[]>([])
  const [states, setStates]       = useState<State[]>([])
  const [editing, setEditing]     = useState<District | null>(null)

  useEffect(() => {
    api.fetchDistricts().then(d => d && setDistricts(d))
    api.fetchStates().then(d => d && setStates(d))
  }, [])

  const clearFields = () => {
    if (nameRef.current)  nameRef.current.value  = ''
    if (codeRef.current)  codeRef.current.value  = ''
    if (stateRef.current) stateRef.current.value = ''
  }

  const handleSave = async () => {
    const name    = nameRef.current?.value.trim() ?? ''
    const code    = codeRef.current?.value.trim().toUpperCase().slice(0, 10) ?? ''
    const stateId = stateRef.current?.value ? parseInt(stateRef.current.value) : undefined
    if (!name || !code) { showToast('<i class="ph ph-warning"></i> Name and Code are required!', '#dc2626'); return }

    if (editing) {
      const updated = await api.updateDistrict(editing.id, { name })
      if (updated) {
        setDistricts(prev => prev.map(d => d.id === editing.id ? { ...d, ...updated } : d))
        showToast('<i class="ph ph-check-circle"></i> District updated!', '#138808')
      }
      setEditing(null)
    } else {
      if (!stateId) { showToast('<i class="ph ph-warning"></i> Select a state!', '#dc2626'); return }
      const created = await api.createDistrict({ name, code, state: stateId })
      if (created) {
        setDistricts(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> District saved!', '#138808')
      }
    }
    clearFields()
  }

  const handleEdit = (id: string) => {
    const d = districts.find(d => String(d.id) === id)
    if (!d) return
    setEditing(d)
    if (nameRef.current)  nameRef.current.value  = d.name
    if (codeRef.current)  codeRef.current.value  = d.code
    if (stateRef.current) stateRef.current.value = String(d.state)
  }

  const handleDelete = async (id: string) => {
    const d = districts.find(d => String(d.id) === id)
    if (!d || !window.confirm('Delete this district?')) return
    const ok = await api.deleteDistrict(d.id)
    if (ok) {
      setDistricts(prev => prev.filter(x => x.id !== d.id))
      showToast('<i class="ph ph-trash"></i> District deleted.', '#dc2626')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="District Master" icon="ph ph-map-trifold">
        <FormRow cols={1}>
          <FormGroup label="State" required>
            <select ref={stateRef} className={selectCls} disabled={!!editing}>
              <option value="">Select State</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="District Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Erode" />
          </FormGroup>
          <FormGroup label="Code (max 10)" required>
            <input ref={codeRef} className={inputCls} placeholder="e.g. ERD" maxLength={10} disabled={!!editing} />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={() => { clearFields(); setEditing(null) }}
          saveLabel="Save District"
          isEditing={!!editing}
        />
      </FormSection>
      <MasterListCard
        title="Districts"
        icon="ph ph-list"
        records={toRecs(districts, d => d.state_name || '', d => ({
          'Code':  d.code,
          'State': d.state_name || '',
        }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

/* ── CONSTITUENCY MASTER ──────────────────────────────────────────── */
export function ConstituencyMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef  = useRef<HTMLInputElement>(null)
  const codeRef  = useRef<HTMLInputElement>(null)
  const etypeRef = useRef<HTMLSelectElement>(null)
  const distRef  = useRef<HTMLSelectElement>(null)
  const [constituencies, setConstituencies] = useState<Constituency[]>([])
  const [districts, setDistricts]           = useState<District[]>([])
  const [editing, setEditing]               = useState<Constituency | null>(null)
  const [showImport, setShowImport]         = useState(false)

  useEffect(() => {
    api.fetchConstituencies().then(d => d && setConstituencies(d))
    api.fetchDistricts().then(d => d && setDistricts(d))
  }, [])

  const clearFields = () => {
    if (nameRef.current)  nameRef.current.value  = ''
    if (codeRef.current)  codeRef.current.value  = ''
    if (distRef.current)  distRef.current.value  = ''
  }

  const handleSave = async () => {
    const name   = nameRef.current?.value.trim() ?? ''
    const code   = codeRef.current?.value.trim().toUpperCase().slice(0, 5) ?? ''
    const distId = distRef.current?.value ? parseInt(distRef.current.value) : undefined
    const etype  = etypeRef.current?.value || 'assembly'
    if (!name || !code) { showToast('<i class="ph ph-warning"></i> Name and Code are required!', '#dc2626'); return }

    if (editing) {
      const updated = await api.updateConstituency(editing.id, { name, election_type: etype })
      if (updated) {
        setConstituencies(prev => prev.map(c => c.id === editing.id ? { ...c, ...updated } : c))
        showToast('<i class="ph ph-check-circle"></i> Constituency updated!', '#138808')
      }
      setEditing(null)
    } else {
      if (!distId) { showToast('<i class="ph ph-warning"></i> Select a district!', '#dc2626'); return }
      const created = await api.createConstituency({ name, code, district: distId, election_type: etype })
      if (created) {
        setConstituencies(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Constituency saved!', '#138808')
      }
    }
    clearFields()
  }

  const handleEdit = (id: string) => {
    const c = constituencies.find(c => String(c.id) === id)
    if (!c) return
    setEditing(c)
    if (nameRef.current)  nameRef.current.value  = c.name
    if (codeRef.current)  codeRef.current.value  = c.code
    if (distRef.current)  distRef.current.value  = String(c.district)
    if (etypeRef.current) etypeRef.current.value = c.election_type || 'assembly'
  }

  const handleDelete = async (id: string) => {
    const c = constituencies.find(c => String(c.id) === id)
    if (!c || !window.confirm('Delete this constituency?')) return
    const ok = await api.deleteConstituency(c.id)
    if (ok) {
      setConstituencies(prev => prev.filter(x => x.id !== c.id))
      showToast('<i class="ph ph-trash"></i> Constituency deleted.', '#dc2626')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Constituency Master" icon="ph ph-buildings">
        <FormRow cols={1}>
          <FormGroup label="District" required>
            <select ref={distRef} className={selectCls} disabled={!!editing}>
              <option value="">Select District</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Constituency Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Modakkurichi" />
          </FormGroup>
          <FormGroup label="Code (max 5)" required>
            <input ref={codeRef} className={inputCls} placeholder="e.g. MOD" maxLength={5} disabled={!!editing} />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Election Type">
            <select ref={etypeRef} className={selectCls}>
              <option value="assembly">Assembly</option>
              <option value="parliament">Parliament</option>
            </select>
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={() => { clearFields(); setEditing(null) }}
          saveLabel="Save Constituency"
          isEditing={!!editing}
        />
      </FormSection>
      <MasterListCard
        title="Constituencies"
        icon="ph ph-list"
        records={toRecs(constituencies, c => `${c.district_name || ''} · ${c.election_type || 'assembly'}`, c => ({
          'Code':          c.code,
          'District':      c.district_name || '',
          'Election Type': c.election_type || 'assembly',
          'Total Booths':  c.total_booths != null ? String(c.total_booths) : '',
        }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onImport={() => setShowImport(true)}
      />
      {showImport && (
        <BulkImportModal
          config={{
            title: 'Import Constituencies',
            uploadEndpoint: '/masters/constituencies/bulk-upload/',
            sampleColumns: ['name', 'code', 'district_code', 'election_type'],
            sampleRow: { name: 'Modakkurichi', code: 'MOD', district_code: 'ERD', election_type: 'assembly' },
            columnNotes: { name: 'Constituency name', code: 'Unique code (max 5)', district_code: 'District code from master', election_type: 'assembly / parliament' },
            onSuccess: () => { api.fetchConstituencies().then(d => d && setConstituencies(d)) },
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

/* ── WARD MASTER ──────────────────────────────────────────────────── */
export function WardMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef  = useRef<HTMLInputElement>(null)
  const codeRef  = useRef<HTMLInputElement>(null)
  const descRef  = useRef<HTMLInputElement>(null)
  const conRef   = useRef<HTMLSelectElement>(null)
  const [wards, setWards]                   = useState<Ward[]>([])
  const [constituencies, setConstituencies] = useState<Constituency[]>([])
  const [editing, setEditing]               = useState<Ward | null>(null)
  const [showImport, setShowImport]         = useState(false)

  useEffect(() => {
    api.fetchWards().then(d => d && setWards(d))
    api.fetchConstituencies().then(d => d && setConstituencies(d))
  }, [])

  // When constituency changes, reload wards
  const handleConstituencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const conId = e.target.value ? parseInt(e.target.value) : undefined
    api.fetchWards(conId).then(d => d && setWards(d))
  }

  const clearFields = () => {
    if (nameRef.current) nameRef.current.value = ''
    if (codeRef.current) codeRef.current.value = ''
    if (descRef.current) descRef.current.value = ''
  }

  const handleSave = async () => {
    const name  = nameRef.current?.value.trim() ?? ''
    const code  = codeRef.current?.value.trim().toUpperCase().slice(0, 5) ?? ''
    const desc  = descRef.current?.value.trim() ?? ''
    const conId = conRef.current?.value ? parseInt(conRef.current.value) : undefined
    if (!name || !code) { showToast('<i class="ph ph-warning"></i> Name and Code required!', '#dc2626'); return }

    if (editing) {
      const updated = await api.updateWard(editing.id, { name, description: desc })
      if (updated) {
        setWards(prev => prev.map(w => w.id === editing.id ? { ...w, ...updated } : w))
        showToast('<i class="ph ph-check-circle"></i> Ward updated!', '#138808')
      }
      setEditing(null)
    } else {
      if (!conId) { showToast('<i class="ph ph-warning"></i> Select a constituency!', '#dc2626'); return }
      const created = await api.createWard({ name, code, constituency: conId, description: desc })
      if (created) {
        setWards(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Ward saved!', '#138808')
      }
    }
    clearFields()
  }

  const handleEdit = (id: string) => {
    const w = wards.find(w => String(w.id) === id)
    if (!w) return
    setEditing(w)
    if (nameRef.current) nameRef.current.value = w.name
    if (codeRef.current) codeRef.current.value = w.code
    if (descRef.current) descRef.current.value = w.description || ''
    if (conRef.current)  conRef.current.value  = String(w.constituency)
  }

  const handleDelete = async (id: string) => {
    const w = wards.find(w => String(w.id) === id)
    if (!w || !window.confirm('Delete this ward?')) return
    const ok = await api.deleteWard(w.id)
    if (ok) {
      setWards(prev => prev.filter(x => x.id !== w.id))
      showToast('<i class="ph ph-trash"></i> Ward deleted.', '#dc2626')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Ward Master" icon="ph ph-house-line">
        <FormRow cols={1}>
          <FormGroup label="Constituency" required>
            <select ref={conRef} className={selectCls} disabled={!!editing} onChange={handleConstituencyChange}>
              <option value="">Select Constituency</option>
              {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Ward Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Modakkurichi Town" />
          </FormGroup>
          <FormGroup label="Code (max 5)" required>
            <input ref={codeRef} className={inputCls} placeholder="e.g. W001" maxLength={5} disabled={!!editing} />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Description">
            <input ref={descRef} className={inputCls} placeholder="Panchayat or ULB details" />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={() => { clearFields(); setEditing(null) }}
          saveLabel="Save Ward"
          isEditing={!!editing}
        />
      </FormSection>
      <MasterListCard
        title="Wards"
        icon="ph ph-list"
        records={toRecs(wards, w => w.constituency_name || '', w => ({
          'Code':          w.code,
          'Constituency':  w.constituency_name || '',
          'Description':   w.description || '',
        }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onImport={() => setShowImport(true)}
      />
      {showImport && (
        <BulkImportModal
          config={{
            title: 'Import Wards',
            uploadEndpoint: '/masters/wards/bulk-upload/',
            sampleColumns: ['name', 'code', 'constituency_code'],
            sampleRow: { name: 'Modakkurichi Town Ward', code: 'W001', constituency_code: 'MOD' },
            columnNotes: { name: 'Ward name', code: 'Unique code (max 5)', constituency_code: 'Constituency code from master' },
            onSuccess: () => { api.fetchWards().then(d => d && setWards(d)) },
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

/* ── AREA MASTER ──────────────────────────────────────────────────── */
export function AreaMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const conRef  = useRef<HTMLSelectElement>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [constituencies, setConstituencies] = useState<Constituency[]>([])
  const [editing, setEditing] = useState<Area | null>(null)

  useEffect(() => {
    api.fetchAreas().then(d => d && setAreas(d))
    api.fetchConstituencies().then(d => d && setConstituencies(d))
  }, [])

  const clearFields = () => {
    if (nameRef.current) nameRef.current.value = ''
    if (descRef.current) descRef.current.value = ''
    if (conRef.current)  conRef.current.value  = ''
  }

  const handleSave = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    const desc = descRef.current?.value.trim() ?? ''
    const conId = conRef.current?.value ? parseInt(conRef.current.value) : undefined
    if (!name) return

    if (editing) {
      const updated = await api.updateArea(editing.id, { name, description: desc || name })
      if (updated) {
        setAreas(prev => prev.map(a => a.id === editing.id ? { ...a, ...updated } : a))
        showToast('<i class="ph ph-check-circle"></i> Area updated!', '#138808')
      }
      setEditing(null)
    } else {
      if (!conId) { showToast('<i class="ph ph-warning"></i> Select a constituency!', '#dc2626'); return }
      const created = await api.createArea({ name, code: `A${String(Date.now()).slice(-9)}`, constituency: conId, description: desc || name })
      if (created) {
        setAreas(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Area saved!', '#138808')
      }
    }
    clearFields()
  }

  const handleEdit = (id: string) => {
    const area = areas.find(a => String(a.id) === id)
    if (!area) return
    setEditing(area)
    if (nameRef.current) nameRef.current.value = area.name
    if (descRef.current) descRef.current.value = area.description || ''
    if (conRef.current)  conRef.current.value  = String(area.constituency)
  }

  const handleDelete = async (id: string) => {
    const area = areas.find(a => String(a.id) === id)
    if (!area || !window.confirm('Delete this area?')) return
    const ok = await api.deleteArea(area.id)
    if (ok) {
      setAreas(prev => prev.filter(a => a.id !== area.id))
      showToast('<i class="ph ph-trash"></i> Area deleted.', '#dc2626')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Block Master" icon="ph ph-map-pin-area">
        <FormRow cols={1}>
          <FormGroup label="Constituency" required>
            <select ref={conRef} className={selectCls} disabled={!!editing}>
              <option value="">Select constituency</option>
              {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Block Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Modakkurichi" />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Description">
            <input ref={descRef} className={inputCls} placeholder="Booths, voters info" />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={() => { clearFields(); setEditing(null) }}
          saveLabel="Save Block"
          isEditing={!!editing}
        />
      </FormSection>
      <MasterListCard
        title="Blocks"
        icon="ph ph-list"
        records={toRecs(areas, a => a.description || a.constituency_name || '', a => ({
          'Code':         a.code,
          'Constituency': a.constituency_name || '',
          'Description':  a.description || '',
        }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

/* ── BOOTH MASTER ─────────────────────────────────────────────────── */
export function BoothMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const numRef       = useRef<HTMLInputElement>(null)
  const bnameRef     = useRef<HTMLInputElement>(null)
  const addrRef      = useRef<HTMLInputElement>(null)
  const panchayatRef = useRef<HTMLSelectElement>(null)
  const agentRef     = useRef<HTMLSelectElement>(null)
  const [booths,     setBooths]     = useState<Booth[]>([])
  const [panchayats, setPanchayats] = useState<Panchayat[]>([])
  const [editing,    setEditing]    = useState<Booth | null>(null)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    api.fetchBooths().then(d => d && setBooths(d))
    api.fetchPanchayats().then(d => d && setPanchayats(d))
  }, [])

  const clearFields = () => {
    ;[numRef, bnameRef, addrRef].forEach(r => { if (r.current) r.current.value = '' })
    if (panchayatRef.current) panchayatRef.current.value = ''
    if (agentRef.current)     agentRef.current.value     = ''
  }

  const handleSave = async () => {
    const num        = numRef.current?.value.trim() ?? ''
    const bname      = bnameRef.current?.value.trim() ?? ''
    const addr       = addrRef.current?.value.trim() ?? ''
    const panchayatId = panchayatRef.current?.value ? parseInt(panchayatRef.current.value) : null
    const agentId    = agentRef.current?.value     ? parseInt(agentRef.current.value)     : null
    if (!num) return

    if (editing) {
      const updated = await api.updateBooth(editing.id, {
        number: num, name: bname || `Booth ${num}`, address: addr || undefined,
        panchayat: panchayatId,
        primary_volunteer: agentId,
      })
      if (updated) {
        setBooths(prev => prev.map(b => b.id === editing.id ? { ...b, ...updated } : b))
        showToast('<i class="ph ph-check-circle"></i> Booth updated!', '#138808')
      }
      setEditing(null)
    } else {
      const created = await api.createBooth({
        number: num, name: bname || `Booth ${num}`, code: `B${String(Date.now() % 10000).padStart(4, '0')}`,
        panchayat: panchayatId,
        address: addr || `Booth ${num}`, total_voters: 0,
        ...(agentId ? { primary_volunteer: agentId } : {}),
      })
      if (created) {
        setBooths(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Booth saved!', '#138808')
      }
    }
    clearFields()
  }

  const handleEdit = (id: string) => {
    const booth = booths.find(b => String(b.id) === id)
    if (!booth) return
    setEditing(booth)
    if (numRef.current)       numRef.current.value       = booth.number
    if (bnameRef.current)     bnameRef.current.value     = booth.name
    if (addrRef.current)      addrRef.current.value      = booth.address || ''
    if (panchayatRef.current) panchayatRef.current.value = booth.panchayat ? String(booth.panchayat) : ''
    if (agentRef.current)     agentRef.current.value     = booth.primary_volunteer ? String(booth.primary_volunteer) : ''
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Booth Master" icon="ph ph-map-pin">
        <FormRow cols={2}>
          <FormGroup label="Booth No." required>
            <input ref={numRef} className={inputCls} placeholder="001" />
          </FormGroup>
          <FormGroup label="Booth Name / Location">
            <input ref={bnameRef} className={inputCls} placeholder="School or landmark" />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Panchayat">
            <select ref={panchayatRef} className={selectCls}>
              <option value="">Select Panchayat</option>
              {panchayats.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Address">
            <input ref={addrRef} className={inputCls} placeholder="Full address" />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={() => { clearFields(); setEditing(null) }}
          saveLabel="Save Booth"
          isEditing={!!editing}
        />
      </FormSection>
      <MasterListCard
        title="Booths"
        icon="ph ph-list"
        records={toRecs(booths, b => `${b.total_voters} voters · ${b.status || ''}`.replace(/^ · /, ''), b => ({
          'Booth Number':   b.number,
          'Booth Name':     b.name,
          'Constituency':   b.constituency_name || '',
          'Address':        b.address || '',
          'Total Voters':   String(b.total_voters),
          'Male Voters':    b.male_voters != null ? String(b.male_voters) : '',
          'Female Voters':  b.female_voters != null ? String(b.female_voters) : '',
          'Status':         b.status || '',
          'Sentiment':      b.sentiment || '',
          'Primary Agent':  b.agent_name || '',
          'Notes':          b.notes || '',
        }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onImport={() => setShowImport(true)}
      />
      {showImport && (
        <BulkImportModal
          config={{
            title: 'Import Booths',
            uploadEndpoint: '/masters/booths/bulk-upload/',
            sampleColumns: ['code', 'number', 'name', 'address', 'total_voters', 'male_voters', 'female_voters', 'status', 'sentiment', 'volunteer_name'],
            sampleRow: { code: 'B001', number: '1', name: 'Panchayat School Booth', address: 'Main Road', total_voters: '500', male_voters: '250', female_voters: '250', status: 'pending', sentiment: 'neutral', volunteer_name: 'Rajesh Kumar' },
            columnNotes: { code: 'Unique booth code (required)', number: 'Booth number', name: 'Booth name / location', address: 'Full address', total_voters: 'Total voters count', male_voters: 'Male voter count', female_voters: 'Female voter count', status: 'pending / assigned / working / completed / issue', sentiment: 'positive / neutral / negative', volunteer_name: 'Volunteer name to assign as booth agent' },
            onSuccess: () => { api.fetchBooths().then(d => d && setBooths(d)) },
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

/* ── VILLAGE / WARD MASTER ────────────────────────────────────────── */
export function VillageMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef  = useRef<HTMLInputElement>(null)
  const boothRef = useRef<HTMLSelectElement>(null)
  const pancRef  = useRef<HTMLInputElement>(null)
  const pinRef   = useRef<HTMLInputElement>(null)
  const typeRef  = useRef<HTMLSelectElement>(null)
  const conRef   = useRef<HTMLSelectElement>(null)
  const [villages, setVillages]         = useState<Ward[]>([])
  const [constituencies, setConstituencies] = useState<Constituency[]>([])
  const [booths, setBooths]             = useState<Booth[]>([])
  const [editing, setEditing]           = useState<Ward | null>(null)

  useEffect(() => {
    api.fetchWards().then(d => d && setVillages(d))
    api.fetchConstituencies().then(d => d && setConstituencies(d))
    api.fetchBooths().then(d => d && setBooths(d))
  }, [])

  const clearFields = () => {
    ;[nameRef, pancRef, pinRef].forEach(r => { if (r.current) r.current.value = '' })
    if (boothRef.current) boothRef.current.value = ''
    if (typeRef.current)  typeRef.current.value  = 'Village'
    if (conRef.current)   conRef.current.value   = ''
  }

  const handleSave = async () => {
    const name  = nameRef.current?.value.trim() ?? ''
    const panc  = pancRef.current?.value.trim() ?? ''
    const conId = conRef.current?.value ? parseInt(conRef.current.value) : undefined
    if (!name) return

    if (editing) {
      const updated = await api.updateWard(editing.id, { name, description: panc || name })
      if (updated) {
        setVillages(prev => prev.map(v => v.id === editing.id ? { ...v, ...updated } : v))
        showToast('<i class="ph ph-check-circle"></i> Village updated!', '#138808')
      }
      setEditing(null)
    } else {
      if (!conId) { showToast('<i class="ph ph-warning"></i> Select a constituency!', '#dc2626'); return }
      const created = await api.createWard({
        name, code: `W${String(Date.now() % 10000).padStart(4, '0')}`, constituency: conId, description: panc || name,
      })
      if (created) {
        setVillages(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Village saved!', '#138808')
      }
    }
    clearFields()
  }

  const handleEdit = (id: string) => {
    const v = villages.find(v => String(v.id) === id)
    if (!v) return
    setEditing(v)
    if (nameRef.current) nameRef.current.value = v.name
    if (conRef.current)  conRef.current.value  = String(v.constituency)
    if (pancRef.current) pancRef.current.value = v.description || ''
    if (boothRef.current) boothRef.current.value = ''
    if (pinRef.current)   pinRef.current.value   = ''
    if (typeRef.current)  typeRef.current.value  = 'Village'
  }

  const handleDelete = async (id: string) => {
    const v = villages.find(v => String(v.id) === id)
    if (!v || !window.confirm('Delete this village/ward?')) return
    const ok = await api.deleteWard(v.id)
    if (ok) {
      setVillages(prev => prev.filter(w => w.id !== v.id))
      showToast('<i class="ph ph-trash"></i> Village deleted.', '#dc2626')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Village / Ward Master" icon="ph ph-house">
        <FormRow cols={1}>
          <FormGroup label="Constituency" required>
            <select ref={conRef} className={selectCls}>
              <option value="">Select constituency</option>
              {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Village / Ward Name" required>
            <input ref={nameRef} className={inputCls} placeholder="Village name" />
          </FormGroup>
          <FormGroup label="Booth">
            <select ref={boothRef} className={selectCls}>
              <option value="">Select Booth</option>
              {booths.map(b => <option key={b.id} value={b.number}>{b.number} — {b.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Type">
            <select ref={typeRef} className={selectCls}>
              <option>Village</option><option>Town Ward</option>
              <option>Urban Ward</option><option>Colony</option><option>Street</option>
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Panchayat / ULB">
            <input ref={pancRef} className={inputCls} placeholder="Panchayat name" />
          </FormGroup>
          <FormGroup label="Pincode">
            <input ref={pinRef} className={inputCls} placeholder="638001" />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={() => { clearFields(); setEditing(null) }}
          saveLabel="Save Village"
          isEditing={!!editing}
        />
      </FormSection>
      <MasterListCard
        title="Villages / Wards"
        icon="ph ph-list"
        records={toRecs(villages, v => v.constituency_name || '', v => ({
          'Code':         v.code,
          'Constituency': v.constituency_name || '',
          'Description':  v.description || '',
        }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

/* ── SCHEME MASTER ────────────────────────────────────────────────── */

const SCHEME_TYPE_OPTIONS = [
  { label: 'Central Scheme',       value: 'central' },
  { label: 'State Scheme',         value: 'state'   },
  { label: 'Arram Trust Activity', value: 'party'   },
  { label: 'Party Initiative',     value: 'party'   },
]

export function SchemeMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef    = useRef<HTMLInputElement>(null)
  const deptRef    = useRef<HTMLInputElement>(null)
  const stypeRef   = useRef<HTMLSelectElement>(null)
  const targetRef  = useRef<HTMLInputElement>(null)
  const launchRef  = useRef<HTMLInputElement>(null)
  const endRef     = useRef<HTMLInputElement>(null)
  const budgetRef  = useRef<HTMLInputElement>(null)
  const beneRef    = useRef<HTMLInputElement>(null)
  const descRef    = useRef<HTMLTextAreaElement>(null)
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [editing, setEditing] = useState<Scheme | null>(null)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    api.fetchSchemes().then(d => d && setSchemes(d))
  }, [])

  const clearFields = () => {
    ;[nameRef, deptRef, targetRef, launchRef, endRef, budgetRef, beneRef].forEach(r => { if (r.current) r.current.value = '' })
    if (descRef.current) descRef.current.value = ''
    if (stypeRef.current) stypeRef.current.value = ''
  }

  const handleSave = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    if (!name) return
    const payload: any = {
      name,
      description: descRef.current?.value.trim() || name,
      scheme_type: stypeRef.current?.value || 'central',
      responsible_ministry: deptRef.current?.value.trim() || '',
      target_population: targetRef.current?.value ? parseInt(targetRef.current.value) : 0,
      beneficiaries:     beneRef.current?.value    ? parseInt(beneRef.current.value)    : 0,
      budget:            budgetRef.current?.value  ? parseInt(budgetRef.current.value)  : 0,
      launch_date: launchRef.current?.value || null,
      end_date:    endRef.current?.value    || null,
    }

    if (editing) {
      const updated = await api.updateScheme(editing.id, payload)
      if (updated) {
        setSchemes(prev => prev.map(s => s.id === editing.id ? { ...s, ...updated } : s))
        showToast('<i class="ph ph-check-circle"></i> Scheme updated!', '#138808')
      }
      setEditing(null)
    } else {
      const created = await api.createScheme(payload)
      if (created) {
        setSchemes(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Scheme saved!', '#138808')
      }
    }
    clearFields()
  }

  const handleEdit = (id: string) => {
    const s = schemes.find(s => String(s.id) === id)
    if (!s) return
    setEditing(s)
    if (nameRef.current)   nameRef.current.value   = s.name
    if (deptRef.current)   deptRef.current.value   = s.responsible_ministry || ''
    if (descRef.current)   descRef.current.value   = s.description || ''
    if (stypeRef.current)  stypeRef.current.value  = s.scheme_type || ''
    if (targetRef.current) targetRef.current.value = String(s.target_population ?? '')
    if (beneRef.current)   beneRef.current.value   = String(s.beneficiaries ?? '')
    if (budgetRef.current) budgetRef.current.value = String(s.budget ?? '')
    if (launchRef.current) launchRef.current.value = s.launch_date || ''
    if (endRef.current)    endRef.current.value    = s.end_date    || ''
  }

  const handleDelete = async (id: string) => {
    const s = schemes.find(s => String(s.id) === id)
    if (!s || !window.confirm('Delete this scheme?')) return
    const ok = await api.deleteScheme(s.id)
    if (ok) {
      setSchemes(prev => prev.filter(sc => sc.id !== s.id))
      showToast('<i class="ph ph-trash"></i> Scheme deleted.', '#dc2626')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Scheme / Programme Master" icon="ph ph-file-text">
        <FormRow cols={2}>
          <FormGroup label="Scheme Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. PM Awas Yojana" />
          </FormGroup>
          <FormGroup label="Ministry / Department">
            <input ref={deptRef} className={inputCls} placeholder="e.g. Ministry of Housing" />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Scheme Type">
            <select ref={stypeRef} className={selectCls}>
              <option value="">Select</option>
              {SCHEME_TYPE_OPTIONS.map(o => (
                <option key={o.label} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Target Population (count)">
            <input ref={targetRef} type="number" className={inputCls} placeholder="e.g. 5000" />
          </FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Launch Date">
            <input ref={launchRef} type="date" className={inputCls} />
          </FormGroup>
          <FormGroup label="End Date">
            <input ref={endRef} type="date" className={inputCls} />
          </FormGroup>
          <FormGroup label="Budget (₹)">
            <input ref={budgetRef} type="number" className={inputCls} placeholder="Amount in ₹" />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Beneficiaries (reached count)">
            <input ref={beneRef} type="number" className={inputCls} placeholder="No. of beneficiaries reached" />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Description">
            <textarea ref={descRef} className={textareaCls} placeholder="Brief description of the scheme..." />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={() => { clearFields(); setEditing(null) }}
          saveLabel="Save Scheme"
          isEditing={!!editing}
        />
      </FormSection>
      <MasterListCard
        title="Schemes"
        icon="ph ph-list"
        records={toRecs(schemes, s => s.scheme_type || '', s => ({
          'Type':         s.scheme_type || '',
          'Constituency': s.constituency_name || '',
          'Description':  s.description || '',
          'Ministry':     s.responsible_ministry || '',
          'Launch Date':  s.launch_date || '',
          'End Date':     s.end_date || '',
        }))}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onImport={() => setShowImport(true)}
      />
      {showImport && (
        <BulkImportModal
          config={{
            title: 'Import Schemes',
            uploadEndpoint: '/masters/schemes/bulk-upload/',
            sampleColumns: ['name', 'description', 'scheme_type', 'constituency_code', 'launch_date', 'responsible_ministry'],
            sampleRow: { name: 'PM Awas Yojana', description: 'Housing for all', scheme_type: 'central', constituency_code: 'MOD', launch_date: '2023-01-01', responsible_ministry: 'Ministry of Housing' },
            columnNotes: { name: 'Scheme name (required)', description: 'Brief description', scheme_type: 'central / state / party', constituency_code: 'Constituency code from master', launch_date: 'YYYY-MM-DD format', responsible_ministry: 'Ministry or department name' },
            onSuccess: () => { api.fetchSchemes().then(d => d && setSchemes(d)) },
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

/* ── ACHIEVEMENT MASTER ───────────────────────────────────────────── */

export function AchievementMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef  = useRef<HTMLInputElement>(null)
  const descRef  = useRef<HTMLTextAreaElement>(null)
  const wardRef  = useRef<HTMLSelectElement>(null)
  const boothRef = useRef<HTMLSelectElement>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [wards,  setWards]  = useState<Ward[]>([])
  const [booths, setBooths] = useState<Booth[]>([])
  const [editing, setEditing] = useState<Achievement | null>(null)

  useEffect(() => {
    api.fetchAchievements().then(d => d && setAchievements(d))
    api.fetchWards().then(d => d && setWards(d))
    api.fetchBooths().then(d => d && setBooths(d))
  }, [])

  const clearFields = () => {
    if (nameRef.current)  nameRef.current.value  = ''
    if (descRef.current)  descRef.current.value  = ''
    if (wardRef.current)  wardRef.current.value  = ''
    if (boothRef.current) boothRef.current.value = ''
  }

  const handleSave = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    if (!name) return
    const payload = {
      name,
      description: descRef.current?.value.trim() || '',
      ward:  wardRef.current?.value  ? Number(wardRef.current.value)  : undefined,
      booth: boothRef.current?.value ? Number(boothRef.current.value) : undefined,
    }

    if (editing) {
      const updated = await api.updateAchievement(editing.id, payload)
      if (updated) {
        setAchievements(prev => prev.map(a => a.id === editing.id ? { ...a, ...updated } : a))
        showToast('<i class="ph ph-check-circle"></i> Achievement updated!', '#138808')
      }
      setEditing(null)
    } else {
      const created = await api.createAchievement(payload)
      if (created) {
        setAchievements(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Achievement saved!', '#138808')
      }
    }
    clearFields()
  }

  const handleEdit = (id: string) => {
    const a = achievements.find(x => String(x.id) === id)
    if (!a) return
    setEditing(a)
    if (nameRef.current)  nameRef.current.value  = a.name
    if (descRef.current)  descRef.current.value  = a.description || ''
    if (wardRef.current)  wardRef.current.value  = String(a.ward  ?? '')
    if (boothRef.current) boothRef.current.value = String(a.booth ?? '')
  }

  const handleDelete = async (id: string) => {
    const a = achievements.find(x => String(x.id) === id)
    if (!a || !window.confirm('Delete this achievement?')) return
    const ok = await api.deleteAchievement(a.id)
    if (ok) {
      setAchievements(prev => prev.filter(x => x.id !== a.id))
      showToast('<i class="ph ph-trash"></i> Achievement deleted.', '#dc2626')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Achievements Master" icon="ph ph-trophy">
        <FormRow cols={1}>
          <FormGroup label="Achievement Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Road widening completed" />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Ward">
            <select ref={wardRef} className={selectCls}>
              <option value="">Select Ward</option>
              {wards.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Booth">
            <select ref={boothRef} className={selectCls}>
              <option value="">Select Booth</option>
              {booths.map(b => <option key={b.id} value={String(b.id)}>{b.number} — {b.name}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Description">
            <textarea ref={descRef} className={textareaCls} placeholder="Describe the achievement and its impact..." />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={() => { clearFields(); setEditing(null) }}
          saveLabel="Save Achievement"
          isEditing={!!editing}
        />
      </FormSection>
      <MasterListCard
        title="Achievements"
        icon="ph ph-list"
        records={toRecs(achievements, a => {
          const wardName  = wards.find(w => w.id === a.ward)?.name   || a.ward_name  || ''
          const boothName = booths.find(b => b.id === a.booth)?.name || a.booth_name || ''
          return [wardName && `Ward: ${wardName}`, boothName && `Booth: ${boothName}`].filter(Boolean).join(' · ')
        }, a => {
          const wardName  = wards.find(w => w.id === a.ward)?.name   || a.ward_name  || ''
          const boothName = booths.find(b => b.id === a.booth)?.name || a.booth_name || ''
          return {
            'Ward':        wardName,
            'Booth':       boothName,
            'Description': a.description || '',
          }
        })}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

/* ── CANDIDATE INFO ───────────────────────────────────────────────── */
export function CandidateMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const [candidateId, setCandidateId] = useState<number | null>(null)
  const r = {
    name: useRef<HTMLInputElement>(null), tamil: useRef<HTMLInputElement>(null),
    con: useRef<HTMLInputElement>(null), party: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null),
    dob: useRef<HTMLInputElement>(null), edu: useRef<HTMLInputElement>(null),
    desig: useRef<HTMLInputElement>(null), org: useRef<HTMLInputElement>(null),
    nomdate: useRef<HTMLInputElement>(null), elecdate: useRef<HTMLInputElement>(null),
    slogan: useRef<HTMLInputElement>(null), sloganta: useRef<HTMLInputElement>(null),
    social: useRef<HTMLInputElement>(null), web: useRef<HTMLInputElement>(null),
    bio: useRef<HTMLTextAreaElement>(null),
  }

  useEffect(() => {
    api.fetchCandidates().then(list => {
      if (!list?.length) return
      const c = list[0]
      setCandidateId(c.id)
      if (r.name.current) r.name.current.value = c.name
    })
  }, [])

  const handleSave = async () => {
    const name = r.name.current?.value.trim() ?? ''
    if (!name) { showToast('<i class="ph ph-warning"></i> Candidate name is required!', '#dc2626'); return }
    if (candidateId) {
      const updated = await api.updateCandidate(candidateId, { name })
      if (updated) showToast('<i class="ph ph-check-circle"></i> Candidate info updated!', '#138808')
    } else {
      showToast('<i class="ph ph-info"></i> No candidate record found — create one via admin panel first.', '#0d2455')
    }
  }

  return (
    <div className="page-enter">
      <FormSection title="Candidate Information" icon="ph ph-user-circle" badge={<span className="text-[9px] font-bold bg-kampgreen text-white px-2 py-[3px] rounded-[10px] tracking-[0.5px]">Official Record</span>}>
        <FormRow cols={3}>
          <FormGroup label="Full Name" required><input ref={r.name} className={inputCls} defaultValue="Mrs. Kirthika Shivkumar" /></FormGroup>
          <FormGroup label="Name in Tamil"><input ref={r.tamil} className={`${inputCls} font-tamil`} defaultValue="கிருத்திகா சிவ்குமார்" /></FormGroup>
          <FormGroup label="Constituency No."><input ref={r.con} className={inputCls} defaultValue="100 – Modakkurichi" /></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Party"><input ref={r.party} className={inputCls} defaultValue="BJP" /></FormGroup>
          <FormGroup label="Phone"><input ref={r.phone} type="tel" className={inputCls} /></FormGroup>
          <FormGroup label="Email"><input ref={r.email} type="email" className={inputCls} /></FormGroup>
          <FormGroup label="Date of Birth"><input ref={r.dob} type="date" className={inputCls} /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Education"><input ref={r.edu} className={inputCls} defaultValue="B.E – Sathyabama · MBA – GRG School of Mgmt" /></FormGroup>
          <FormGroup label="Designation"><input ref={r.desig} className={inputCls} defaultValue="BJP State Secretary – TN NGO Wing" /></FormGroup>
          <FormGroup label="Organisation"><input ref={r.org} className={inputCls} defaultValue="Arram Charity Trust / TIPS" /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Nomination Filing Date"><input ref={r.nomdate} type="date" className={inputCls} defaultValue="2026-04-15" /></FormGroup>
          <FormGroup label="Election Date"><input ref={r.elecdate} type="date" className={inputCls} defaultValue="2026-04-23" /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Campaign Slogan (English)"><input ref={r.slogan} className={inputCls} placeholder="Campaign tagline" /></FormGroup>
          <FormGroup label="Campaign Slogan (Tamil)"><input ref={r.sloganta} className={`${inputCls} font-tamil`} placeholder="தமிழ் முழக்கம்" /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Social Media Handle"><input ref={r.social} className={inputCls} defaultValue="@kirthika_shivkumar" /></FormGroup>
          <FormGroup label="Website"><input ref={r.web} className={inputCls} defaultValue="arramsei.org" /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Candidate Bio / Statement"><textarea ref={r.bio} className={textareaCls} defaultValue="Visionary Educationist · Social Impact Leader · Advocate for Women-Led Development" /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={() => {}} saveLabel="Save Candidate Info" />
      </FormSection>
    </div>
  )
}

/* ── PARTY DETAILS ────────────────────────────────────────────────── */
export function PartyMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const [partyId, setPartyId] = useState<number | null>(null)
  const r = {
    name: useRef<HTMLInputElement>(null), short: useRef<HTMLInputElement>(null),
    symbol: useRef<HTMLInputElement>(null), president: useRef<HTMLInputElement>(null),
    pphone: useRef<HTMLInputElement>(null), dpresident: useRef<HTMLInputElement>(null),
    hq: useRef<HTMLInputElement>(null), distoff: useRef<HTMLInputElement>(null),
    localoff: useRef<HTMLInputElement>(null), web: useRef<HTMLInputElement>(null),
    wa: useRef<HTMLInputElement>(null), app: useRef<HTMLInputElement>(null),
    eagent: useRef<HTMLInputElement>(null), eagentph: useRef<HTMLInputElement>(null),
    color1: useRef<HTMLInputElement>(null), color2: useRef<HTMLInputElement>(null),
  }

  useEffect(() => {
    api.fetchParties().then(list => {
      if (!list?.length) return
      const p = list.find(x => x.abbreviation === 'BJP' || x.code === 'BJP') ?? list[0]
      setPartyId(p.id)
      if (r.name.current)      r.name.current.value      = p.name
      if (r.short.current)     r.short.current.value     = p.abbreviation ?? p.code ?? ''
      if (r.president.current) r.president.current.value = p.president_name ?? ''
      if (r.hq.current)        r.hq.current.value        = p.headquarters ?? ''
    })
  }, [])

  const handleSave = async () => {
    const name = r.name.current?.value.trim() ?? ''
    if (!name) { showToast('<i class="ph ph-warning"></i> Party name is required!', '#dc2626'); return }
    const payload: Partial<Party> = {
      name,
      code:           r.short.current?.value.trim() || name.slice(0, 10).toUpperCase(),
      abbreviation:   r.short.current?.value.trim() ?? '',
      president_name: r.president.current?.value.trim() ?? '',
      headquarters:   r.hq.current?.value.trim() ?? '',
    }
    if (partyId) {
      const updated = await api.updateParty(partyId, payload)
      if (updated) showToast('<i class="ph ph-check-circle"></i> Party details saved!', '#138808')
    } else {
      const created = await api.createParty(payload)
      if (created) {
        setPartyId(created.id)
        showToast('<i class="ph ph-check-circle"></i> Party details saved!', '#138808')
      }
    }
  }

  return (
    <div className="page-enter">
      <FormSection title="Party Details" icon="ph ph-flag" badge={<span className="text-[9px] font-bold bg-saffron text-navy px-2 py-[3px] rounded-[10px] tracking-[0.5px]">BJP Configuration</span>}>
        <FormRow cols={3}>
          <FormGroup label="Party Full Name" required><input ref={r.name} className={inputCls} defaultValue="Bharatiya Janata Party" /></FormGroup>
          <FormGroup label="Short Name"><input ref={r.short} className={inputCls} defaultValue="BJP" /></FormGroup>
          <FormGroup label="Party Symbol"><input ref={r.symbol} className={inputCls} defaultValue="Lotus" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="State Unit President"><input ref={r.president} className={inputCls} defaultValue="Mr. Nainar Nagendran" /></FormGroup>
          <FormGroup label="President Phone"><input ref={r.pphone} type="tel" className={inputCls} /></FormGroup>
          <FormGroup label="District President"><input ref={r.dpresident} className={inputCls} placeholder="Erode District President" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="State HQ Address"><input ref={r.hq} className={inputCls} placeholder="Party state HQ address" /></FormGroup>
          <FormGroup label="District Office"><input ref={r.distoff} className={inputCls} placeholder="Erode district office" /></FormGroup>
          <FormGroup label="Local Office"><input ref={r.localoff} className={inputCls} placeholder="Modakkurichi office" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Party Website"><input ref={r.web} className={inputCls} defaultValue="bjp.org" /></FormGroup>
          <FormGroup label="Official WhatsApp Group"><input ref={r.wa} className={inputCls} placeholder="Group link or name" /></FormGroup>
          <FormGroup label="Party App"><input ref={r.app} className={inputCls} defaultValue="NaMo App" /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Election Agent Name"><input ref={r.eagent} className={inputCls} placeholder="Official election agent" /></FormGroup>
          <FormGroup label="Election Agent Phone"><input ref={r.eagentph} type="tel" className={inputCls} /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Party Color (Primary)"><input ref={r.color1} className={inputCls} defaultValue="#FF9933 (Saffron)" /></FormGroup>
          <FormGroup label="Party Color (Secondary)"><input ref={r.color2} className={inputCls} defaultValue="#0D2455 (Navy)" /></FormGroup>
        </FormRow>
        <FormActions onSave={handleSave} onClear={() => {}} saveLabel="Save Party Details" />
      </FormSection>
    </div>
  )
}

/* ── TASK CATEGORY MASTER ─────────────────────────────────────────── */
export function TaskCategoryMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const typeNameRef   = useRef<HTMLInputElement>(null)
  const typeDescRef   = useRef<HTMLInputElement>(null)
  const typeOrderRef  = useRef<HTMLInputElement>(null)
  const typeStatusRef = useRef<HTMLSelectElement>(null)

  const catTypeRef = useRef<HTMLSelectElement>(null)
  const nameRef    = useRef<HTMLInputElement>(null)
  const descRef    = useRef<HTMLTextAreaElement>(null)
  const colorRef   = useRef<HTMLInputElement>(null)
  const iconRef    = useRef<HTMLInputElement>(null)
  const prioRef    = useRef<HTMLInputElement>(null)

  const [taskTypes, setTaskTypes]   = useState<TaskType[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [editingType, setEditingType] = useState<TaskType | null>(null)
  const [editing, setEditing]       = useState<TaskCategory | null>(null)

  useEffect(() => {
    api.fetchTaskTypes().then(d => d && setTaskTypes(d))
    api.fetchTaskCategories().then(d => d && setCategories(d))
  }, [])

  const clearTypeFields = () => {
    if (typeNameRef.current)   typeNameRef.current.value = ''
    if (typeDescRef.current)   typeDescRef.current.value = ''
    if (typeOrderRef.current)  typeOrderRef.current.value = '0'
    if (typeStatusRef.current) typeStatusRef.current.value = 'active'
    setEditingType(null)
  }

  const handleSaveType = async () => {
    const name = typeNameRef.current?.value.trim() ?? ''
    if (!name) { showToast('<i class="ph ph-warning"></i> Task type name is required!', '#dc2626'); return }
    const payload: Partial<TaskType> = {
      name,
      description: typeDescRef.current?.value.trim() || undefined,
      order: typeOrderRef.current?.value ? parseInt(typeOrderRef.current.value) : 0,
      status: (typeStatusRef.current?.value as 'active' | 'inactive') || 'active',
    }
    if (editingType) {
      const updated = await api.updateTaskType(editingType.id, payload)
      if (updated) {
        setTaskTypes(prev => prev.map(t => t.id === editingType.id ? { ...t, ...updated } : t))
        showToast('<i class="ph ph-check-circle"></i> Task type updated!', '#138808')
      }
    } else {
      const created = await api.createTaskType(payload)
      if (created) {
        setTaskTypes(prev => [...prev, created].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)))
        showToast('<i class="ph ph-check-circle"></i> Task type saved!', '#138808')
      }
    }
    clearTypeFields()
  }

  const handleEditType = (id: string) => {
    const t = taskTypes.find(x => String(x.id) === id)
    if (!t) return
    setEditingType(t)
    if (typeNameRef.current)   typeNameRef.current.value = t.name
    if (typeDescRef.current)   typeDescRef.current.value = t.description || ''
    if (typeOrderRef.current)  typeOrderRef.current.value = String(t.order ?? 0)
    if (typeStatusRef.current) typeStatusRef.current.value = t.status || 'active'
  }

  const handleDeleteType = (id: string) => {
    const t = taskTypes.find(x => String(x.id) === id)
    if (!t || !window.confirm('Delete this task type?')) return
    api.deleteTaskType(t.id).then(ok => {
      if (ok) {
        setTaskTypes(prev => prev.filter(x => x.id !== t.id))
        setCategories(prev => prev.filter(c => c.task_type !== t.id))
        showToast('<i class="ph ph-trash"></i> Task type deleted.', '#dc2626')
      }
    })
  }

  const clearFields = () => {
    if (catTypeRef.current) catTypeRef.current.value = ''
    ;[nameRef, colorRef, iconRef, prioRef].forEach(r => { if (r.current) r.current.value = '' })
    if (descRef.current) descRef.current.value = ''
    setEditing(null)
  }

  const handleSave = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    if (!name) { showToast('<i class="ph ph-warning"></i> Category name is required!', '#dc2626'); return }
    const taskTypeId = catTypeRef.current?.value ? Number(catTypeRef.current.value) : null
    const payload: Partial<TaskCategory> = {
      task_type: taskTypeId,
      name,
      description: descRef.current?.value.trim() || undefined,
      color:    colorRef.current?.value.trim() || undefined,
      icon:     iconRef.current?.value.trim()  || undefined,
      priority: prioRef.current?.value ? parseInt(prioRef.current.value) : 0,
    }
    if (editing) {
      const updated = await api.updateTaskCategory(editing.id, payload)
      if (updated) {
        setCategories(prev => prev.map(c => c.id === editing.id ? { ...c, ...updated } : c))
        showToast('<i class="ph ph-check-circle"></i> Category updated!', '#138808')
      }
      clearFields()
    } else {
      const created = await api.createTaskCategory(payload)
      if (created) {
        setCategories(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Category saved!', '#138808')
      }
      clearFields()
    }
  }

  const handleEdit = (id: string) => {
    const c = categories.find(c => String(c.id) === id)
    if (!c) return
    setEditing(c)
    if (nameRef.current)  nameRef.current.value  = c.name
    if (descRef.current)  descRef.current.value  = c.description || ''
    if (colorRef.current) colorRef.current.value = c.color || ''
    if (iconRef.current)  iconRef.current.value  = c.icon  || ''
    if (prioRef.current)  prioRef.current.value  = String(c.priority ?? 0)
    if (catTypeRef.current) catTypeRef.current.value = c.task_type ? String(c.task_type) : ''
  }

  const handleDelete = (id: string) => {
    const c = categories.find(c => String(c.id) === id)
    if (!c || !window.confirm('Delete this category?')) return
    api.deleteTaskCategory(c.id).then(ok => {
      if (ok) {
        setCategories(prev => prev.filter(x => x.id !== c.id))
        showToast('<i class="ph ph-trash"></i> Category deleted.', '#dc2626')
      }
    })
  }

  const typeRecs: MasterRecord[] = taskTypes.map(t => ({
    id: String(t.id),
    key: t.name,
    meta: [`Order ${t.order ?? 0}`, (t.status || 'active').toUpperCase()].join(' · '),
    extra: {
      Status: t.status || 'active',
      Description: t.description || '',
    },
    backendId: t.id,
  }))

  const recs: MasterRecord[] = categories.map(c => ({
    id:       String(c.id),
    key:      c.name,
    meta:     [c.task_type_name, c.description, c.color].filter(Boolean).join(' · '),
    extra: {
      'Task Type': c.task_type_name || '',
      'Color': c.color || '',
      'Icon': c.icon || '',
      'Priority': c.priority != null ? String(c.priority) : '',
      'Description': c.description || '',
    },
    backendId: c.id,
  }))

  return (
    <div className="space-y-5 page-enter">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FormSection
          title={editingType ? 'Edit Task Type' : 'Add Task Type'}
          icon="ph ph-list-checks"
          badge={editingType ? (
            <button onClick={clearTypeFields} className="text-[9px] text-saffron border border-saffron/40 px-2 py-[2px] rounded hover:bg-saffron hover:text-navy">
              + New
            </button>
          ) : undefined}
        >
          <FormRow cols={2}>
            <FormGroup label="Task Type Name" required>
              <input ref={typeNameRef} className={inputCls} placeholder="e.g. Outreach" />
            </FormGroup>
            <FormGroup label="Display Order">
              <input ref={typeOrderRef} type="number" className={inputCls} placeholder="0" defaultValue="0" min="0" />
            </FormGroup>
          </FormRow>
          <FormRow cols={2}>
            <FormGroup label="Status">
              <select ref={typeStatusRef} className={selectCls} defaultValue="active">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormGroup>
            <FormGroup label="Description">
              <input ref={typeDescRef} className={inputCls} placeholder="Optional description" />
            </FormGroup>
          </FormRow>
          <FormActions
            onSave={handleSaveType}
            onClear={clearTypeFields}
            saveLabel={editingType ? 'Update Task Type' : 'Save Task Type'}
            isEditing={!!editingType}
          />
        </FormSection>

        <FormSection title="Task Types" icon="ph ph-list-bullets" badge={
          <span className="text-[9px] font-bold text-white/70">{taskTypes.length} task types</span>
        }>
          <MasterListCard
            title="Task Types"
            icon="ph ph-list-checks"
            records={typeRecs}
            onEdit={handleEditType}
            onDelete={handleDeleteType}
          />
        </FormSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FormSection
          title={editing ? 'Edit Task Category' : 'Add Task Category'}
          icon="ph ph-tag"
          badge={editing ? (
            <button onClick={clearFields} className="text-[9px] text-saffron border border-saffron/40 px-2 py-[2px] rounded hover:bg-saffron hover:text-navy">
              + New
            </button>
          ) : undefined}
        >
          <FormRow cols={2}>
            <FormGroup label="Task Type">
              <select ref={catTypeRef} className={selectCls}>
                <option value="">Select Task Type</option>
                {taskTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Category Name" required>
              <input ref={nameRef} className={inputCls} placeholder="e.g. Logistics" />
            </FormGroup>
          </FormRow>
          <FormRow cols={2}>
            <FormGroup label="Priority (lower = first)">
              <input ref={prioRef} type="number" className={inputCls} placeholder="0" defaultValue="0" min="0" />
            </FormGroup>
            <FormGroup label="Colour (hex)">
              <input ref={colorRef} className={inputCls} placeholder="#FF9933" maxLength={7} />
            </FormGroup>
          </FormRow>
          <FormRow cols={2}>
            <FormGroup label="Icon (Phosphor class)">
              <input ref={iconRef} className={inputCls} placeholder="ph-truck" />
            </FormGroup>
            <FormGroup label="Description">
              <textarea ref={descRef} className={textareaCls} placeholder="Short description..." />
            </FormGroup>
          </FormRow>
          <FormActions
            onSave={handleSave}
            onClear={clearFields}
            saveLabel={editing ? 'Update Category' : 'Save Category'}
            isEditing={!!editing}
          />
        </FormSection>

        <FormSection title="Task Categories" icon="ph ph-list-bullets" badge={
          <span className="text-[9px] font-bold text-white/70">{categories.length} categories</span>
        }>
          <MasterListCard
            title="Task Categories"
            icon="ph ph-tag"
            records={recs}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </FormSection>
      </div>
    </div>
  )
}

/* ── CAMPAIGN ACTIVITY TYPE MASTER ──────────────────────────────────── */
export function CampaignActivityTypeMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef      = useRef<HTMLInputElement>(null)
  const descRef      = useRef<HTMLTextAreaElement>(null)
  const orderRef     = useRef<HTMLInputElement>(null)
  const [activityTypes, setActivityTypes] = useState<CampaignActivityType[]>([])
  const [editing, setEditing]             = useState<CampaignActivityType | null>(null)

  useEffect(() => {
    api.fetchCampaignActivityTypes().then(d => d && setActivityTypes(d))
  }, [])

  const clearFields = () => {
    if (nameRef.current)      nameRef.current.value      = ''
    if (descRef.current)      descRef.current.value      = ''
    if (orderRef.current)     orderRef.current.value     = '0'
    setEditing(null)
  }

  const handleSave = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    if (!name) { showToast('<i class="ph ph-warning"></i> Activity name is required!', '#dc2626'); return }
    const payload: Partial<CampaignActivityType> = {
      name,
      description: descRef.current?.value.trim() || undefined,
      order:       orderRef.current?.value ? parseInt(orderRef.current.value) : 0,
      is_active:   true,
    }
    if (editing) {
      const updated = await api.updateCampaignActivityType(editing.id, payload)
      if (updated) {
        setActivityTypes(prev => prev.map(a => a.id === editing.id ? { ...a, ...updated } : a))
        showToast('<i class="ph ph-check-circle"></i> Activity type updated!', '#138808')
      }
      clearFields()
    } else {
      const created = await api.createCampaignActivityType(payload)
      if (created) {
        setActivityTypes(prev => [...prev, created].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)))
        showToast('<i class="ph ph-check-circle"></i> Activity type saved!', '#138808')
      }
      clearFields()
    }
  }

  const handleEdit = (id: string) => {
    const a = activityTypes.find(a => String(a.id) === id)
    if (!a) return
    setEditing(a)
    if (nameRef.current)      nameRef.current.value      = a.name
    if (descRef.current)      descRef.current.value      = a.description || ''
    if (orderRef.current)     orderRef.current.value     = String(a.order)
  }

  const handleDelete = (id: string) => {
    const a = activityTypes.find(a => String(a.id) === id)
    if (!a || !window.confirm('Delete this activity type?')) return
    api.deleteCampaignActivityType(a.id).then(ok => {
      if (ok) {
        setActivityTypes(prev => prev.filter(x => x.id !== a.id))
        showToast('<i class="ph ph-trash"></i> Activity type deleted.', '#dc2626')
      }
    })
  }

  const recs: MasterRecord[] = activityTypes.map(a => ({
    id:        String(a.id),
    key:       a.name,
    meta:      a.description || '',
    extra:     { description: a.description || '' },
    backendId: a.id,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection
        title={editing ? 'Edit Activity Type' : 'Add Campaign Activity Type'}
        icon="ph ph-megaphone"
        badge={editing ? (
          <button onClick={clearFields} className="text-[9px] text-saffron border border-saffron/40 px-2 py-[2px] rounded hover:bg-saffron hover:text-navy">
            + New
          </button>
        ) : undefined}
      >
        <FormRow cols={1}>
          <FormGroup label="Activity Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Door-to-door Visit" />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Display Order">
            <input ref={orderRef} type="number" className={inputCls} placeholder="0" defaultValue="0" min="0" />
          </FormGroup>
          <FormGroup label="Description">
            <input ref={descRef as any} className={inputCls} placeholder="Optional description" />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={clearFields}
          saveLabel={editing ? 'Update' : 'Save Activity Type'}
          isEditing={!!editing}
        />
      </FormSection>

      <FormSection title="Campaign Activity Types" icon="ph ph-list-bullets" badge={
        <span className="text-[9px] font-bold text-white/70">{activityTypes.length} types</span>
      }>
        <MasterListCard
          title="Campaign Activity Types"
          icon="ph ph-megaphone"
          records={recs}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </FormSection>
    </div>
  )
}

/* ── VOLUNTEER ROLE MASTER ───────────────────────────────────────────── */
export function VolunteerRoleMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef  = useRef<HTMLInputElement>(null)
  const descRef  = useRef<HTMLInputElement>(null)
  const orderRef = useRef<HTMLInputElement>(null)
  const [roles, setRoles]     = useState<VolunteerRole[]>([])
  const [editing, setEditing] = useState<VolunteerRole | null>(null)

  useEffect(() => {
    api.fetchVolunteerRoles().then(d => d && setRoles(d))
  }, [])

  const clearFields = () => {
    if (nameRef.current)  nameRef.current.value  = ''
    if (descRef.current)  descRef.current.value  = ''
    if (orderRef.current) orderRef.current.value = '0'
    setEditing(null)
  }

  const handleSave = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    if (!name) { showToast('<i class="ph ph-warning"></i> Role name is required!', '#dc2626'); return }
    const payload: Partial<VolunteerRole> = {
      name,
      description: descRef.current?.value.trim() || undefined,
      order: orderRef.current?.value ? parseInt(orderRef.current.value) : 0,
    }
    if (editing) {
      const updated = await api.updateVolunteerRole(editing.id, payload)
      if (updated) {
        setRoles(prev => prev.map(r => r.id === editing.id ? { ...r, ...updated } : r))
        showToast('<i class="ph ph-check-circle"></i> Role updated!', '#138808')
      }
      clearFields()
    } else {
      const created = await api.createVolunteerRole(payload)
      if (created) {
        setRoles(prev => [...prev, created].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)))
        showToast('<i class="ph ph-check-circle"></i> Role saved!', '#138808')
      }
      clearFields()
    }
  }

  const handleEdit = (id: string) => {
    const role = roles.find(r => String(r.id) === id)
    if (!role) return
    setEditing(role)
    if (nameRef.current)  nameRef.current.value  = role.name
    if (descRef.current)  descRef.current.value  = role.description || ''
    if (orderRef.current) orderRef.current.value = String(role.order)
  }

  const handleDelete = (id: string) => {
    const role = roles.find(r => String(r.id) === id)
    if (!role || !window.confirm('Delete this volunteer role?')) return
    api.deleteVolunteerRole(role.id).then(ok => {
      if (ok) {
        setRoles(prev => prev.filter(r => r.id !== role.id))
        showToast('<i class="ph ph-trash"></i> Role deleted.', '#dc2626')
      }
    })
  }

  const recs: MasterRecord[] = roles.map(r => ({
    id:        String(r.id),
    key:       r.name,
    meta:      r.description || '',
    backendId: r.id,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection
        title={editing ? 'Edit Volunteer Role' : 'Add Volunteer Role'}
        icon="ph ph-identification-badge"
        badge={editing ? (
          <button onClick={clearFields} className="text-[9px] text-saffron border border-saffron/40 px-2 py-[2px] rounded hover:bg-saffron hover:text-navy">
            + New
          </button>
        ) : undefined}
      >
        <FormRow cols={2}>
          <FormGroup label="Role Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Booth Agent" />
          </FormGroup>
          <FormGroup label="Display Order">
            <input ref={orderRef} type="number" className={inputCls} placeholder="0" defaultValue="0" min="0" />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Description">
            <input ref={descRef} className={inputCls} placeholder="Optional description" />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={clearFields}
          saveLabel={editing ? 'Update Role' : 'Save Role'}
          isEditing={!!editing}
        />
      </FormSection>

      <FormSection title="Volunteer Roles" icon="ph ph-list-bullets" badge={
        <span className="text-[9px] font-bold text-white/70">{roles.length} roles</span>
      }>
        <MasterListCard
          title="Volunteer Roles"
          icon="ph ph-identification-badge"
          records={recs}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </FormSection>
    </div>
  )
}

/* ── VOLUNTEER TYPE MASTER ───────────────────────────────────────────── */
export function VolunteerTypeMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef  = useRef<HTMLInputElement>(null)
  const descRef  = useRef<HTMLInputElement>(null)
  const orderRef = useRef<HTMLInputElement>(null)
  const [types, setTypes]     = useState<VolunteerType[]>([])
  const [editing, setEditing] = useState<VolunteerType | null>(null)

  useEffect(() => {
    api.fetchVolunteerTypes().then(d => d && setTypes(d))
  }, [])

  const clearFields = () => {
    if (nameRef.current)  nameRef.current.value  = ''
    if (descRef.current)  descRef.current.value  = ''
    if (orderRef.current) orderRef.current.value = '0'
    setEditing(null)
  }

  const handleSave = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    if (!name) { showToast('<i class="ph ph-warning"></i> Type name is required!', '#dc2626'); return }
    const payload: Partial<VolunteerType> = {
      name,
      description: descRef.current?.value.trim() || undefined,
      order: orderRef.current?.value ? parseInt(orderRef.current.value) : 0,
    }
    if (editing) {
      const updated = await api.updateVolunteerType(editing.id, payload)
      if (updated) {
        setTypes(prev => prev.map(t => t.id === editing.id ? { ...t, ...updated } : t))
        showToast('<i class="ph ph-check-circle"></i> Type updated!', '#138808')
      }
      clearFields()
    } else {
      const created = await api.createVolunteerType(payload)
      if (created) {
        setTypes(prev => [...prev, created].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)))
        showToast('<i class="ph ph-check-circle"></i> Type saved!', '#138808')
      }
      clearFields()
    }
  }

  const handleEdit = (id: string) => {
    const t = types.find(t => String(t.id) === id)
    if (!t) return
    setEditing(t)
    if (nameRef.current)  nameRef.current.value  = t.name
    if (descRef.current)  descRef.current.value  = t.description || ''
    if (orderRef.current) orderRef.current.value = String(t.order)
  }

  const handleDelete = (id: string) => {
    const t = types.find(t => String(t.id) === id)
    if (!t || !window.confirm('Delete this volunteer type?')) return
    api.deleteVolunteerType(t.id).then(ok => {
      if (ok) {
        setTypes(prev => prev.filter(x => x.id !== t.id))
        showToast('<i class="ph ph-trash"></i> Type deleted.', '#dc2626')
      }
    })
  }

  const recs: MasterRecord[] = types.map(t => ({
    id:        String(t.id),
    key:       t.name,
    meta:      t.description || '',
    backendId: t.id,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection
        title={editing ? 'Edit Volunteer Type' : 'Add Volunteer Type'}
        icon="ph ph-tag"
        badge={editing ? (
          <button onClick={clearFields} className="text-[9px] text-saffron border border-saffron/40 px-2 py-[2px] rounded hover:bg-saffron hover:text-navy">
            + New
          </button>
        ) : undefined}
      >
        <FormRow cols={2}>
          <FormGroup label="Type Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Paid Volunteer" />
          </FormGroup>
          <FormGroup label="Display Order">
            <input ref={orderRef} type="number" className={inputCls} placeholder="0" defaultValue="0" min="0" />
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Description">
            <input ref={descRef} className={inputCls} placeholder="Optional description" />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={clearFields}
          saveLabel={editing ? 'Update Type' : 'Save Type'}
          isEditing={!!editing}
        />
      </FormSection>

      <FormSection title="Volunteer Types" icon="ph ph-list-bullets" badge={
        <span className="text-[9px] font-bold text-white/70">{types.length} types</span>
      }>
        <MasterListCard
          title="Volunteer Types"
          icon="ph ph-tag"
          records={recs}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </FormSection>
    </div>
  )
}

/* ── PANCHAYAT MASTER ───────────────────────────────────────────── */
export function PanchayatMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef     = useRef<HTMLInputElement>(null)
  const codeRef     = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const unionRef    = useRef<HTMLSelectElement>(null)
  const descRef     = useRef<HTMLTextAreaElement>(null)
  const [panchayats, setPanchayats] = useState<Panchayat[]>([])
  const [unions,     setUnions]     = useState<Union[]>([])
  const [editing, setEditing]       = useState<Panchayat | null>(null)

  useEffect(() => {
    api.fetchPanchayats().then(d => d && setPanchayats(d))
    api.fetchUnions().then(d => d && setUnions(d))
  }, [])

  const clearFields = () => {
    if (nameRef.current)     nameRef.current.value     = ''
    if (codeRef.current)     codeRef.current.value     = ''
    if (categoryRef.current) categoryRef.current.value = ''
    if (unionRef.current)    unionRef.current.value    = ''
    if (descRef.current)     descRef.current.value     = ''
    setEditing(null)
  }

  const handleSave = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    if (!name) { showToast('<i class="ph ph-warning"></i> Name is required!', '#dc2626'); return }
    const unionId = unionRef.current?.value ? Number(unionRef.current.value) : null
    const payload: Partial<Panchayat> = {
      name,
      code:        codeRef.current?.value.trim()  || undefined,
      category:    categoryRef.current?.value      || undefined,
      union:       unionId,
      description: descRef.current?.value.trim()  || undefined,
    }
    if (editing) {
      const updated = await api.updatePanchayat(editing.id, payload)
      if (updated) {
        const u = unions.find(x => x.id === unionId)
        setPanchayats(prev => prev.map(p => p.id === editing.id ? { ...p, ...updated, union_name: u?.name } : p))
        showToast('<i class="ph ph-check-circle"></i> Panchayat updated!', '#138808')
      }
      clearFields()
    } else {
      const created = await api.createPanchayat(payload)
      if (created) {
        const u = unions.find(x => x.id === unionId)
        setPanchayats(prev => [...prev, { ...created, union_name: u?.name }])
        showToast('<i class="ph ph-check-circle"></i> Panchayat saved!', '#138808')
      }
      clearFields()
    }
  }

  const handleEdit = (id: string) => {
    const p = panchayats.find(x => String(x.id) === id)
    if (!p) return
    setEditing(p)
    if (nameRef.current)     nameRef.current.value     = p.name
    if (codeRef.current)     codeRef.current.value     = p.code     || ''
    if (categoryRef.current) categoryRef.current.value = p.category || ''
    if (unionRef.current)    unionRef.current.value    = p.union ? String(p.union) : ''
    if (descRef.current)     descRef.current.value     = p.description || ''
  }

  const handleDelete = (id: string) => {
    const p = panchayats.find(x => String(x.id) === id)
    if (!p || !window.confirm('Delete this panchayat?')) return
    api.deletePanchayat(p.id).then(ok => {
      if (ok) {
        setPanchayats(prev => prev.filter(x => x.id !== p.id))
        showToast('<i class="ph ph-trash"></i> Panchayat deleted.', '#dc2626')
      }
    })
  }

  const CATEGORY_LABEL: Record<string, string> = {
    village_panchayat: 'Village Panchayat',
    town_panchayat:    'Town Panchayat',
  }

  const recs: MasterRecord[] = panchayats.map(p => ({
    id:        String(p.id),
    key:       p.name,
    meta:      [p.union_name, p.category ? CATEGORY_LABEL[p.category] : ''].filter(Boolean).join(' · '),
    extra:     { Code: p.code || '', Union: p.union_name || '', Category: p.category ? CATEGORY_LABEL[p.category] : '', Description: p.description || '' },
    backendId: p.id,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection
        title={editing ? 'Edit Panchayat' : 'Add Panchayat'}
        icon="ph ph-tree-structure"
        badge={editing ? (
          <button onClick={clearFields} className="text-[9px] text-saffron border border-saffron/40 px-2 py-[2px] rounded hover:bg-saffron hover:text-navy">
            + New
          </button>
        ) : undefined}
      >
        <FormRow cols={2}>
          <FormGroup label="Panchayat Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Ariyur Panchayat" />
          </FormGroup>
          <FormGroup label="Code">
            <input ref={codeRef} className={inputCls} placeholder="e.g. P001" maxLength={20} />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Union">
            <select ref={unionRef} className={selectCls}>
              <option value="">Select Union</option>
              {unions.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Category">
            <select ref={categoryRef} className={selectCls}>
              <option value="">Select Category</option>
              <option value="village_panchayat">Village Panchayat</option>
              <option value="town_panchayat">Town Panchayat</option>
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Description">
            <textarea ref={descRef} className={textareaCls} placeholder="Optional description..." />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={clearFields}
          saveLabel={editing ? 'Update Panchayat' : 'Save Panchayat'}
          isEditing={!!editing}
        />
      </FormSection>

      <FormSection title="Panchayats" icon="ph ph-list-bullets" badge={
        <span className="text-[9px] font-bold text-white/70">{panchayats.length} panchayats</span>
      }>
        <MasterListCard
          title="Panchayats"
          icon="ph ph-tree-structure"
          records={recs}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </FormSection>
    </div>
  )
}

/* ── UNION MASTER ───────────────────────────────────────────────── */
export function UnionMaster() {
  const api = useMasterAPI()
  const { showToast } = useToast()
  const nameRef  = useRef<HTMLInputElement>(null)
  const codeRef  = useRef<HTMLInputElement>(null)
  const blockRef = useRef<HTMLSelectElement>(null)
  const descRef  = useRef<HTMLTextAreaElement>(null)
  const [unions,   setUnions]   = useState<Union[]>([])
  const [blocks,   setBlocks]   = useState<Area[]>([])
  const [editing,  setEditing]  = useState<Union | null>(null)
  const [blockFilter, setBlockFilter] = useState('')

  useEffect(() => {
    api.fetchUnions().then(d => d && setUnions(d))
    api.fetchAreas().then(d => d && setBlocks(d))
  }, [])

  const clearFields = () => {
    if (nameRef.current)  nameRef.current.value  = ''
    if (codeRef.current)  codeRef.current.value  = ''
    if (blockRef.current) blockRef.current.value = ''
    if (descRef.current)  descRef.current.value  = ''
    setBlockFilter('')
    setEditing(null)
  }

  const handleSave = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    if (!name) { showToast('<i class="ph ph-warning"></i> Name is required!', '#dc2626'); return }
    const blockId = blockRef.current?.value ? Number(blockRef.current.value) : null
    const payload: Partial<Union> = {
      name,
      code:        codeRef.current?.value.trim()  || undefined,
      block:       blockId,
      description: descRef.current?.value.trim()  || undefined,
    }
    if (editing) {
      const updated = await api.updateUnion(editing.id, payload)
      if (updated) {
        const blk = blocks.find(b => b.id === blockId)
        setUnions(prev => prev.map(u => u.id === editing.id ? { ...u, ...updated, block_name: blk?.name } : u))
        showToast('<i class="ph ph-check-circle"></i> Union updated!', '#138808')
      }
      clearFields()
    } else {
      const created = await api.createUnion(payload)
      if (created) {
        const blk = blocks.find(b => b.id === blockId)
        setUnions(prev => [...prev, { ...created, block_name: blk?.name }])
        showToast('<i class="ph ph-check-circle"></i> Union saved!', '#138808')
      }
      clearFields()
    }
  }

  const handleEdit = (id: string) => {
    const u = unions.find(x => String(x.id) === id)
    if (!u) return
    setEditing(u)
    if (nameRef.current)  nameRef.current.value  = u.name
    if (codeRef.current)  codeRef.current.value  = u.code     || ''
    if (blockRef.current) blockRef.current.value = u.block ? String(u.block) : ''
    if (descRef.current)  descRef.current.value  = u.description || ''
    setBlockFilter(u.block ? String(u.block) : '')
  }

  const handleDelete = (id: string) => {
    const u = unions.find(x => String(x.id) === id)
    if (!u || !window.confirm('Delete this union?')) return
    api.deleteUnion(u.id).then(ok => {
      if (ok) {
        setUnions(prev => prev.filter(x => x.id !== u.id))
        showToast('<i class="ph ph-trash"></i> Union deleted.', '#dc2626')
      }
    })
  }

  const filtered = blockFilter ? unions.filter(u => String(u.block) === blockFilter) : unions

  const recs: MasterRecord[] = filtered.map(u => ({
    id:        String(u.id),
    key:       u.name,
    meta:      u.block_name || '',
    extra:     { Code: u.code || '', Block: u.block_name || '', Description: u.description || '' },
    backendId: u.id,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection
        title={editing ? 'Edit Union' : 'Add Union'}
        icon="ph ph-buildings"
        badge={editing ? (
          <button onClick={clearFields} className="text-[9px] text-saffron border border-saffron/40 px-2 py-[2px] rounded hover:bg-saffron hover:text-navy">
            + New
          </button>
        ) : undefined}
      >
        <FormRow cols={2}>
          <FormGroup label="Union Name" required>
            <input ref={nameRef} className={inputCls} placeholder="e.g. Erode Union" />
          </FormGroup>
          <FormGroup label="Code">
            <input ref={codeRef} className={inputCls} placeholder="e.g. U001" maxLength={20} />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Block">
            <select ref={blockRef} className={selectCls}>
              <option value="">Select Block</option>
              {blocks.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Description">
            <textarea ref={descRef} className={textareaCls} placeholder="Optional description..." />
          </FormGroup>
        </FormRow>
        <FormActions
          onSave={handleSave}
          onClear={clearFields}
          saveLabel={editing ? 'Update Union' : 'Save Union'}
          isEditing={!!editing}
        />
      </FormSection>

      <FormSection title="Unions" icon="ph ph-list-bullets" badge={
        <span className="text-[9px] font-bold text-white/70">{filtered.length} unions</span>
      }>
        <div className="px-4 pt-3">
          <select
            className={selectCls}
            value={blockFilter}
            onChange={e => setBlockFilter(e.target.value)}
          >
            <option value="">All Blocks</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <MasterListCard
          title="Unions"
          icon="ph ph-buildings"
          records={recs}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </FormSection>
    </div>
  )
}
