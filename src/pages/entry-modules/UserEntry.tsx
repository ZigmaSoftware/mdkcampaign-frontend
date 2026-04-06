import { useState, useEffect, useRef, useMemo } from 'react'
import apiClient from '../../utils/api'
import { useUserAPI } from '../../hooks/usePollAPI'
import type { UserRecord } from '../../hooks/usePollAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Booth, Union, Panchayat, VolunteerRole } from '../../hooks/useMasterAPI'
import { useAuthContext } from '../../context/AuthContext'
import { usePermissions } from '../../context/PermissionContext'
import EntryListHeader from '../../components/entry/EntryListHeader'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'

let _userBlocksCache: { id: number; name: string }[] | null = null
let _userBlocksFetch: Promise<{ id: number; name: string }[]> | null = null
function useBlocks() {
  const [blocks, setBlocks] = useState<{ id: number; name: string }[]>(_userBlocksCache ?? [])
  useEffect(() => {
    if (_userBlocksCache) { setBlocks(_userBlocksCache); return }
    if (!_userBlocksFetch) {
      _userBlocksFetch = apiClient.get('/masters/areas/', { params: { limit: 200 } })
        .then(r => { _userBlocksCache = r.data.results ?? []; return _userBlocksCache! })
        .catch(() => { _userBlocksFetch = null; return [] })
    }
    _userBlocksFetch.then(d => setBlocks(d))
  }, [])
  return blocks
}

const SYSTEM_ROLES = [
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
  admin:            { bg: '#fee2e2', color: '#991b1b' },
  district_head:    { bg: '#ffedd5', color: '#9a3412' },
  constituency_mgr: { bg: '#fef3c7', color: '#92400e' },
  booth_agent:      { bg: '#dcfce7', color: '#166534' },
  volunteer:        { bg: '#dbeafe', color: '#1d4ed8' },
  voter:            { bg: '#e0e7ff', color: '#3730a3' },
  analyst:          { bg: '#ede9fe', color: '#6d28d9' },
  observer:         { bg: '#f1f5f9', color: '#475569' },
}


