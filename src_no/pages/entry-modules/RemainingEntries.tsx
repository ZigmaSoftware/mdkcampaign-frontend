import React, { useRef } from 'react'
import { useEntryModule } from '../../hooks/useEntryModule'
import EntryListHeader from '../../components/entry/EntryListHeader'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import RecordList from '../../components/entry/RecordList'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'
import { exportRecordsToCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'
import { todayISO, nowDatetimeLocal } from '../../utils/formatters'

/* ── CAMPAIGN ACTIVITY ──────────────────────────────────────────────── */
export function CampaignEntry() {
  const em = useEntryModule('campaign', 'campaign-form')
  const r = {
    type: useRef<HTMLSelectElement>(null), date: useRef<HTMLInputElement>(null),
    time: useRef<HTMLInputElement>(null), block: useRef<HTMLSelectElement>(null),
    location: useRef<HTMLInputElement>(null), team: useRef<HTMLInputElement>(null),
    reach: useRef<HTMLInputElement>(null), material: useRef<HTMLInputElement>(null),
    fav: useRef<HTMLInputElement>(null), outcome: useRef<HTMLSelectElement>(null),
    issues: useRef<HTMLInputElement>(null), followup: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLTextAreaElement>(null),
  }
  const fill = (d: Record<string,string>) => Object.entries(r).forEach(([k,ref]) => { if(ref.current) ref.current.value = d[k]??'' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k,ref]) => [k, ref.current?.value??'']))
  const handleSave = () => {
    const d = collect(); if(!d.type) return
    em.saveRecord(d.type, `${d.date||'—'} · ${d.block||'—'} · ${d.location||''} · Reached: ${d.reach||'0'}`, d); clear()
  }
  const handleEdit = (id: string) => { const rec = em.startEdit(id); if(rec) fill(rec.data) }
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader title="Campaign Activities" icon="ph ph-megaphone" count={em.records.length} onAddNew={em.openForm} addLabel="Add Activity" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search activities..." value={em.searchQuery} onChange={em.setSearch} onExport={() => exportRecordsToCsv(em.records,'Campaign_Activities')} onPrint={() => printModule(em.records,'Campaign Activities')} />
          <RecordList records={em.filtered} editingId={em.editingId} emptyMsg='No campaign activities logged yet. Click "Add Activity" to begin.' icon="ph ph-megaphone" iconBg="#fff3e0" iconColor="#e07010" onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id="campaign-form" title="Campaign Activity" icon="ph ph-megaphone" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Campaign Activity" required><select ref={r.type} className={selectCls}><option value="">Select</option><option>Door-to-door Visit</option><option>Market / Sandhai Outreach</option><option>Labour Site Visit</option><option>Mic Van / Bus Campaign</option><option>WhatsApp / SMS Blast</option><option>Social Media Post</option><option>Pamphlet Distribution</option><option>Wall Painting / Poster</option><option>Banner / Hoarding Setup</option><option>Auto Rickshaw Campaign</option><option>House Meeting (Ghar Sabha)</option><option>Corner Meeting</option><option>Phone Call Campaign</option></select></FormGroup>
          <FormGroup label="Date" required><input ref={r.date} type="date" className={inputCls} defaultValue={todayISO()} /></FormGroup>
          <FormGroup label="Time"><input ref={r.time} type="time" className={inputCls} /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Block" required><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
          <FormGroup label="Village / Ward / Booth"><input ref={r.location} className={inputCls} placeholder="Specific location" /></FormGroup>
          <FormGroup label="Team / Volunteer"><input ref={r.team} className={inputCls} placeholder="Who did this?" /></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Houses / People Reached"><input ref={r.reach} type="number" className={inputCls} placeholder="Count" /></FormGroup>
          <FormGroup label="Materials Used"><input ref={r.material} className={inputCls} placeholder="e.g. 500 pamphlets" /></FormGroup>
          <FormGroup label="Favourable Response"><input ref={r.fav} type="number" className={inputCls} placeholder="Count" /></FormGroup>
          <FormGroup label="Outcome"><select ref={r.outcome} className={selectCls}><option>Successful</option><option>Partial</option><option>Follow-up Needed</option><option>Not Available</option></select></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Key Issues Raised by Voters"><input ref={r.issues} className={inputCls} placeholder="Main issues discussed" /></FormGroup>
          <FormGroup label="Follow-up Action Required"><input ref={r.followup} className={inputCls} placeholder="What needs follow-up?" /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Campaign Notes"><textarea ref={r.notes} className={textareaCls} placeholder="Observations, crowd response, special mentions..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Activity" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}

