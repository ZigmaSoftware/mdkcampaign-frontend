import React, { useEffect, useState, useCallback, useRef } from 'react'
import apiClient from '../../utils/api'
import { useToast } from '../../context/ToastContext'

// ── Types ──────────────────────────────────────────────────────────────────────
interface ScreenPerm {
  id: number
  role: string
  user_screen: number
  user_screen_slug: string
  user_screen_name: string
  main_screen_slug: string
  main_screen_name: string
  can_view: boolean
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
}

interface MainScreenOption {
  id: number
  name: string
  slug: string
  screens: { id: number; name: string; slug: string }[]
}

// ── Constants ──────────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'admin',            label: 'Admin' },
  { value: 'volunteer',        label: 'Volunteer' },
  { value: 'member',           label: 'Member' },
  { value: 'district_head',    label: 'District Head' },
  { value: 'constituency_mgr', label: 'Constituency Mgr' },
  { value: 'booth_agent',      label: 'Booth Agent' },
  { value: 'voter',            label: 'Voter' },
  { value: 'analyst',          label: 'Analyst' },
  { value: 'observer',         label: 'Observer' },
]

const ACTION_COLS = [
  { key: 'can_view',   label: 'View'   },
  { key: 'can_add',    label: 'Add'    },
  { key: 'can_edit',   label: 'Edit'   },
  { key: 'can_delete', label: 'Delete' },
] as const

type ActionKey = typeof ACTION_COLS[number]['key']

