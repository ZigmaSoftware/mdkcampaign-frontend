import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { VoterRecord, VolunteerRecord } from '../../hooks/useEntryAPI'
import ViewRecordModal from '../../components/entry/ViewRecordModal'

// ── helpers ──────────────────────────────────────────────────────────
const SENTIMENT_LABEL: Record<string, string> = {
  positive: 'Favourable', neutral: 'Neutral', negative: 'Against',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Active', inactive: 'Inactive', on_leave: 'On Leave',
}

function voterFields(v: VoterRecord) {
  return [
    { label: 'Voter ID',     value: v.voter_id       || '' },
    { label: 'Name',         value: v.name            || '' },
    { label: 'Father Name',  value: v.father_name     || '' },
    { label: 'Phone',        value: v.phone           || '' },
    { label: 'Alt Phone',    value: v.phone2          || '' },
    { label: 'Age',          value: v.age != null ? String(v.age) : '' },
    { label: 'Gender',       value: v.gender          || '' },
    { label: 'Address',      value: v.address         || '' },
    { label: 'Pincode',      value: v.pincode         || '' },
    { label: 'Religion',     value: v.religion        || '' },
    { label: 'Caste',        value: v.caste           || '' },
    { label: 'Sentiment',    value: SENTIMENT_LABEL[v.sentiment || ''] || v.sentiment || '' },
    { label: 'Occupation',   value: v.occupation      || '' },
    { label: 'Notes',        value: v.notes           || '' },
  ].filter(f => f.value !== '')
}

function volunteerFields(v: VolunteerRecord) {
  return [
    { label: 'Voter ID',    value: v.voter_id       || '' },
    { label: 'Name',        value: v.name || v.user_name || '' },
    { label: 'Phone',       value: v.phone          || '' },
    { label: 'Alt Phone',   value: v.phone2         || '' },
    { label: 'Role',        value: v.role           || '' },
    { label: 'Designation', value: v.volunteer_type || '' },
    { label: 'Status',      value: STATUS_LABEL[v.status || ''] || v.status || '' },
    { label: 'Gender',      value: v.gender         || '' },
    { label: 'Age',         value: v.age != null ? String(v.age) : '' },
    { label: 'Source',      value: v.source         || '' },
    { label: 'Skills',      value: v.skills         || '' },
    { label: 'Joined Date', value: v.joined_date    || '' },
    { label: 'Notes',       value: v.notes          || '' },
  ].filter(f => f.value !== '')
}