/* ── USER MANAGEMENT ────────────────────────────────────────────────── */
export function UserEntry() {
  const em = useEntryModule('user', 'user-form')
  const r = {
    name: useRef<HTMLInputElement>(null), username: useRef<HTMLInputElement>(null),
    pass: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null), desig: useRef<HTMLInputElement>(null),
    role: useRef<HTMLSelectElement>(null), block: useRef<HTMLSelectElement>(null),
    booths: useRef<HTMLInputElement>(null), modules: useRef<HTMLSelectElement>(null),
    status: useRef<HTMLSelectElement>(null), created: useRef<HTMLInputElement>(null),
    expiry: useRef<HTMLInputElement>(null), notes: useRef<HTMLTextAreaElement>(null),
  }
  const fill = (d: Record<string,string>) => Object.entries(r).forEach(([k,ref]) => { if(ref.current) ref.current.value = d[k]??'' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k,ref]) => [k, ref.current?.value??'']))
  const handleSave = () => {
    const d = collect(); if(!d.name) return
    em.saveRecord(d.name, `${d.role||'—'} · ${d.block||'All Blocks'} · ${d.status||'Active'}`, d); clear()
  }
  const handleEdit = (id: string) => { const rec = em.startEdit(id); if(rec) fill(rec.data) }
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader title="Users List" icon="ph ph-user-gear" count={em.records.length} onAddNew={em.openForm} addLabel="Add User" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search users..." value={em.searchQuery} onChange={em.setSearch} onExport={() => exportRecordsToCsv(em.records,'User_Management')} onPrint={() => printModule(em.records,'User Management')} />
          <RecordList records={em.filtered} editingId={em.editingId} emptyMsg='No users added yet. Click "Add User" to begin.' icon="ph ph-user-gear" iconBg="#dbeafe" iconColor="#0d2455" onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id="user-form" title="User Management" icon="ph ph-user-gear" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Full Name" required><input ref={r.name} className={inputCls} placeholder="User's full name" /></FormGroup>
          <FormGroup label="Username" required><input ref={r.username} className={inputCls} placeholder="Login username" /></FormGroup>
          <FormGroup label="Password"><input ref={r.pass} type="password" className={inputCls} placeholder="Set password" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Phone" required><input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" /></FormGroup>
          <FormGroup label="Email"><input ref={r.email} type="email" className={inputCls} placeholder="email@example.com" /></FormGroup>
          <FormGroup label="Designation"><input ref={r.desig} className={inputCls} placeholder="Their designation" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Role / Access Level" required><select ref={r.role} className={selectCls}><option value="">Select</option><option>Super Admin</option><option>Campaign Manager</option><option>Area Coordinator</option><option>Booth Agent</option><option>Volunteer</option><option>War Room Analyst</option><option>Data Entry Operator</option><option>Read Only</option></select></FormGroup>
          <FormGroup label="Block Assigned"><select ref={r.block} className={selectCls}><option value="">All Blocks</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
          <FormGroup label="Booths Access"><input ref={r.booths} className={inputCls} placeholder="e.g. 001–050 or All" /></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Module Access"><select ref={r.modules} className={selectCls}><option value="">Select</option><option>All Modules</option><option>Entry Only</option><option>Reports Only</option><option>Dashboard Only</option><option>Custom</option></select></FormGroup>
          <FormGroup label="Account Status"><select ref={r.status} className={selectCls}><option>Active</option><option>Inactive</option><option>Suspended</option></select></FormGroup>
          <FormGroup label="Created Date"><input ref={r.created} type="date" className={inputCls} defaultValue={todayISO()} /></FormGroup>
          <FormGroup label="Expiry Date"><input ref={r.expiry} type="date" className={inputCls} /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Notes"><textarea ref={r.notes} className={textareaCls} placeholder="Any notes about this user's access or responsibilities..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save User" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}