// ── Checkbox component ─────────────────────────────────────────────────────────
function Checkbox({
  checked, disabled, onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={e => onChange(e.target.checked)}
      className={`
        w-[15px] h-[15px] rounded-[3px] border-2 cursor-pointer accent-navy
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    />
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PermissionsPage() {
  const { showToast } = useToast()

  const [role,        setRole]        = useState('volunteer')
  const [mainScreens, setMainScreens] = useState<MainScreenOption[]>([])
  const [selectedMs,  setSelectedMs]  = useState<string>('')
  const [perms,       setPerms]       = useState<ScreenPerm[]>([])
  // local edits before save: permId → partial overrides
  const [edits,       setEdits]       = useState<Record<number, Partial<ScreenPerm>>>({})
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [seeding,     setSeeding]     = useState(false)

  const isDirty = Object.keys(edits).length > 0

  // ── Load main screens once ─────────────────────────────────────────────────
  useEffect(() => {
    apiClient.get('/auth/main-screens/')
      .then(r => {
        const list: MainScreenOption[] = r.data.results ?? r.data
        setMainScreens(list)
        if (list.length > 0 && !selectedMs) setSelectedMs(list[0].slug)
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load permissions for role ──────────────────────────────────────────────
  const loadPerms = useCallback((r: string) => {
    setLoading(true)
    setEdits({})
    apiClient.get('/auth/screen-permissions/', { params: { role: r } })
      .then(res => setPerms(res.data.results ?? res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadPerms(role) }, [role, loadPerms])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const effectivePerm = (p: ScreenPerm): ScreenPerm => ({ ...p, ...(edits[p.id] ?? {}) })

  const screenPermsForMs = perms.filter(p => p.main_screen_slug === selectedMs)

  const isAdmin = role === 'admin'

  // ── Single checkbox change ─────────────────────────────────────────────────
  const handleCheck = (permId: number, key: ActionKey, value: boolean) => {
    setEdits(prev => ({
      ...prev,
      [permId]: { ...(prev[permId] ?? {}), [key]: value },
    }))
  }

  // ── "All" checkbox for a row (all four actions) ────────────────────────────
  const handleAll = (p: ScreenPerm, value: boolean) => {
    setEdits(prev => ({
      ...prev,
      [p.id]: { can_view: value, can_add: value, can_edit: value, can_delete: value },
    }))
  }

  // ── Column header "select all" ─────────────────────────────────────────────
  const handleColAll = (key: ActionKey, value: boolean) => {
    const next: Record<number, Partial<ScreenPerm>> = { ...edits }
    screenPermsForMs.forEach(p => {
      next[p.id] = { ...(next[p.id] ?? {}), [key]: value }
    })
    setEdits(next)
  }

  // ── Row "all" checkbox state ───────────────────────────────────────────────
  const rowAllChecked = (p: ScreenPerm) => {
    const e = effectivePerm(p)
    return e.can_view && e.can_add && e.can_edit && e.can_delete
  }
  const rowAllIndeterminate = (p: ScreenPerm) => {
    const e = effectivePerm(p)
    const vals = [e.can_view, e.can_add, e.can_edit, e.can_delete]
    return vals.some(Boolean) && !vals.every(Boolean)
  }

  // ── Column "all" state ─────────────────────────────────────────────────────
  const colAllChecked = (key: ActionKey) =>
    screenPermsForMs.length > 0 && screenPermsForMs.every(p => effectivePerm(p)[key])
  const colAllIndeterminate = (key: ActionKey) => {
    const vals = screenPermsForMs.map(p => effectivePerm(p)[key])
    return vals.some(Boolean) && !vals.every(Boolean)
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)
    try {
      await Promise.all(
        Object.entries(edits).map(([id, patch]) =>
          apiClient.patch(`/auth/screen-permissions/${id}/`, patch)
        )
      )
      showToast('<i class="ph ph-check-circle"></i> Permissions saved.', '#138808')
      loadPerms(role)
    } catch {
      showToast('<i class="ph ph-x-circle"></i> Failed to save permissions.', '#dc2626')
    } finally {
      setSaving(false)
    }
  }

  // ── Seed defaults ──────────────────────────────────────────────────────────
  const handleSeedDefaults = async () => {
    if (!window.confirm('Reset ALL screen permissions to system defaults?')) return
    setSeeding(true)
    try {
      await apiClient.post('/auth/screen-permissions/seed/')
      showToast('<i class="ph ph-check-circle"></i> Default permissions applied.', '#138808')
      loadPerms(role)
    } catch {
      showToast('<i class="ph ph-x-circle"></i> Failed to seed defaults.', '#dc2626')
    } finally {
      setSeeding(false)
    }
  }

  // ── IndeterminateCheckbox (for header row "All" per column) ────────────────
  const IndeterminateCheckbox = ({
    checked, indeterminate, disabled, onChange,
  }: {
    checked: boolean
    indeterminate: boolean
    disabled?: boolean
    onChange: (v: boolean) => void
  }) => {
    const ref = useRef<HTMLInputElement>(null)
    useEffect(() => {
      if (ref.current) ref.current.indeterminate = indeterminate
    }, [indeterminate])
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        className={`w-[15px] h-[15px] rounded-[3px] border-2 cursor-pointer accent-navy ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      />
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-navy">
          <div className="flex items-center gap-3">
            <i className="ph ph-shield-check text-saffron text-[22px]" />
            <div>
              <div className="text-white font-bold text-[15px]">User Permissions</div>
              <div className="text-white/50 text-[11px]">Set View · Add · Edit · Delete per screen per role</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-[11px] text-orange-300 font-semibold px-2 py-0.5 bg-orange-500/20 rounded-md border border-orange-400/30">
                Not Saved
              </span>
            )}
            <button
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-lg transition-all border border-white/20 disabled:opacity-50"
            >
              <i className="ph ph-arrow-counter-clockwise text-[13px]" />
              {seeding ? 'Resetting…' : 'Reset Defaults'}
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-saffron hover:bg-saffron/90 text-navy text-[11px] font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ph ph-floppy-disk text-[13px]" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* ── Role selector ── */}
        <div className="px-5 py-3 border-b border-border bg-[#f8fafc]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest mr-1">Role</span>
            {ROLES.map(r => (
              <button
                key={r.value}
                onClick={() => { setRole(r.value); setEdits({}) }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  role === r.value
                    ? 'bg-navy text-white border-navy shadow-sm'
                    : 'bg-white text-navy border-border hover:border-saffron hover:text-saffron'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main screen selector ── */}
        {mainScreens.length > 0 && (
          <div className="px-5 py-3 border-b border-border bg-white flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest mr-1">Main Screen</span>
            {mainScreens.map(ms => (
              <button
                key={ms.slug}
                onClick={() => setSelectedMs(ms.slug)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  selectedMs === ms.slug
                    ? 'bg-saffron text-navy border-saffron/60 shadow-sm'
                    : 'bg-white text-muted border-border hover:border-saffron hover:text-navy'
                }`}
              >
                {ms.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Permissions table ── */}
        <div className="px-5 py-4">
          {isAdmin && (
            <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-saffron/10 border border-saffron/30 rounded-xl text-[12px] text-navy font-medium">
              <i className="ph ph-shield-star text-saffron text-[16px]" />
              Admin has full access to all screens. Permissions cannot be restricted.
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted text-[13px] gap-2">
              <i className="ph ph-circle-notch animate-spin text-[18px]" />
              Loading permissions…
            </div>
          ) : screenPermsForMs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted">
              <i className="ph ph-shield-slash text-[32px]" />
              <span className="text-[13px]">No screens found for this main screen</span>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#f1f5f9] border-b border-border">
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-navy uppercase tracking-wide w-full">
                      Sub Screen
                    </th>
                    {/* All column header */}
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-navy uppercase tracking-wide whitespace-nowrap">
                      All
                    </th>
                    {ACTION_COLS.map(col => (
                      <th key={col.key} className="px-4 py-3 text-center text-[11px] font-bold text-navy uppercase tracking-wide whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1.5">
                          <span>{col.label}</span>
                          <IndeterminateCheckbox
                            checked={colAllChecked(col.key)}
                            indeterminate={colAllIndeterminate(col.key)}
                            disabled={isAdmin}
                            onChange={v => handleColAll(col.key, v)}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {screenPermsForMs.map((p, idx) => {
                    const ep = effectivePerm(p)
                    const hasAny = ep.can_view || ep.can_add || ep.can_edit || ep.can_delete
                    const isModified = !!edits[p.id]
                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          hasAny
                            ? 'bg-green-50 hover:bg-green-100/60'
                            : idx % 2 === 0 ? 'bg-white hover:bg-[#f8fafc]' : 'bg-[#fafbfc] hover:bg-[#f4f6f8]'
                        }`}
                      >
                        {/* Screen name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${hasAny ? 'text-navy' : 'text-muted'}`}>
                              {p.user_screen_name}
                            </span>
                            {isModified && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-600 border border-orange-200 rounded font-bold">
                                MODIFIED
                              </span>
                            )}
                          </div>
                        </td>

                        {/* All checkbox */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <IndeterminateCheckbox
                              checked={rowAllChecked(p)}
                              indeterminate={rowAllIndeterminate(p)}
                              disabled={isAdmin}
                              onChange={v => handleAll(p, v)}
                            />
                          </div>
                        </td>

                        {/* View / Add / Edit / Delete */}
                        {ACTION_COLS.map(col => (
                          <td key={col.key} className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={ep[col.key]}
                                disabled={isAdmin}
                                onChange={v => handleCheck(p.id, col.key, v)}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer summary ── */}
        {!loading && screenPermsForMs.length > 0 && (
          <div className="px-5 pb-4 flex items-center gap-4 text-[11px] text-muted flex-wrap">
            <span>
              <span className="font-bold text-kampgreen">
                {screenPermsForMs.filter(p => effectivePerm(p).can_view).length}
              </span>
              /{screenPermsForMs.length} screens viewable
            </span>
            <span>
              <span className="font-bold text-navy">
                {screenPermsForMs.filter(p => effectivePerm(p).can_add).length}
              </span>
              &nbsp;can add
            </span>
            <span>
              <span className="font-bold text-navy">
                {screenPermsForMs.filter(p => effectivePerm(p).can_edit).length}
              </span>
              &nbsp;can edit
            </span>
            <span>
              <span className="font-bold text-red-500">
                {screenPermsForMs.filter(p => effectivePerm(p).can_delete).length}
              </span>
              &nbsp;can delete
            </span>
            {isDirty && (
              <span className="ml-auto text-orange-500 font-semibold">
                {Object.keys(edits).length} unsaved change{Object.keys(edits).length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
