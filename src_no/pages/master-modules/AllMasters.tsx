import React, { useRef, useState } from 'react'
import { useMasterModule } from '../../hooks/useMasterModule'
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

/* ── AREA MASTER ──────────────────────────────────────────────────── */
export function AreaMaster() {
  const m = useMasterModule('area')
  const name = useRef<HTMLInputElement>(null)
  const sub  = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<{id:string;key:string}|null>(null)

  const handleSave = () => {
    const k = name.current?.value.trim() ?? ''
    const s = sub.current?.value.trim() ?? ''
    if (!k) return
    if (editing) { m.updateRecord(editing.id, k, s||undefined); setEditing(null) }
    else m.addRecord(k, s||undefined)
    if (name.current) name.current.value = ''
    if (sub.current) sub.current.value = ''
  }
  const handleEdit = (id: string, key: string) => {
    setEditing({id, key})
    const rec = m.records.find(r => r.id === id)
    if (name.current) name.current.value = key
    if (sub.current && rec?.meta) sub.current.value = rec.meta
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Area Master" icon="ph ph-map-pin-area">
        <FormRow cols={1}>
          <FormGroup label="Area Name" required><input ref={name} className={inputCls} placeholder="e.g. Modakkurichi" /></FormGroup>
        </FormRow>
        <FormRow cols={1}>
          <FormGroup label="Details"><input ref={sub} className={inputCls} placeholder="Booths, Voters info" /></FormGroup>
        </FormRow>
        <FormActions onSave={handleSave} onClear={() => { if(name.current) name.current.value=''; if(sub.current) sub.current.value=''; setEditing(null) }} saveLabel="Save Area" isEditing={!!editing} />
      </FormSection>
      <MasterListCard title="Areas" icon="ph ph-list" records={m.records} onEdit={handleEdit} onDelete={m.deleteRecord} />
    </div>
  )
}

/* ── BOOTH MASTER ─────────────────────────────────────────────────── */
export function BoothMaster() {
  const m = useMasterModule('booth')
  const num = useRef<HTMLInputElement>(null)
  const area = useRef<HTMLSelectElement>(null)
  const [editing, setEditing] = useState<{id:string}|null>(null)

  const handleSave = () => {
    const k = num.current?.value.trim() ?? ''
    const a = area.current?.value.trim() ?? ''
    if (!k) return
    const meta = a ? `Area: ${a}` : undefined
    if (editing) { m.updateRecord(editing.id, `Booth ${k}`, meta); setEditing(null) }
    else m.addRecord(`Booth ${k}`, meta)
    if (num.current) num.current.value = ''
    if (area.current) area.current.value = ''
  }
  const handleEdit = (id: string, key: string) => {
    setEditing({ id })
    if (num.current) num.current.value = key.replace('Booth ', '')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Booth Master" icon="ph ph-map-pin">
        <FormRow cols={2}>
          <FormGroup label="Booth No." required><input ref={num} className={inputCls} placeholder="001" /></FormGroup>
          <FormGroup label="Area"><select ref={area} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
        </FormRow>
        <FormActions onSave={handleSave} onClear={() => { if(num.current) num.current.value=''; if(area.current) area.current.value=''; setEditing(null) }} saveLabel="Save Booth" isEditing={!!editing} />
      </FormSection>
      <MasterListCard title="Booths" icon="ph ph-list" records={m.records} onEdit={handleEdit} onDelete={m.deleteRecord} />
    </div>
  )
}