/* ── WAR ROOM ───────────────────────────────────────────────────────── */
export function WarRoomEntry() {
  const em = useEntryModule('warroom', 'warroom-form')
  const r = {
    type: useRef<HTMLSelectElement>(null), priority: useRef<HTMLSelectElement>(null),
    dt: useRef<HTMLInputElement>(null), block: useRef<HTMLSelectElement>(null),
    loc: useRef<HTMLInputElement>(null), reporter: useRef<HTMLInputElement>(null),
    situation: useRef<HTMLTextAreaElement>(null), action: useRef<HTMLTextAreaElement>(null),
    owner: useRef<HTMLInputElement>(null), status: useRef<HTMLSelectElement>(null),
    resolved: useRef<HTMLInputElement>(null), resdate: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLTextAreaElement>(null),
  }
  const fill = (d: Record<string,string>) => Object.entries(r).forEach(([k,ref]) => { if(ref.current) ref.current.value = d[k]??'' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k,ref]) => [k, ref.current?.value??'']))
  const handleSave = () => {
    const d = collect(); if(!d.type) return
    em.saveRecord(d.type, `${d.priority||'—'} · ${d.block||'All'} · ${d.reporter||''} · ${d.status||'Open'}`, d); clear()
  }
  const handleEdit = (id: string) => { const rec = em.startEdit(id); if(rec) fill(rec.data) }
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader title="War Room Logs" icon="ph ph-castle-turret" count={em.records.length} badgeVariant="br" onAddNew={em.openForm} addLabel="Add Log" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search war room logs..." value={em.searchQuery} onChange={em.setSearch} onExport={() => exportRecordsToCsv(em.records,'War_Room')} onPrint={() => printModule(em.records,'War Room')} />
          <RecordList records={em.filtered} editingId={em.editingId} emptyMsg='No war room logs yet. Click "Add Log" to begin.' icon="ph ph-castle-turret" iconBg="#fee2e2" iconColor="#dc2626" onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id="warroom-form" title="War Room Log" icon="ph ph-castle-turret" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Log Type" required><select ref={r.type} className={selectCls}><option value="">Select</option><option>Voter Intelligence</option><option>Opposition Activity</option><option>Booth Issue Alert</option><option>Media Monitoring</option><option>Rumour / Misinformation</option><option>Strategy Decision</option><option>Resource Deployment</option><option>Emergency Alert</option><option>Field Report</option><option>Legal / EC Issue</option></select></FormGroup>
          <FormGroup label="Priority" required><select ref={r.priority} className={selectCls}><option value="">Select</option><option>Critical</option><option>High</option><option>Normal</option><option>Low</option></select></FormGroup>
          <FormGroup label="Date &amp; Time" required><input ref={r.dt} type="datetime-local" className={inputCls} defaultValue={nowDatetimeLocal()} /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Block / Booth"><select ref={r.block} className={selectCls}><option value="">All</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
          <FormGroup label="Specific Location"><input ref={r.loc} className={inputCls} placeholder="Village, booth no., road" /></FormGroup>
          <FormGroup label="Reported By" required><input ref={r.reporter} className={inputCls} placeholder="Name / team" /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Situation / Intelligence" required><textarea ref={r.situation} className={textareaCls} placeholder="Describe the situation, intelligence or issue in detail..." /></FormGroup></FormRow>
        <FormRow cols={2}>
          <FormGroup label="Action Taken"><textarea ref={r.action} className={textareaCls} style={{minHeight:60}} placeholder="What action was taken or decided?" /></FormGroup>
          <FormGroup label="Action Owner"><input ref={r.owner} className={inputCls} placeholder="Who is responsible?" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Status"><select ref={r.status} className={selectCls}><option>Open</option><option>In Progress</option><option>Resolved</option><option>Escalated</option><option>Monitoring</option></select></FormGroup>
          <FormGroup label="Resolved By"><input ref={r.resolved} className={inputCls} placeholder="Name" /></FormGroup>
          <FormGroup label="Resolution Date"><input ref={r.resdate} type="date" className={inputCls} /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Additional Notes"><textarea ref={r.notes} className={textareaCls} placeholder="Any additional context or reference..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Log to War Room" saveVariant="danger" saveIcon="ph ph-castle-turret" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}

/* ── DASHBOARD UPDATES ──────────────────────────────────────────────── */
export function DashboardEntry() {
  const em = useEntryModule('dashboard', 'dashboard-entry-form')
  const r = {
    type: useRef<HTMLSelectElement>(null), date: useRef<HTMLInputElement>(null),
    by: useRef<HTMLInputElement>(null), block: useRef<HTMLSelectElement>(null),
    metric: useRef<HTMLInputElement>(null), prev: useRef<HTMLInputElement>(null),
    newval: useRef<HTMLInputElement>(null), summary: useRef<HTMLTextAreaElement>(null),
  }
  const fill = (d: Record<string,string>) => Object.entries(r).forEach(([k,ref]) => { if(ref.current) ref.current.value = d[k]??'' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k,ref]) => [k, ref.current?.value??'']))
  const handleSave = () => {
    const d = collect(); if(!d.by) return
    em.saveRecord(d.type||'Update', `${d.date||'—'} · ${d.block||'All'} · ${d.metric||''} · By: ${d.by}`, d); clear()
  }
  const handleEdit = (id: string) => { const rec = em.startEdit(id); if(rec) fill(rec.data) }
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader title="Dashboard Updates" icon="ph ph-gauge" count={em.records.length} onAddNew={em.openForm} addLabel="Add Update" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search updates..." value={em.searchQuery} onChange={em.setSearch} onExport={() => exportRecordsToCsv(em.records,'Dashboard_Updates')} onPrint={() => printModule(em.records,'Dashboard Updates')} />
          <RecordList records={em.filtered} editingId={em.editingId} emptyMsg='No dashboard updates yet. Click "Add Update" to begin.' icon="ph ph-gauge" iconBg="#fff3e0" iconColor="#e07010" onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id="dashboard-entry-form" title="Dashboard Update" icon="ph ph-gauge" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Update Type" required><select ref={r.type} className={selectCls}><option value="">Select</option><option>Survey Update</option><option>Volunteer Count Update</option><option>Booth Coverage Update</option><option>Event Update</option><option>Sentiment Update</option><option>General Progress Update</option></select></FormGroup>
          <FormGroup label="Date" required><input ref={r.date} type="date" className={inputCls} defaultValue={todayISO()} /></FormGroup>
          <FormGroup label="Updated By" required><input ref={r.by} className={inputCls} placeholder="Who is logging this update?" /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Block"><select ref={r.block} className={selectCls}><option value="">All Blocks</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
          <FormGroup label="Metric / KPI Updated"><input ref={r.metric} className={inputCls} placeholder="e.g. Survey count, booth coverage %" /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Previous Value"><input ref={r.prev} className={inputCls} placeholder="Old value" /></FormGroup>
          <FormGroup label="New Value"><input ref={r.newval} className={inputCls} placeholder="Updated value" /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Update Summary"><textarea ref={r.summary} className={textareaCls} placeholder="Describe what changed and key observations..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Update" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}

