import { useState, useEffect, useRef, useCallback } from 'react'
import { useUserAPI } from '../../hooks/usePollAPI'
import type { UserRecord, PagePermission } from '../../hooks/usePollAPI'
import { useAuthContext } from '../../context/AuthContext'
import EntryListHeader from '../../components/entry/EntryListHeader'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'

const ROLES = [
  { value: 'admin',            label: 'System Administrator' },
  { value: 'district_head',    label: 'District Head' },
  { value: 'constituency_mgr', label: 'Constituency Manager' },
  { value: 'booth_agent',      label: 'Booth Agent' },
  { value: 'volunteer',        label: 'Campaign Volunteer' },
  { value: 'voter',            label: 'Registered Voter' },
  { value: 'analyst',          label: 'Data Analyst' },
  { value: 'observer',         label: 'Observer' },
]

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  admin:            { bg: '#fee2e2', color: '#dc2626' },
  district_head:    { bg: '#dbeafe', color: '#1d4ed8' },
  constituency_mgr: { bg: '#e0e7ff', color: '#4338ca' },
  booth_agent:      { bg: '#dcfce7', color: '#15803d' },
  volunteer:        { bg: '#fef3c7', color: '#d97706' },
  voter:            { bg: '#f0fdf4', color: '#166534' },
  analyst:          { bg: '#f5f3ff', color: '#7c3aed' },
  observer:         { bg: '#f8fafc', color: '#64748b' },
}

// Pages + entry modules shown in the permission matrix
const PAGES = [
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'master',        label: 'Overview' },
  { id: 'entry',         label: 'Entry (page)' },
  { id: 'masters-config',label: 'Masters Config' },
  { id: 'report',        label: 'Reports' },
  { id: 'opinion-poll',  label: 'Opinion Poll' },
]
const ENTRY_MODULES = [
  { id: 'voter',               label: 'Voter Details' },
  { id: 'booth',               label: 'Booth Info' },
  { id: 'volunteer',           label: 'Volunteers' },
  { id: 'event',               label: 'Event Mgmt' },
  { id: 'campaign',            label: 'Campaign' },
  { id: 'user',                label: 'User Mgmt' },
  { id: 'warroom',             label: 'War Room' },
  { id: 'alliance',            label: 'Alliance' },
  { id: 'keypeople',           label: 'Key People' },
  { id: 'feedback',            label: 'Feedback' },
  { id: 'commitment',          label: 'Commitments' },
  { id: 'grievance',           label: 'Grievance' },
  { id: 'agent-activity',      label: 'Agent Log' },
  { id: 'field-activity',      label: 'Field Log' },
  { id: 'volunteer-activity',  label: 'Vol. Log' },
  { id: 'voter-survey',        label: 'Survey' },
]

type TabId = 'users' | 'permissions'