/* ── VILLAGE MASTER ───────────────────────────────────────────────── */
export function VillageMaster() {
  const m = useMasterModule('village')
  const name = useRef<HTMLInputElement>(null)
  const area = useRef<HTMLSelectElement>(null)
  const booth = useRef<HTMLInputElement>(null)
  const panchayat = useRef<HTMLInputElement>(null)
  const pin = useRef<HTMLInputElement>(null)
  const type = useRef<HTMLSelectElement>(null)
  const [editing, setEditing] = useState<{id:string}|null>(null)

  const handleSave = () => {
    const k = name.current?.value.trim() ?? ''
    if (!k) return
    const parts = [area.current?.value, booth.current?.value ? `Booth ${booth.current.value}` : null].filter(Boolean)
    if (editing) { m.updateRecord(editing.id, k, parts.join(' · ')||undefined); setEditing(null) }
    else m.addRecord(k, parts.join(' · ')||undefined)
    ;[name, booth, panchayat, pin].forEach(ref => { if(ref.current) ref.current.value='' })
    if(area.current) area.current.value=''; if(type.current) type.current.value='Village'
  }
  const handleEdit = (id: string, key: string) => {
    setEditing({ id }); if(name.current) name.current.value = key
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Village / Ward Master" icon="ph ph-house">
        <FormRow cols={3}>
          <FormGroup label="Village / Ward Name" required><input ref={name} className={inputCls} placeholder="Village name" /></FormGroup>
          <FormGroup label="Area" required><select ref={area} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
          <FormGroup label="Booth No."><input ref={booth} className={inputCls} placeholder="Linked booth no." /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Panchayat / ULB"><input ref={panchayat} className={inputCls} placeholder="Panchayat name" /></FormGroup>
          <FormGroup label="Pincode"><input ref={pin} className={inputCls} placeholder="638001" /></FormGroup>
          <FormGroup label="Type"><select ref={type} className={selectCls}><option>Village</option><option>Town Ward</option><option>Urban Ward</option><option>Colony</option><option>Street</option></select></FormGroup>
        </FormRow>
        <FormActions onSave={handleSave} onClear={() => { ;[name,booth,panchayat,pin].forEach(ref=>{ if(ref.current) ref.current.value='' }); setEditing(null) }} saveLabel="Save Village" isEditing={!!editing} />
      </FormSection>
      <MasterListCard title="Villages / Wards" icon="ph ph-list" records={m.records} onEdit={handleEdit} onDelete={m.deleteRecord} />
    </div>
  )
}

/* ── SCHEME MASTER ────────────────────────────────────────────────── */
export function SchemeMaster() {
  const m = useMasterModule('scheme')
  const name = useRef<HTMLInputElement>(null)
  const short = useRef<HTMLInputElement>(null)
  const dept = useRef<HTMLInputElement>(null)
  const stype = useRef<HTMLSelectElement>(null)
  const target = useRef<HTMLInputElement>(null)
  const benefit = useRef<HTMLInputElement>(null)
  const status = useRef<HTMLSelectElement>(null)
  const desc = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState<{id:string}|null>(null)

  const handleSave = () => {
    const k = name.current?.value.trim() ?? ''
    if (!k) return
    const parts = [stype.current?.value, target.current?.value].filter(Boolean)
    if (editing) { m.updateRecord(editing.id, k, parts.join(' · ')||undefined); setEditing(null) }
    else m.addRecord(k, parts.join(' · ')||undefined)
    ;[name,short,dept,target,benefit,desc].forEach(ref=>{ if(ref.current) ref.current.value='' })
  }
  const handleEdit = (id: string, key: string) => { setEditing({id}); if(name.current) name.current.value=key }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Scheme / Programme Master" icon="ph ph-file-text">
        <FormRow cols={2}>
          <FormGroup label="Scheme Name" required><input ref={name} className={inputCls} placeholder="e.g. PM Awas Yojana" /></FormGroup>
          <FormGroup label="Short Name"><input ref={short} className={inputCls} placeholder="e.g. PMAY" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Ministry / Department"><input ref={dept} className={inputCls} placeholder="e.g. Ministry of Housing" /></FormGroup>
          <FormGroup label="Scheme Type"><select ref={stype} className={selectCls}><option value="">Select</option><option>Central Scheme</option><option>State Scheme</option><option>Arram Trust Activity</option><option>Party Initiative</option></select></FormGroup>
          <FormGroup label="Target Beneficiary"><input ref={target} className={inputCls} placeholder="e.g. BPL families" /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Key Benefit"><input ref={benefit} className={inputCls} placeholder="e.g. Free pucca house" /></FormGroup>
          <FormGroup label="Status"><select ref={status} className={selectCls}><option>Active</option><option>Discontinued</option></select></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Description"><textarea ref={desc} className={textareaCls} placeholder="Brief description of the scheme..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={() => { ;[name,short,dept,target,benefit,desc].forEach(ref=>{ if(ref.current) ref.current.value='' }); setEditing(null) }} saveLabel="Save Scheme" isEditing={!!editing} />
      </FormSection>
      <MasterListCard title="Schemes" icon="ph ph-list" records={m.records} onEdit={handleEdit} onDelete={m.deleteRecord} />
    </div>
  )
}