export default function UserEntryPage() {
  const { user: currentUser } = useAuthContext()
  const {
    fetchUsers, createUser, updateUser, deactivateUser,
    loading,
  } = useUserAPI()
  const masterApi = useMasterAPI()
  const { canAdd, canEdit, canDelete } = usePermissions()
  const canAddUser = canAdd('user') || canAdd('user-mgmt')
  const canEditUser = canEdit('user') || canEdit('user-mgmt')
  const canDeleteUser = canDelete('user') || canDelete('user-mgmt')

  const PAGE_SIZE = 10

  const blocks = useBlocks()
  const [booths,     setBooths]     = useState<Booth[]>([])
  const [unions,     setUnions]     = useState<Union[]>([])
  const [panchayats, setPanchayats] = useState<Panchayat[]>([])
  const [volunteerRoles, setVolunteerRoles] = useState<VolunteerRole[]>([])

  const [users, setUsers] = useState<UserRecord[]>([])
  const [search, setSearch] = useState('')
  const [filterRole,      setFilterRole]      = useState('')
  const [blockFilter,     setBlockFilter]     = useState('')
  const [unionFilter,     setUnionFilter]     = useState('')
  const [panchayatFilter, setPanchayatFilter] = useState('')
  const [boothFilter,     setBoothFilter]     = useState<number | ''>('')
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
    masterApi.fetchBooths().then(d => d && setBooths(d))
    masterApi.fetchUnions().then(d => d && setUnions(d))
    masterApi.fetchPanchayats().then(d => d && setPanchayats(d))
    masterApi.fetchVolunteerRoles().then(d => d && setVolunteerRoles(d))
  }, [])

  useEffect(() => {
    if (isFormOpen && pendingFill.current) {
      const u = pendingFill.current
      if (r.firstName.current)    r.firstName.current.value    = u.first_name ?? ''
      if (r.lastName.current)     r.lastName.current.value     = u.last_name  ?? ''
      if (r.username.current)     r.username.current.value     = u.username   ?? ''
      if (r.email.current)        r.email.current.value        = u.email      ?? ''
      if (r.phone.current)        r.phone.current.value        = u.phone      ?? ''
      if (r.role.current)         r.role.current.value         = u.volunteer_role ? String(u.volunteer_role) : ''
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
    const volunteerRoleValue = r.role.current?.value ?? ''
    const volunteerRole = volunteerRoleValue ? Number(volunteerRoleValue) : null

    if (!firstName || !username || !volunteerRole) {
      setApiError('First name, username, and volunteer role are required.')
      return
    }

    if (editingId !== null) {
      const payload: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        role: 'volunteer',
        volunteer_role: volunteerRole,
      }
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
        first_name: firstName, last_name: lastName, username, email, phone,
        role: 'volunteer',
        volunteer_role: volunteerRole,
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

  // Booth dropdown narrows by selected Panchayat; Block/Union/Panchayat are independent
  const filteredBooths = useMemo(() => {
    if (!panchayatFilter) return booths
    const panchayatId = panchayats.find(p => p.name === panchayatFilter)?.id
    return panchayatId ? booths.filter(b => b.panchayat === panchayatId) : booths
  }, [booths, panchayats, panchayatFilter])

  // Build valid booth-name sets for each location filter to match against u.booth_name
  const validBoothNamesForFilters = useMemo(() => {
    if (!blockFilter && !unionFilter && !panchayatFilter && !boothFilter) return null
    let filteredPanchayatIds: Set<number> | null = null
    if (panchayatFilter) {
      const id = panchayats.find(p => p.name === panchayatFilter)?.id
      filteredPanchayatIds = id ? new Set([id]) : new Set()
    } else if (unionFilter) {
      const unionId = unions.find(u => u.name === unionFilter)?.id
      filteredPanchayatIds = unionId
        ? new Set(panchayats.filter(p => p.union === unionId).map(p => p.id))
        : new Set()
    } else if (blockFilter) {
      const blockId = blocks.find(b => b.name === blockFilter)?.id
      const blockUnionIds = blockId ? new Set(unions.filter(u => u.block === blockId).map(u => u.id)) : null
      filteredPanchayatIds = blockUnionIds
        ? new Set(panchayats.filter(p => p.union != null && blockUnionIds.has(p.union)).map(p => p.id))
        : new Set()
    }
    if (boothFilter) {
      const booth = booths.find(b => b.id === boothFilter)
      return booth ? new Set([booth.name]) : new Set<string>()
    }
    if (filteredPanchayatIds) {
      return new Set(booths.filter(b => b.panchayat != null && filteredPanchayatIds!.has(b.panchayat)).map(b => b.name))
    }
    return null
  }, [blocks, unions, panchayats, booths, blockFilter, unionFilter, panchayatFilter, boothFilter])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.volunteer_role_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
    const matchRole     = !filterRole || u.volunteer_role_name === filterRole
    const matchLocation = !validBoothNamesForFilters || (!!u.booth_name && validBoothNamesForFilters.has(u.booth_name))
    return matchSearch && matchRole && matchLocation
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="page-enter">
      <>
          <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
            <EntryListHeader
              title="Users" icon="ph ph-user-gear" count={users.length}
              onAddNew={canAddUser ? () => { setEditingId(null); clear(); setFormOpen(true) } : undefined}
              addLabel="Add User"
            />
            <div className="px-[18px] py-[14px]">
              <EntrySearchToolbar
                placeholder="Search users..."
                value={search} onChange={e => { setSearch(e); setPage(1) }}
                onExport={() => {}} onPrint={() => {}}
              />
              {/* Role filter */}
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-1">
                <span className="text-[10px] font-bold text-muted uppercase tracking-[0.6px]">Filter:</span>
                <select
                  value={filterRole}
                  onChange={e => { setFilterRole(e.target.value); setPage(1) }}
                  className={`form-input text-[11px] py-[4px] pr-7 min-w-[140px] w-auto ${filterRole ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
                >
                  <option value="">All Volunteer Roles</option>
                  {volunteerRoles.map(volunteerRole => (
                    <option key={volunteerRole.id} value={volunteerRole.name}>{volunteerRole.name}</option>
                  ))}
                </select>
              </div>

              {/* Location filters: Block / Union / Panchayat / Booth — independent */}
              <div className="flex items-center gap-2 mb-2 mt-1 flex-wrap pb-3 border-b border-border">
                <i className="ph ph-map-pin text-saffron text-[13px]" />

                <select
                  value={blockFilter}
                  onChange={e => { setBlockFilter(e.target.value); setPage(1) }}
                  className={`form-input text-[11px] py-[4px] pr-7 min-w-[130px] w-auto ${blockFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
                >
                  <option value="">All Block</option>
                  {blocks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>

                <select
                  value={unionFilter}
                  onChange={e => { setUnionFilter(e.target.value); setPage(1) }}
                  className={`form-input text-[11px] py-[4px] pr-7 min-w-[150px] w-auto ${unionFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
                >
                  <option value="">All Union</option>
                  {unions.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>

                <select
                  value={panchayatFilter}
                  onChange={e => { setPanchayatFilter(e.target.value); setBoothFilter(''); setPage(1) }}
                  className={`form-input text-[11px] py-[4px] pr-7 min-w-[150px] w-auto ${panchayatFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
                >
                  <option value="">All Panchayat</option>
                  {panchayats.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>

                <select
                  value={boothFilter}
                  onChange={e => { setBoothFilter(e.target.value ? Number(e.target.value) : ''); setPage(1) }}
                  className={`form-input text-[11px] py-[4px] pr-7 min-w-[180px] w-auto ${boothFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
                >
                  <option value="">All Booths</option>
                  {filteredBooths.map(b => <option key={b.id} value={b.id}>{b.number} — {b.name}</option>)}
                </select>

                {(filterRole || blockFilter || unionFilter || panchayatFilter || boothFilter) && (
                  <button onClick={() => { setFilterRole(''); setBlockFilter(''); setUnionFilter(''); setPanchayatFilter(''); setBoothFilter(''); setPage(1) }}
                    className="text-[10px] font-bold text-kampr flex items-center gap-1">
                    <i className="ph ph-x-circle" /> Clear Filters
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
                    const systemRole = SYSTEM_ROLES.find(r => r.value === u.role)
                    const roleLabel = u.volunteer_role_name || systemRole?.label || u.role_display
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
                                {roleLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted">@{u.username}{u.phone ? ` · ${u.phone}` : ''}{u.email ? ` · ${u.email}` : ''}</p>
                          </div>
                        </div>
                        {(canEditUser || canDeleteUser) && (
                          <div className="flex gap-2">
                            {canEditUser && (
                              <button onClick={() => handleEdit(u.id)} className="p-[7px] rounded-lg hover:bg-[#f0f4ff] text-navy transition-colors">
                                <i className="ph ph-pencil text-[14px]" />
                              </button>
                            )}
                            {canDeleteUser && (
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
                            )}
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
              <FormGroup label="Volunteer Role" required>
                <select ref={r.role} className={selectCls}>
                  <option value="">Select volunteer role</option>
                  {volunteerRoles.map(volunteerRole => (
                    <option key={volunteerRole.id} value={volunteerRole.id}>{volunteerRole.name}</option>
                  ))}
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
      </>
    </div>
  )
}