/* ── ALLIANCE ───────────────────────────────────────────────────────── */
export function AllianceEntry() {
  const em = useEntryModule('alliance', 'alliance-form')
  const r = {
    party: useRef<HTMLInputElement>(null), contact: useRef<HTMLInputElement>(null),
    desig: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null),
    phone2: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null),
    block: useRef<HTMLSelectElement>(null), voters: useRef<HTMLInputElement>(null),
    status: useRef<HTMLSelectElement>(null), meetdate: useRef<HTMLInputElement>(null),
    meetloc: useRef<HTMLInputElement>(null), metby: useRef<HTMLInputElement>(null),
    demands: useRef<HTMLTextAreaElement>(null), offer: useRef<HTMLTextAreaElement>(null),
    booths: useRef<HTMLInputElement>(null), followup: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLTextAreaElement>(null),
  }
  const fill = (d: Record<string,string>) => Object.entries(r).forEach(([k,ref]) => { if(ref.current) ref.current.value = d[k]??'' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k,ref]) => [k, ref.current?.value??'']))
  const handleSave = () => {
    const d = collect(); if(!d.party) return
    em.saveRecord(d.party, `${d.contact||'—'} · ${d.block||'—'} · ${d.status||''}`, d); clear()
  }
  const handleEdit = (id: string) => { const rec = em.startEdit(id); if(rec) fill(rec.data) }
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader title="Alliance Records" icon="ph ph-handshake" count={em.records.length} onAddNew={em.openForm} addLabel="Add Alliance" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search alliance records..." value={em.searchQuery} onChange={em.setSearch} onExport={() => exportRecordsToCsv(em.records,'Alliance')} onPrint={() => printModule(em.records,'Alliance')} />
          <RecordList records={em.filtered} editingId={em.editingId} emptyMsg='No alliance records yet. Click "Add Alliance" to begin.' icon="ph ph-handshake" iconBg="#dcfce7" iconColor="#0d6606" onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id="alliance-form" title="Alliance Party" icon="ph ph-handshake" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Party Name" required><input ref={r.party} className={inputCls} placeholder="Allied party name" /></FormGroup>
          <FormGroup label="Contact Person" required><input ref={r.contact} className={inputCls} placeholder="Party representative name" /></FormGroup>
          <FormGroup label="Designation"><input ref={r.desig} className={inputCls} placeholder="Leader / Coordinator" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Phone" required><input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" /></FormGroup>
          <FormGroup label="Alt. Phone"><input ref={r.phone2} type="tel" className={inputCls} placeholder="Optional" /></FormGroup>
          <FormGroup label="Email"><input ref={r.email} type="email" className={inputCls} placeholder="Optional" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Block Covered"><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option><option>All Blocks</option></select></FormGroup>
          <FormGroup label="Voter Base (Estimated)"><input ref={r.voters} type="number" className={inputCls} placeholder="Approximate voters" /></FormGroup>
          <FormGroup label="Alliance Status" required><select ref={r.status} className={selectCls}><option value="">Select</option><option>Confirmed Alliance</option><option>In Discussion</option><option>Support Assured</option><option>Neutral</option><option>Against</option></select></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Meeting Date"><input ref={r.meetdate} type="date" className={inputCls} /></FormGroup>
          <FormGroup label="Meeting Location"><input ref={r.meetloc} className={inputCls} placeholder="Where was meeting held?" /></FormGroup>
          <FormGroup label="Met By (Our Side)"><input ref={r.metby} className={inputCls} placeholder="Campaign team member" /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Commitments / Demands from Alliance"><textarea ref={r.demands} className={textareaCls} style={{minHeight:60}} placeholder="What does the alliance party expect?" /></FormGroup>
          <FormGroup label="Our Commitment to Them"><textarea ref={r.offer} className={textareaCls} style={{minHeight:60}} placeholder="What we promised or offered..." /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Booths / Blocks They Cover"><input ref={r.booths} className={inputCls} placeholder="e.g. Booth 040–060, Erode Ward 9" /></FormGroup>
          <FormGroup label="Next Follow-up Date"><input ref={r.followup} type="date" className={inputCls} /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Notes / Remarks"><textarea ref={r.notes} className={textareaCls} placeholder="Any other details about this alliance coordination..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Alliance Entry" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}