/* ── ISSUE MASTER ─────────────────────────────────────────────────── */
export function IssueMaster() {
  const m = useMasterModule('issue')
  const name = useRef<HTMLInputElement>(null)
  const itype = useRef<HTMLSelectElement>(null)
  const priority = useRef<HTMLSelectElement>(null)
  const scheme = useRef<HTMLInputElement>(null)
  const talking = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<{id:string}|null>(null)

  const handleSave = () => {
    const k = name.current?.value.trim() ?? ''
    if (!k) return
    const parts = [itype.current?.value, priority.current?.value].filter(Boolean)
    if (editing) { m.updateRecord(editing.id, k, parts.join(' · ')||undefined); setEditing(null) }
    else m.addRecord(k, parts.join(' · ')||undefined)
    ;[name,scheme,talking].forEach(ref=>{ if(ref.current) ref.current.value='' })
  }
  const handleEdit = (id: string, key: string) => { setEditing({id}); if(name.current) name.current.value=key }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 page-enter">
      <FormSection title="Issues &amp; Categories Master" icon="ph ph-warning">
        <FormRow cols={3}>
          <FormGroup label="Issue / Category Name" required><input ref={name} className={inputCls} placeholder="e.g. Roads / Infrastructure" /></FormGroup>
          <FormGroup label="Category Type"><select ref={itype} className={selectCls}><option value="">Select</option><option>Voter Issue</option><option>Campaign Category</option><option>Grievance Category</option><option>Event Type</option><option>Volunteer Role</option></select></FormGroup>
          <FormGroup label="Priority"><select ref={priority} className={selectCls}><option>High</option><option>Medium</option><option>Low</option></select></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="BJP Scheme Response"><input ref={scheme} className={inputCls} placeholder="Which BJP scheme addresses this?" /></FormGroup>
          <FormGroup label="Campaign Talking Point"><input ref={talking} className={inputCls} placeholder="Key message to voters on this issue" /></FormGroup>
        </FormRow>
        <FormActions onSave={handleSave} onClear={() => { ;[name,scheme,talking].forEach(ref=>{ if(ref.current) ref.current.value='' }); setEditing(null) }} saveLabel="Save Issue" isEditing={!!editing} />
      </FormSection>
      <MasterListCard title="Issues / Categories" icon="ph ph-list" records={m.records} onEdit={handleEdit} onDelete={m.deleteRecord} />
    </div>
  )
}

/* ── CANDIDATE INFO ───────────────────────────────────────────────── */
export function CandidateMaster() {
  const { showToast } = useToast()
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
        <FormActions onSave={() => showToast('<i class="ph ph-check-circle"></i> Candidate info updated!', '#138808')} onClear={() => {}} saveLabel="Save Candidate Info" />
      </FormSection>
    </div>
  )
}

/* ── PARTY DETAILS ────────────────────────────────────────────────── */
export function PartyMaster() {
  const { showToast } = useToast()
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
        <FormActions onSave={() => showToast('<i class="ph ph-check-circle"></i> Party details saved!', '#138808')} onClear={() => {}} saveLabel="Save Party Details" />
      </FormSection>
    </div>
  )
}