export default function UserEntryPage() {
  const { user: currentUser } = useAuthContext()
  const {
    fetchUsers, createUser, updateUser, deactivateUser,
    fetchPermissions, updatePermission,
    loading,
  } = useUserAPI()

  const isAdmin = currentUser?.role === 'admin'

  const PAGE_SIZE = 10

  const [activeTab, setActiveTab] = useState<TabId>('users')
  const [users, setUsers] = useState<UserRecord[]>([])
  const [permissions, setPermissions] = useState<PagePermission[]>([])
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [page, setPage] = useState(1)
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const pendingFill = useRef<UserRecord | null>(null)

  const r = {
    firstName:    useRef<HTMLInputElement>(null),
    lastName:     useRef<HTMLInputElement>(null),
    username:     useRef<HTMLInputElement>(null),
    password:     useRef<HTMLInputElement>(null),
    passwordConf: useRef<HTMLInputElement>(null),
    email:        useRef<HTMLInputElement>(null),
    phone:        useRef<HTMLInputElement>(null),
    role:         useRef<HTMLSelectElement>(null),
  }

  useEffect(() => {
    fetchUsers().then(res => { if (res) setUsers(res) })
  }, [])

  useEffect(() => {
    if (activeTab === 'permissions' && isAdmin && permissions.length === 0) {
      fetchPermissions().then(res => { if (res) setPermissions(res) })
    }
  }, [activeTab, isAdmin])

  useEffect(() => {
    if (isFormOpen && pendingFill.current) {
      const u = pendingFill.current
      if (r.firstName.current)    r.firstName.current.value    = u.first_name ?? ''
      if (r.lastName.current)     r.lastName.current.value     = u.last_name  ?? ''
      if (r.username.current)     r.username.current.value     = u.username   ?? ''
      if (r.email.current)        r.email.current.value        = u.email      ?? ''
      if (r.phone.current)        r.phone.current.value        = u.phone      ?? ''
      if (r.role.current)         r.role.current.value         = u.role       ?? ''
      pendingFill.current = null
    }
  }, [isFormOpen])

  const clear = () => {
    Object.values(r).forEach(ref => { if (ref.current) ref.current.value = '' })
  }

  const handleSave = async () => {
    setApiError(null)
    const firstName    = r.firstName.current?.value ?? ''
    const lastName     = r.lastName.current?.value  ?? ''
    const username     = r.username.current?.value  ?? ''
    const password     = r.password.current?.value  ?? ''
    const passwordConf = r.passwordConf.current?.value ?? ''
    const email        = r.email.current?.value     ?? ''
    const phone        = r.phone.current?.value     ?? ''
    const role         = r.role.current?.value      ?? ''

    if (!firstName || !username || !role) {
      setApiError('First name, username, and role are required.')
      return
    }

    if (editingId !== null) {
      const payload: Record<string, any> = { first_name: firstName, last_name: lastName, email, phone, role }
      if (password) {
        if (password !== passwordConf) { setApiError('Passwords do not match.'); return }
        payload.password = password
        payload.password_confirm = passwordConf
      }
      const updated = await updateUser(editingId, payload)
      if (updated) {
        setUsers(prev => prev.map(u => u.id === editingId ? updated : u))
        setEditingId(null); setFormOpen(false); clear()
      } else {
        setApiError('Failed to update user.')
      }
    } else {
      if (!password) { setApiError('Password is required for new users.'); return }
      if (password !== passwordConf) { setApiError('Passwords do not match.'); return }
      const created = await createUser({
        first_name: firstName, last_name: lastName, username, email, phone, role,
        password, password_confirm: passwordConf,
      })
      if (created) {
        setUsers(prev => [created, ...prev])
        setFormOpen(false); clear()
      } else {
        setApiError('Failed to create user.')
      }
    }
  }

  const handleEdit = (id: number) => {
    const u = users.find(u => u.id === id)
    if (!u) return
    pendingFill.current = u
    setEditingId(id)
    setFormOpen(true)
  }

  const handleDeactivateRequest = (u: UserRecord) => {
    if (u.id === currentUser?.id) return
    if (u.role === 'admin') return
    setConfirmDeleteId(u.id)
  }

  const handleDeactivateConfirm = async () => {
    if (confirmDeleteId === null) return
    const ok = await deactivateUser(confirmDeleteId)
    if (ok) setUsers(prev => prev.filter(u => u.id !== confirmDeleteId))
    setConfirmDeleteId(null)
  }

  const handlePermToggle = async (perm: PagePermission) => {
    const updated = await updatePermission(perm.id, !perm.can_access)
    if (updated) {
      setPermissions(prev => prev.map(p => p.id === updated.id ? updated : p))
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
    const matchRole = !filterRole || u.role === filterRole
    return matchSearch && matchRole
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Build permission matrix: role → page_id → permission
  const permMatrix: Record<string, Record<string, PagePermission>> = {}
  permissions.forEach(p => {
    if (!permMatrix[p.role]) permMatrix[p.role] = {}
    permMatrix[p.role][p.page_id] = p
  })

  const allPageIds = [...PAGES.map(p => p.id), ...ENTRY_MODULES.map(m => m.id)]

  return (
    <div className="page-enter">
      {/* ── Tab switcher ── */}
      <div className="flex gap-2 mb-4">
        {(['users', 'permissions'] as TabId[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold border transition-all duration-150 capitalize
              ${activeTab === tab
                ? 'bg-navy text-white border-navy shadow-sm'
                : 'bg-white text-muted border-border hover:border-navy hover:text-navy'
              }`}
          >
            <i className={`${tab === 'users' ? 'ph ph-users' : 'ph ph-lock-key'} mr-1`} />
            {tab === 'users' ? 'Users' : 'Permissions'}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <>
          <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
            <EntryListHeader
              title="Users" icon="ph ph-user-gear" count={users.length}
              onAddNew={() => { if (!isAdmin) return; setEditingId(null); clear(); setFormOpen(true) }}
              addLabel="Add User"
            />
            <div className="px-[18px] py-[14px]">
              <EntrySearchToolbar
                placeholder="Search users..."
                value={search} onChange={e => { setSearch(e); setPage(1) }}
                onExport={() => {}} onPrint={() => {}}
              />
              {/* Role filter */}
              <div className="flex flex-wrap items-center gap-2 mt-2 pb-3 border-b border-border">
                <span className="text-[10px] font-bold text-muted uppercase tracking-[0.6px]">Filter:</span>
                <select
                  value={filterRole}
                  onChange={e => { setFilterRole(e.target.value); setPage(1) }}
                  className={`form-input text-[11px] py-[4px] pr-7 min-w-[140px] w-auto ${filterRole ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
                >
                  <option value="">All Roles</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {filterRole && (
                  <button onClick={() => { setFilterRole(''); setPage(1) }}
                    className="text-[10px] font-bold text-kampr flex items-center gap-1">
                    <i className="ph ph-x-circle" /> Clear
                  </button>
                )}
                <span className="ml-auto text-[10px] text-muted">{filtered.length} users</span>
              </div>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
                  <i className="ph ph-user-gear text-[32px] opacity-30" />
                  <p className="text-[13px]">No users found.</p>
                </div>
              ) : (
                <>
                <div className="flex flex-col gap-2 mt-3">
                  {paged.map(u => {
                    const badge = ROLE_BADGE[u.role] ?? { bg: '#f1f5f9', color: '#64748b' }
                    const roleDef = ROLES.find(r => r.value === u.role)
                    return (
                      <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-navy text-white text-[13px] font-bold">
                            {(u.first_name?.[0] ?? u.username[0]).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-navy">{u.full_name || u.username}</p>
                              <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full"
                                style={{ background: badge.bg, color: badge.color }}>
                                {roleDef?.label ?? u.role_display}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted">@{u.username}{u.phone ? ` · ${u.phone}` : ''}{u.email ? ` · ${u.email}` : ''}</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(u.id)} className="p-[7px] rounded-lg hover:bg-[#f0f4ff] text-navy transition-colors">
                              <i className="ph ph-pencil text-[14px]" />
                            </button>
                            <button
                              onClick={() => handleDeactivateRequest(u)}
                              disabled={u.id === currentUser?.id || u.role === 'admin'}
                              title={
                                u.id === currentUser?.id ? 'You cannot delete yourself'
                                : u.role === 'admin' ? 'Admin users cannot be deleted'
                                : 'Delete user'
                              }
                              className="p-[7px] rounded-lg hover:bg-[#fff0f0] text-kampr transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <i className="ph ph-user-minus text-[14px]" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-muted text-[10px]">
                      {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(1)} disabled={safePage === 1}
                        className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all">
                        <i className="ph ph-caret-double-left" />
                      </button>
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                        className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all">
                        <i className="ph ph-caret-left" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                        .map(p => (
                          <button key={p} onClick={() => setPage(p)}
                            className={`px-2 py-1 text-[10px] font-bold rounded border transition-all ${safePage === p ? 'bg-navy border-navy text-white' : 'border-border text-muted hover:border-saffron hover:text-navy'}`}>
                            {p}
                          </button>
                        ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                        className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all">
                        <i className="ph ph-caret-right" />
                      </button>
                      <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                        className="px-2 py-1 text-[10px] font-bold rounded border border-border text-muted disabled:opacity-30 hover:border-saffron hover:text-navy transition-all">
                        <i className="ph ph-caret-double-right" />
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}
            </div>
          </div>

          {/* ── User Form ── */}
          <EntryFormPanel
            id="user-form" title={editingId ? 'Edit User' : 'Add User'} icon="ph ph-user-gear"
            isOpen={isFormOpen} isEditing={editingId !== null}
            onClose={() => { setFormOpen(false); setEditingId(null); clear(); setApiError(null) }}
          >
            {apiError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-[#fff0f0] border border-[#fca5a5] text-[12px] text-kampr flex items-center gap-2">
                <i className="ph ph-warning-circle text-[14px]" /> {apiError}
              </div>
            )}

            <FormRow cols={2}>
              <FormGroup label="First Name" required>
                <input ref={r.firstName} className={inputCls} placeholder="First name" />
              </FormGroup>
              <FormGroup label="Last Name">
                <input ref={r.lastName} className={inputCls} placeholder="Last name" />
              </FormGroup>
            </FormRow>
            <FormRow cols={2}>
              <FormGroup label="Username" required>
                <input ref={r.username} className={inputCls + (editingId ? ' bg-[#f0f4f8] cursor-not-allowed' : '')}
                  placeholder="Login username" readOnly={editingId !== null} />
              </FormGroup>
              <FormGroup label="Role" required>
                <select ref={r.role} className={selectCls}>
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </FormGroup>
            </FormRow>
            <FormRow cols={2}>
              <FormGroup label="Email">
                <input ref={r.email} type="email" className={inputCls} placeholder="email@example.com" />
              </FormGroup>
              <FormGroup label="Phone">
                <input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" />
              </FormGroup>
            </FormRow>

            <div className="flex items-center gap-2 mt-4 mb-3">
              <i className="ph ph-lock-key text-saffron text-[14px]" />
              <span className="text-[11px] font-bold text-navy uppercase tracking-[1px]">
                {editingId ? 'Change Password (leave blank to keep)' : 'Set Password'}
              </span>
            </div>
            <FormRow cols={2}>
              <FormGroup label="Password" required={!editingId}>
                <input ref={r.password} type="password" className={inputCls} placeholder="Min. 8 characters" />
              </FormGroup>
              <FormGroup label="Confirm Password" required={!editingId}>
                <input ref={r.passwordConf} type="password" className={inputCls} placeholder="Re-enter password" />
              </FormGroup>
            </FormRow>

            <FormActions onSave={handleSave} onClear={clear} saveLabel={editingId ? 'Update User' : 'Create User'} isEditing={editingId !== null} />
          </EntryFormPanel>
        </>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {confirmDeleteId !== null && (() => {
        const target = users.find(u => u.id === confirmDeleteId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#fff0f0] flex items-center justify-center flex-shrink-0">
                  <i className="ph ph-warning text-kampr text-[20px]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-navy">Delete User?</h3>
                  <p className="text-[11px] text-muted">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-[13px] text-navy mb-5">
                Are you sure you want to delete <span className="font-semibold">{target?.full_name || target?.username}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2 rounded-lg border border-border text-[12px] font-semibold text-muted hover:border-navy hover:text-navy transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivateConfirm}
                  className="flex-1 py-2 rounded-lg border-none text-[12px] font-bold text-white transition-all"
                  style={{ background: '#dc2626' }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── PERMISSIONS TAB ── */}
      {activeTab === 'permissions' && (
        <div className="bg-surface rounded-card shadow-card overflow-hidden">
          <div className="px-[18px] py-[14px] border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ph ph-lock-key text-navy text-[18px]" />
              <div>
                <h3 className="text-[13px] font-bold text-navy">Page Access Control</h3>
                <p className="text-[11px] text-muted">Admin can toggle access for each role</p>
              </div>
            </div>
            {!isAdmin && (
              <span className="text-[11px] text-muted italic">View only — admin access required to edit</span>
            )}
          </div>

          {permissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
              <i className="ph ph-circle-notch animate-spin text-[24px]" />
              <p className="text-[13px]">Loading permissions...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc]">
                    <th className="text-left px-4 py-3 font-bold text-navy border-b border-border sticky left-0 bg-[#f8fafc] min-w-[160px]">
                      Page / Module
                    </th>
                    {ROLES.map(role => (
                      <th key={role.value} className="px-3 py-3 font-bold text-navy border-b border-border text-center min-w-[90px]">
                        <div style={ROLE_BADGE[role.value]}
                          className="px-2 py-1 rounded-full text-[9px] font-semibold">
                          {role.label.split(' ')[0]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Pages section header */}
                  <tr className="bg-[#0d2455] text-white">
                    <td colSpan={ROLES.length + 1} className="px-4 py-[6px] text-[10px] font-bold uppercase tracking-[1px]">
                      Top-Level Pages
                    </td>
                  </tr>
                  {PAGES.map((page, idx) => (
                    <tr key={page.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'}>
                      <td className="px-4 py-[10px] font-medium text-navy border-b border-[#f0f0f0] sticky left-0 bg-inherit">
                        {page.label}
                      </td>
                      {ROLES.map(role => {
                        const perm = permMatrix[role.value]?.[page.id]
                        const enabled = perm?.can_access ?? false
                        return (
                          <td key={role.value} className="px-3 py-[10px] text-center border-b border-[#f0f0f0]">
                            <button
                              onClick={() => isAdmin && perm && handlePermToggle(perm)}
                              disabled={!isAdmin || !perm}
                              className={`w-5 h-5 rounded-md flex items-center justify-center mx-auto transition-all
                                ${enabled
                                  ? 'bg-kampgreen text-white'
                                  : 'bg-[#f1f5f9] text-[#cbd5e1]'
                                }
                                ${isAdmin && perm ? 'cursor-pointer hover:scale-110' : 'cursor-default opacity-60'}`}
                            >
                              <i className={`ph ph-${enabled ? 'check' : 'x'} text-[10px]`} />
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {/* Entry modules section header */}
                  <tr className="bg-[#e07010] text-white">
                    <td colSpan={ROLES.length + 1} className="px-4 py-[6px] text-[10px] font-bold uppercase tracking-[1px]">
                      Entry Sub-Modules
                    </td>
                  </tr>
                  {ENTRY_MODULES.map((mod, idx) => (
                    <tr key={mod.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'}>
                      <td className="px-4 py-[10px] text-muted border-b border-[#f0f0f0] sticky left-0 bg-inherit">
                        {mod.label}
                      </td>
                      {ROLES.map(role => {
                        const perm = permMatrix[role.value]?.[mod.id]
                        const enabled = perm?.can_access ?? false
                        return (
                          <td key={role.value} className="px-3 py-[10px] text-center border-b border-[#f0f0f0]">
                            <button
                              onClick={() => isAdmin && perm && handlePermToggle(perm)}
                              disabled={!isAdmin || !perm}
                              className={`w-5 h-5 rounded-md flex items-center justify-center mx-auto transition-all
                                ${enabled
                                  ? 'bg-kampgreen text-white'
                                  : 'bg-[#f1f5f9] text-[#cbd5e1]'
                                }
                                ${isAdmin && perm ? 'cursor-pointer hover:scale-110' : 'cursor-default opacity-60'}`}
                            >
                              <i className={`ph ph-${enabled ? 'check' : 'x'} text-[10px]`} />
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