/* ── KEY PEOPLE ─────────────────────────────────────────────────────── */
export function KeyPeopleEntry() {
  const em = useEntryModule('keypeople', 'keypeople-form')
  const r = {
    name: useRef<HTMLInputElement>(null), role: useRef<HTMLInputElement>(null),
    cat: useRef<HTMLSelectElement>(null), phone: useRef<HTMLInputElement>(null),
    phone2: useRef<HTMLInputElement>(null), block: useRef<HTMLSelectElement>(null),
    village: useRef<HTMLInputElement>(null), voters: useRef<HTMLInputElement>(null),
    support: useRef<HTMLSelectElement>(null), meetdate: useRef<HTMLInputElement>(null),
    meetloc: useRef<HTMLInputElement>(null), metby: useRef<HTMLInputElement>(null),
    sentiment: useRef<HTMLSelectElement>(null), committed: useRef<HTMLSelectElement>(null),
    willcamp: useRef<HTMLSelectElement>(null), keyissue: useRef<HTMLInputElement>(null),
    followupact: useRef<HTMLInputElement>(null), followupdate: useRef<HTMLInputElement>(null),
    followupby: useRef<HTMLInputElement>(null), notes: useRef<HTMLTextAreaElement>(null),
  }
  const fill = (d: Record<string,string>) => Object.entries(r).forEach(([k,ref]) => { if(ref.current) ref.current.value = d[k]??'' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k,ref]) => [k, ref.current?.value??'']))
  const handleSave = () => {
    const d = collect(); if(!d.name) return
    em.saveRecord(d.name, `${d.role||'—'} · ${d.cat||'—'} · ${d.block||'—'} · ${d.support||''}`, d); clear()
  }
  const handleEdit = (id: string) => { const rec = em.startEdit(id); if(rec) fill(rec.data) }
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader title="Key People List" icon="ph ph-star" count={em.records.length} onAddNew={em.openForm} addLabel="Add Key Person" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search key people..." value={em.searchQuery} onChange={em.setSearch} onExport={() => exportRecordsToCsv(em.records,'Key_People')} onPrint={() => printModule(em.records,'Key People')} />
          <RecordList records={em.filtered} editingId={em.editingId} emptyMsg='No key people added yet. Click "Add Key Person" to begin.' icon="ph ph-star" iconBg="#fde68a" iconColor="#e07010" onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id="keypeople-form" title="Key Person" icon="ph ph-star" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Full Name" required><input ref={r.name} className={inputCls} placeholder="Leader / Influencer name" /></FormGroup>
          <FormGroup label="Designation / Role" required><input ref={r.role} className={inputCls} placeholder="e.g. Panchayat President, SHG Leader" /></FormGroup>
          <FormGroup label="Category" required><select ref={r.cat} className={selectCls}><option value="">Select</option><option>Religious Leader</option><option>Panchayat Leader</option><option>Farmer Leader</option><option>Women / SHG Leader</option><option>SC/ST Community Leader</option><option>Business / Industry Leader</option><option>Education Leader</option><option>Youth Leader</option><option>Media / Influencer</option><option>Caste / Community Head</option><option>Traders / Market Committee</option><option>City Councillor / RWA</option><option>Other</option></select></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Phone" required><input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" /></FormGroup>
          <FormGroup label="Alt. Phone"><input ref={r.phone2} type="tel" className={inputCls} placeholder="Optional" /></FormGroup>
          <FormGroup label="Block"><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Village / Ward"><input ref={r.village} className={inputCls} placeholder="Their village or ward" /></FormGroup>
          <FormGroup label="Estimated Voters Influenced"><input ref={r.voters} type="number" className={inputCls} placeholder="e.g. 150" /></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Support Level"><select ref={r.support} className={selectCls}><option value="">Select</option><option>Confirmed Supporter</option><option>Likely Supporter</option><option>Neutral</option><option>Opposition Leaning</option><option>Unknown</option></select></FormGroup>
          <FormGroup label="Meeting Date"><input ref={r.meetdate} type="date" className={inputCls} /></FormGroup>
          <FormGroup label="Meeting Location"><input ref={r.meetloc} className={inputCls} placeholder="Where was the meeting?" /></FormGroup>
          <FormGroup label="Met By"><input ref={r.metby} className={inputCls} placeholder="Campaign team member" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Sentiment Towards BJP" required><select ref={r.sentiment} className={selectCls}><option value="">Select</option><option>Strongly Favourable</option><option>Favourable</option><option>Undecided / Neutral</option><option>Opposition Leaning</option><option>Opposition</option></select></FormGroup>
          <FormGroup label="Committed to Vote BJP?"><select ref={r.committed} className={selectCls}><option value="">Select</option><option>Yes – Confirmed</option><option>Yes – Likely</option><option>Undecided</option><option>No</option></select></FormGroup>
          <FormGroup label="Will Campaign for Us?"><select ref={r.willcamp} className={selectCls}><option value="">Select</option><option>Yes – Active support</option><option>Silent support</option><option>No</option></select></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Key Issue Raised"><input ref={r.keyissue} className={inputCls} placeholder="Main issue or concern raised" /></FormGroup></FormRow>
        <FormRow cols={3}>
          <FormGroup label="Follow-up Action Required"><input ref={r.followupact} className={inputCls} placeholder="What needs to be done?" /></FormGroup>
          <FormGroup label="Follow-up Date"><input ref={r.followupdate} type="date" className={inputCls} /></FormGroup>
          <FormGroup label="Follow-up By"><input ref={r.followupby} className={inputCls} placeholder="Responsible person" /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Notes"><textarea ref={r.notes} className={textareaCls} placeholder="Any notes about this person's influence, demands, or interactions..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Key Person" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}