// ── ResultRow ─────────────────────────────────────────────────────────
function ResultRow({
  index, iconCls, iconBg, iconColor, title, sub, onView,
}: {
  index:     number
  iconCls:   string
  iconBg:    string
  iconColor: string
  title:     string
  sub:       string
  onView:    () => void
}) {
  return (
    <div className="rec-item">
      <div className="font-inter text-[15px] font-bold text-navy min-w-[28px] text-center">{index}</div>
      <div
        className="w-8 h-8 rounded-[7px] flex items-center justify-center text-[14px] flex-shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        <i className={iconCls} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-textMain truncate">{title}</div>
        <div className="text-[9.5px] text-muted mt-[1px] truncate">{sub}</div>
      </div>
      <button
        onClick={onView}
        title="View details"
        className="w-[30px] h-[30px] rounded-md flex items-center justify-center bg-[#e8f4fd] text-[#0e6aad] text-[14px] hover:bg-[#0e6aad] hover:text-white transition-all flex-shrink-0"
      >
        <i className="ph ph-eye" />
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────
export default function GlobalSearch() {
  const api = useEntryAPI()

  const [query,      setQuery]      = useState('')
  const [voters,     setVoters]     = useState<VoterRecord[]>([])
  const [volunteers, setVolunteers] = useState<VolunteerRecord[]>([])
  const [voterCount, setVoterCount] = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [searched,   setSearched]   = useState(false)

  // View modal
  type ModalData = { title: string; subtitle?: string; fields: { label: string; value: string }[] }
  const [modal, setModal] = useState<ModalData | null>(null)

  const apiRef = useRef(api)
  apiRef.current = api

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setVoters([]); setVolunteers([]); setVoterCount(0); setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    Promise.all([
      apiRef.current.fetchVoters(undefined, q, 1, 50),
      apiRef.current.fetchVolunteers(undefined, q),
    ]).then(([vRes, volRes]) => {
      setVoters(vRes?.results ?? [])
      setVoterCount(vRes?.count ?? 0)
      setVolunteers(volRes?.results ?? [])
    }).finally(() => setLoading(false))
  }, [])

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 400)
    return () => clearTimeout(t)
  }, [query, runSearch])

  const total = voterCount + volunteers.length

  return (
    <div className="page-enter">
      {/* ── Search bar ─────────────────────────────────────────── */}
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-5">
        <div className="bg-navy px-6 py-4 flex items-center gap-3">
          <i className="ph ph-magnifying-glass text-saffron text-[20px]" />
          <div>
            <div className="text-white text-[14px] font-bold">Global Search</div>
            <div className="text-white/50 text-[10px]">Search across Voter Records &amp; Volunteer Records</div>
          </div>
          {searched && !loading && (
            <span className="ml-auto text-[11px] font-bold text-saffron bg-saffron/10 border border-saffron/30 px-3 py-1 rounded-full">
              {total.toLocaleString('en-IN')} result{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="px-6 py-4">
          <div className="relative">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[15px]" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, voter ID, phone, address..."
              className="form-input w-full pl-9 pr-9 py-[10px] text-[13px]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-body"
              >
                <i className="ph ph-x text-[13px]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading ────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted text-[12px] gap-2">
          <i className="ph ph-circle-notch animate-spin text-[18px]" /> Searching…
        </div>
      )}

      {/* ── Empty / idle ───────────────────────────────────────── */}
      {!loading && !searched && (
        <div className="text-center py-16 text-muted">
          <i className="ph ph-magnifying-glass text-[40px] mb-3 block opacity-30" />
          <p className="text-[12px]">Type to search across voter and volunteer records</p>
        </div>
      )}

      {!loading && searched && total === 0 && (
        <div className="text-center py-16 text-muted">
          <i className="ph ph-empty text-[40px] mb-3 block opacity-30" />
          <p className="text-[12px]">No records found for <strong>"{query}"</strong></p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid gap-5 md:grid-cols-2">

          {/* Voter Results */}
          {voters.length > 0 && (
            <div className="bg-surface rounded-card shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#fff8f0]">
                <div className="flex items-center gap-2">
                  <i className="ph ph-user text-[14px] text-[#e07010]" />
                  <span className="text-[12px] font-bold text-navy">Voter Records</span>
                </div>
                <span className="text-[10px] font-semibold text-muted bg-white border border-border rounded px-2 py-0.5">
                  {voters.length}{voterCount > voters.length ? ` of ${voterCount.toLocaleString('en-IN')}` : ''} record{voters.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="px-3 py-2">
                {voters.map((v, i) => {
                  const phones = [v.phone, v.phone2].filter(Boolean).join(' · ')
                  return (
                    <ResultRow
                      key={v.id}
                      index={i + 1}
                      iconCls="ph ph-user"
                      iconBg="#fff3e0"
                      iconColor="#e07010"
                      title={[v.voter_id, v.name, v.age ? `Age:${v.age}` : '', phones].filter(Boolean).join(' · ')}
                      sub={[v.address, v.pincode].filter(Boolean).join(' · ')}
                      onView={() => setModal({
                        title:    v.voter_id || v.name || '',
                        subtitle: v.name,
                        fields:   voterFields(v),
                      })}
                    />
                  )
                })}
                {voterCount > voters.length && (
                  <p className="text-[10px] text-muted text-center py-2 italic">
                    Showing first 50 of {voterCount.toLocaleString('en-IN')} — refine your search to narrow results
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Volunteer Results */}
          {volunteers.length > 0 && (
            <div className="bg-surface rounded-card shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#f0fdf4]">
                <div className="flex items-center gap-2">
                  <i className="ph ph-users-three text-[14px] text-[#166534]" />
                  <span className="text-[12px] font-bold text-navy">Volunteer Records</span>
                </div>
                <span className="text-[10px] font-semibold text-muted bg-white border border-border rounded px-2 py-0.5">
                  {volunteers.length} record{volunteers.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="px-3 py-2">
                {volunteers.map((v, i) => {
                  const name = v.name || v.user_name || v.username || `Volunteer #${v.id}`
                  return (
                    <ResultRow
                      key={v.id}
                      index={i + 1}
                      iconCls="ph ph-users-three"
                      iconBg="#dcfce7"
                      iconColor="#166534"
                      title={[v.voter_id, name, v.age ? `Age:${v.age}` : '', v.phone ? `Ph:${v.phone}` : ''].filter(Boolean).join(' · ')}
                      sub={[
                        v.role           ? `Role: ${v.role}`                 : '',
                        v.volunteer_type ? `Designation: ${v.volunteer_type}` : '',
                        STATUS_LABEL[v.status || ''] || v.status || '',
                      ].filter(Boolean).join(' · ')}
                      onView={() => setModal({
                        title:    name,
                        subtitle: [v.role, v.volunteer_type].filter(Boolean).join(' · ') || 'Volunteer',
                        fields:   volunteerFields(v),
                      })}
                    />
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Detail modal ───────────────────────────────────────── */}
      {modal && (
        <ViewRecordModal
          title={modal.title}
          subtitle={modal.subtitle}
          fields={modal.fields}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