/* ── FEEDBACK ───────────────────────────────────────────────────────── */
export function FeedbackEntry() {
  const em = useEntryModule('feedback', 'feedback-form')
  const r = {
    name: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null),
    block: useRef<HTMLSelectElement>(null), booth: useRef<HTMLInputElement>(null),
    type: useRef<HTMLSelectElement>(null), channel: useRef<HTMLSelectElement>(null),
    date: useRef<HTMLInputElement>(null), sentiment: useRef<HTMLSelectElement>(null),
    feedback: useRef<HTMLTextAreaElement>(null), action: useRef<HTMLTextAreaElement>(null),
    status: useRef<HTMLSelectElement>(null), positive: useRef<HTMLTextAreaElement>(null),
    negative: useRef<HTMLTextAreaElement>(null), suggestions: useRef<HTMLTextAreaElement>(null),
    collmethod: useRef<HTMLSelectElement>(null), collby: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLTextAreaElement>(null),
  }
  const fill = (d: Record<string,string>) => Object.entries(r).forEach(([k,ref]) => { if(ref.current) ref.current.value = d[k]??'' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k,ref]) => [k, ref.current?.value??'']))
  const handleSave = () => {
    const d = collect(); if(!d.name) return
    em.saveRecord(d.name, `${d.type||'—'} · ${d.block||'—'} · ${d.sentiment||''} · ${d.status||''}`, d); clear()
  }
  const handleEdit = (id: string) => { const rec = em.startEdit(id); if(rec) fill(rec.data) }
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader title="Feedback Records" icon="ph ph-chats" count={em.records.length} onAddNew={em.openForm} addLabel="Add Feedback" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search feedback..." value={em.searchQuery} onChange={em.setSearch} onExport={() => exportRecordsToCsv(em.records,'Feedback')} onPrint={() => printModule(em.records,'Feedback')} />
          <RecordList records={em.filtered} editingId={em.editingId} emptyMsg='No feedback records yet. Click "Add Feedback" to begin.' icon="ph ph-chats" iconBg="#ede9fe" iconColor="#7c3aed" onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id="feedback-form" title="Voter Feedback" icon="ph ph-chats" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Voter / Person Name" required><input ref={r.name} className={inputCls} placeholder="Name" /></FormGroup>
          <FormGroup label="Phone"><input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" /></FormGroup>
          <FormGroup label="Block"><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
        </FormRow>
        <FormRow cols={4}>
          <FormGroup label="Booth No."><input ref={r.booth} className={inputCls} placeholder="001" /></FormGroup>
          <FormGroup label="Feedback Type" required><select ref={r.type} className={selectCls}><option value="">Select</option><option>Complaint</option><option>Suggestion</option><option>Appreciation</option><option>Query</option><option>Scheme Request</option><option>General Feedback</option></select></FormGroup>
          <FormGroup label="Channel"><select ref={r.channel} className={selectCls}><option value="">Select</option><option>In Person</option><option>Phone Call</option><option>WhatsApp</option><option>Social Media</option><option>Written Letter</option></select></FormGroup>
          <FormGroup label="Date"><input ref={r.date} type="date" className={inputCls} defaultValue={todayISO()} /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Sentiment"><select ref={r.sentiment} className={selectCls}><option value="">Select</option><option>Positive</option><option>Neutral</option><option>Negative</option><option>Urgent</option></select></FormGroup></FormRow>
        <FormRow cols={1}><FormGroup label="Feedback / Message" required><textarea ref={r.feedback} className={textareaCls} placeholder="Record the full feedback or message..." /></FormGroup></FormRow>
        <FormRow cols={2}>
          <FormGroup label="Positive Points"><textarea ref={r.positive} className={textareaCls} style={{minHeight:60}} placeholder="What did they appreciate?" /></FormGroup>
          <FormGroup label="Negative Points / Concerns"><textarea ref={r.negative} className={textareaCls} style={{minHeight:60}} placeholder="What concerns or complaints?" /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Suggestions"><textarea ref={r.suggestions} className={textareaCls} placeholder="Any suggestions they gave..." /></FormGroup></FormRow>
        <FormRow cols={2}>
          <FormGroup label="Collection Method"><select ref={r.collmethod} className={selectCls}><option value="">Select</option><option>In Person</option><option>Phone Call</option><option>WhatsApp</option><option>Form / Survey</option><option>Social Media</option></select></FormGroup>
          <FormGroup label="Collected By"><input ref={r.collby} className={inputCls} placeholder="Who collected this feedback?" /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Action Taken / Planned"><textarea ref={r.action} className={textareaCls} placeholder="What action has been or will be taken?" /></FormGroup></FormRow>
        <FormRow cols={1}><FormGroup label="Status"><select ref={r.status} className={selectCls}><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option></select></FormGroup></FormRow>
        <FormRow cols={1}><FormGroup label="Notes"><textarea ref={r.notes} className={textareaCls} placeholder="Any additional notes..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Feedback" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}

/* ── COMMITMENT ─────────────────────────────────────────────────────── */
export function CommitmentEntry() {
  const em = useEntryModule('commitment', 'commitment-form')
  const r = {
    title: useRef<HTMLInputElement>(null), type: useRef<HTMLSelectElement>(null),
    block: useRef<HTMLSelectElement>(null), village: useRef<HTMLInputElement>(null),
    madeBy: useRef<HTMLInputElement>(null), madeDate: useRef<HTMLInputElement>(null),
    deadline: useRef<HTMLInputElement>(null), beneficiary: useRef<HTMLInputElement>(null),
    voters: useRef<HTMLInputElement>(null), scheme: useRef<HTMLInputElement>(null),
    status: useRef<HTMLSelectElement>(null), owner: useRef<HTMLInputElement>(null),
    category: useRef<HTMLSelectElement>(null), description: useRef<HTMLTextAreaElement>(null),
    evidence: useRef<HTMLInputElement>(null), campaction: useRef<HTMLTextAreaElement>(null),
    notes: useRef<HTMLTextAreaElement>(null),
  }
  const fill = (d: Record<string,string>) => Object.entries(r).forEach(([k,ref]) => { if(ref.current) ref.current.value = d[k]??'' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k,ref]) => [k, ref.current?.value??'']))
  const handleSave = () => {
    const d = collect(); if(!d.title) return
    em.saveRecord(d.title, `${d.category||d.type||'—'} · ${d.block||'—'} · ${d.status||'Pending'} · By: ${d.madeBy||'—'}`, d); clear()
  }
  const handleEdit = (id: string) => { const rec = em.startEdit(id); if(rec) fill(rec.data) }
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader title="Commitments List" icon="ph ph-push-pin" count={em.records.length} onAddNew={em.openForm} addLabel="Add Commitment" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search commitments..." value={em.searchQuery} onChange={em.setSearch} onExport={() => exportRecordsToCsv(em.records,'Commitments')} onPrint={() => printModule(em.records,'Commitments')} />
          <RecordList records={em.filtered} editingId={em.editingId} emptyMsg='No commitments logged yet. Click "Add Commitment" to begin.' icon="ph ph-push-pin" iconBg="#fff3e0" iconColor="#e07010" onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id="commitment-form" title="Commitment" icon="ph ph-push-pin" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Commitment Title" required><input ref={r.title} className={inputCls} placeholder="What was promised?" /></FormGroup>
          <FormGroup label="Type"><select ref={r.type} className={selectCls}><option value="">Select</option><option>Infrastructure</option><option>Scheme Enrollment</option><option>Employment</option><option>Healthcare</option><option>Education</option><option>Women Empowerment</option><option>Youth Development</option><option>Farmer Support</option><option>Other</option></select></FormGroup>
          <FormGroup label="Block"><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Village / Ward"><input ref={r.village} className={inputCls} placeholder="Specific village or ward" /></FormGroup>
          <FormGroup label="Made By"><input ref={r.madeBy} className={inputCls} placeholder="Candidate / party leader" /></FormGroup>
          <FormGroup label="Date Made"><input ref={r.madeDate} type="date" className={inputCls} defaultValue={todayISO()} /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Target Deadline"><input ref={r.deadline} type="date" className={inputCls} /></FormGroup>
          <FormGroup label="Beneficiary Group"><input ref={r.beneficiary} className={inputCls} placeholder="Who benefits?" /></FormGroup>
          <FormGroup label="Estimated Voters Impacted"><input ref={r.voters} type="number" className={inputCls} placeholder="Count" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Linked Scheme / Programme"><input ref={r.scheme} className={inputCls} placeholder="Which scheme addresses this?" /></FormGroup>
          <FormGroup label="Status"><select ref={r.status} className={selectCls}><option>Pending</option><option>In Progress</option><option>Fulfilled</option><option>Delayed</option><option>Cancelled</option></select></FormGroup>
          <FormGroup label="Responsible Person"><input ref={r.owner} className={inputCls} placeholder="Who will fulfil this?" /></FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Category" required><select ref={r.category} className={selectCls}><option value="">Select</option><option>Pre-Election Promise</option><option>Post-Election Plan</option><option>Ongoing Activity</option><option>Completed</option></select></FormGroup>
          <FormGroup label="Evidence / Proof"><input ref={r.evidence} className={inputCls} placeholder="Photo, document reference, link..." /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Commitment Description" required><textarea ref={r.description} className={textareaCls} placeholder="Describe the commitment in detail..." /></FormGroup></FormRow>
        <FormRow cols={1}><FormGroup label="Campaign Action for this Commitment"><textarea ref={r.campaction} className={textareaCls} placeholder="What campaign action is planned for this commitment?" /></FormGroup></FormRow>
        <FormRow cols={1}><FormGroup label="Notes / Details"><textarea ref={r.notes} className={textareaCls} placeholder="Full details of the commitment and any progress updates..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Commitment" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}

/* ── GRIEVANCE ──────────────────────────────────────────────────────── */
export function GrievanceEntry() {
  const em = useEntryModule('grievance', 'grievance-form')
  const r = {
    name: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null),
    block: useRef<HTMLSelectElement>(null), village: useRef<HTMLInputElement>(null),
    booth: useRef<HTMLInputElement>(null), cat: useRef<HTMLSelectElement>(null),
    priority: useRef<HTMLSelectElement>(null), date: useRef<HTMLInputElement>(null),
    grievance: useRef<HTMLTextAreaElement>(null), action: useRef<HTMLTextAreaElement>(null),
    owner: useRef<HTMLInputElement>(null), deadline: useRef<HTMLInputElement>(null),
    status: useRef<HTMLSelectElement>(null), resolved: useRef<HTMLInputElement>(null),
    resdate: useRef<HTMLInputElement>(null), notes: useRef<HTMLTextAreaElement>(null),
  }
  const fill = (d: Record<string,string>) => Object.entries(r).forEach(([k,ref]) => { if(ref.current) ref.current.value = d[k]??'' })
  const clear = () => fill({})
  const collect = () => Object.fromEntries(Object.entries(r).map(([k,ref]) => [k, ref.current?.value??'']))
  const handleSave = () => {
    const d = collect(); if(!d.name) return
    em.saveRecord(d.name, `${d.cat||'—'} · ${d.block||'—'} · ${d.priority||'Normal'} · ${d.status||'Open'}`, d); clear()
  }
  const handleEdit = (id: string) => { const rec = em.startEdit(id); if(rec) fill(rec.data) }
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader title="Grievance Records" icon="ph ph-warning" count={em.records.length} badgeVariant="br" onAddNew={em.openForm} addLabel="Add Grievance" />
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar placeholder="Search grievances..." value={em.searchQuery} onChange={em.setSearch} onExport={() => exportRecordsToCsv(em.records,'Grievances')} onPrint={() => printModule(em.records,'Grievances')} />
          <RecordList records={em.filtered} editingId={em.editingId} emptyMsg='No grievances logged yet. Click "Add Grievance" to begin.' icon="ph ph-warning" iconBg="#fee2e2" iconColor="#dc2626" onEdit={handleEdit} onDelete={em.deleteRecord} />
        </div>
      </div>
      <EntryFormPanel id="grievance-form" title="Grievance" icon="ph ph-warning" isOpen={em.isFormOpen} isEditing={em.isEditing} onClose={em.closeForm}>
        <FormRow cols={3}>
          <FormGroup label="Complainant Name" required><input ref={r.name} className={inputCls} placeholder="Voter / person name" /></FormGroup>
          <FormGroup label="Phone"><input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" /></FormGroup>
          <FormGroup label="Block"><select ref={r.block} className={selectCls}><option value="">Select</option><option>Modakkurichi</option><option>Sivagiri</option><option>Erode City</option></select></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Village / Ward"><input ref={r.village} className={inputCls} placeholder="Village name" /></FormGroup>
          <FormGroup label="Booth No."><input ref={r.booth} className={inputCls} placeholder="001" /></FormGroup>
          <FormGroup label="Date Received"><input ref={r.date} type="date" className={inputCls} defaultValue={todayISO()} /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Category" required><select ref={r.cat} className={selectCls}><option value="">Select</option><option>Roads / Infrastructure</option><option>Water Supply</option><option>Electricity</option><option>Ration / PDS</option><option>Healthcare</option><option>Education</option><option>Employment / NREGS</option><option>Scheme Non-Receipt</option><option>Land / Property</option><option>Police / Law</option><option>Election / EC Issue</option><option>Other</option></select></FormGroup>
          <FormGroup label="Priority"><select ref={r.priority} className={selectCls}><option>High</option><option>Normal</option><option>Low</option></select></FormGroup>
          <FormGroup label="Status"><select ref={r.status} className={selectCls}><option>Open</option><option>In Progress</option><option>Escalated</option><option>Resolved</option><option>Closed</option></select></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Grievance Description" required><textarea ref={r.grievance} className={textareaCls} placeholder="Describe the grievance in detail..." /></FormGroup></FormRow>
        <FormRow cols={2}>
          <FormGroup label="Action Taken"><textarea ref={r.action} className={textareaCls} style={{minHeight:60}} placeholder="What action has been taken?" /></FormGroup>
          <FormGroup label="Responsible Person / Dept"><input ref={r.owner} className={inputCls} placeholder="Who is handling this?" /></FormGroup>
        </FormRow>
        <FormRow cols={3}>
          <FormGroup label="Target Resolution Date"><input ref={r.deadline} type="date" className={inputCls} /></FormGroup>
          <FormGroup label="Resolved By"><input ref={r.resolved} className={inputCls} placeholder="Name" /></FormGroup>
          <FormGroup label="Resolution Date"><input ref={r.resdate} type="date" className={inputCls} /></FormGroup>
        </FormRow>
        <FormRow cols={1}><FormGroup label="Notes"><textarea ref={r.notes} className={textareaCls} placeholder="Any additional notes or references..." /></FormGroup></FormRow>
        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Grievance" saveVariant="danger" isEditing={em.isEditing} />
      </EntryFormPanel>
    </div>
  )
}
